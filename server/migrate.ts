/**
 * Migration script: upgrades the database from the old single-user schema
 * to the new multi-tenant org-based schema.
 *
 * This is idempotent — safe to run multiple times.
 */
import pg from "pg";

async function migrate() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log("Starting database migration...");

    // ── 1. Add new columns to users table ──────────────────────────────────
    await pool.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS email TEXT,
        ADD COLUMN IF NOT EXISTS name TEXT,
        ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user',
        ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT,
        ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP,
        ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW();
    `);
    console.log("✓ users table updated");

    // ── 2. Create organizations table ──────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        plan TEXT NOT NULL DEFAULT 'free',
        "stripeCustomerId" TEXT,
        "stripeSubscriptionId" TEXT,
        "stripePriceId" TEXT,
        "stripeCurrentPeriodEnd" TIMESTAMP,
        "maxProjects" INTEGER NOT NULL DEFAULT 1,
        "maxCompetitors" INTEGER NOT NULL DEFAULT 3,
        "maxPrompts" INTEGER NOT NULL DEFAULT 10,
        "maxScansPerMonth" INTEGER NOT NULL DEFAULT 1,
        "scansThisMonth" INTEGER NOT NULL DEFAULT 0,
        "scansResetAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log("✓ organizations table created");

    // ── 3. Create org_members table ────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS org_members (
        id TEXT PRIMARY KEY,
        "orgId" TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'member',
        "joinedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE("orgId", "userId")
      );
    `);
    console.log("✓ org_members table created");

    // ── 4. Create invitations table ────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invitations (
        id TEXT PRIMARY KEY,
        "orgId" TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'member',
        token TEXT NOT NULL UNIQUE,
        "invitedBy" TEXT NOT NULL REFERENCES users(id),
        "expiresAt" TIMESTAMP NOT NULL,
        "acceptedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log("✓ invitations table created");

    // ── 5. Create password_reset_tokens table ──────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        "expiresAt" TIMESTAMP NOT NULL,
        "usedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log("✓ password_reset_tokens table created");

    // ── 6. Create api_keys table ───────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id TEXT PRIMARY KEY,
        "orgId" TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        "userId" TEXT NOT NULL REFERENCES users(id),
        name TEXT NOT NULL,
        "keyHash" TEXT NOT NULL UNIQUE,
        "keyPrefix" TEXT NOT NULL,
        "lastUsedAt" TIMESTAMP,
        "expiresAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log("✓ api_keys table created");

    // ── 7. Create scan_schedules table ─────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scan_schedules (
        id TEXT PRIMARY KEY,
        "projectId" TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        "orgId" TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        frequency TEXT NOT NULL DEFAULT 'weekly',
        "dayOfWeek" INTEGER,
        "hourOfDay" INTEGER NOT NULL DEFAULT 9,
        enabled BOOLEAN NOT NULL DEFAULT true,
        "lastRunAt" TIMESTAMP,
        "nextRunAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log("✓ scan_schedules table created");

    // ── 8. Add orgId column to projects table ──────────────────────────────
    await pool.query(`
      ALTER TABLE projects
        ADD COLUMN IF NOT EXISTS "orgId" TEXT REFERENCES organizations(id) ON DELETE CASCADE;
    `);
    console.log("✓ projects.orgId column added");

    // ── 9. Set placeholder emails for existing users ───────────────────────
    await pool.query(`
      UPDATE users SET email = username || '@placeholder.local' 
      WHERE email IS NULL
    `);
    console.log("✓ Set placeholder emails for existing users");

    // ── 10. Migrate existing users to orgs ─────────────────────────────────
    const { rows: existingUsers } = await pool.query(`SELECT id, username FROM users LIMIT 100`);

    for (const user of existingUsers) {
      // Check if user already has an org
      const { rows: existingMemberships } = await pool.query(
        `SELECT o.id FROM organizations o 
         JOIN org_members om ON om."orgId" = o.id 
         WHERE om."userId" = $1 LIMIT 1`,
        [user.id]
      );

      if (existingMemberships.length === 0) {
        const orgId = `org_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        const baseSlug = user.username.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;

        await pool.query(
          `INSERT INTO organizations (id, name, slug, plan, "maxProjects", "maxCompetitors", "maxPrompts", "maxScansPerMonth")
           VALUES ($1, $2, $3, 'free', 1, 3, 10, 1)`,
          [orgId, `${user.username}'s Organization`, slug]
        );

        await pool.query(
          `INSERT INTO org_members (id, "orgId", "userId", role)
           VALUES ($1, $2, $3, 'owner')`,
          [`om_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`, orgId, user.id]
        );

        // Assign all existing projects to this org
        await pool.query(
          `UPDATE projects SET "orgId" = $1 WHERE "userId" = $2 AND "orgId" IS NULL`,
          [orgId, user.id]
        );

        console.log(`✓ Migrated user ${user.username} to org ${orgId}`);
      }
    }

    console.log("\n✅ Migration completed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
