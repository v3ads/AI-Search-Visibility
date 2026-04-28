/**
 * Migration script: upgrades the database from the old single-user schema
 * to the new multi-tenant org-based schema.
 *
 * This is idempotent — safe to run multiple times.
 * It handles the full schema transformation without drizzle-kit push.
 */
import pg from "pg";

async function migrate() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log("Starting database migration...");

    // ── 0. Check what columns the users table currently has ────────────────
    const { rows: userCols } = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users' AND table_schema = 'public'
    `);
    const userColNames = userCols.map((r: any) => r.column_name);
    console.log("Current users columns:", userColNames.join(", "));

    // ── 1. Handle users table transformation ───────────────────────────────
    // Old schema: id (serial), username (text), password (text)
    // New schema: id (serial), email (text), password_hash (text), name (text), ...

    // Add email column if missing
    if (!userColNames.includes("email")) {
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT`);
      console.log("✓ Added users.email column");
    }

    // Add password_hash column if missing
    if (!userColNames.includes("password_hash")) {
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`);
      console.log("✓ Added users.password_hash column");
    }

    // Add name column if missing
    if (!userColNames.includes("name")) {
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT`);
      console.log("✓ Added users.name column");
    }

    // Add avatar_url column if missing
    if (!userColNames.includes("avatar_url")) {
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT`);
      console.log("✓ Added users.avatar_url column");
    }

    // Add email_verified column if missing
    if (!userColNames.includes("email_verified")) {
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false`);
      console.log("✓ Added users.email_verified column");
    }

    // Add created_at column if missing
    if (!userColNames.includes("created_at")) {
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW()`);
      console.log("✓ Added users.created_at column");
    }

    // Add last_login_at column if missing
    if (!userColNames.includes("last_login_at")) {
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP`);
      console.log("✓ Added users.last_login_at column");
    }

    // Migrate data from old columns to new ones if old columns exist
    if (userColNames.includes("username") && userColNames.includes("password")) {
      // Copy username -> email (as placeholder) where email is null
      await pool.query(`
        UPDATE users SET email = username || '@placeholder.local' 
        WHERE email IS NULL AND username IS NOT NULL
      `);
      console.log("✓ Migrated username -> email");

      // Copy password -> password_hash where password_hash is null
      await pool.query(`
        UPDATE users SET password_hash = password 
        WHERE password_hash IS NULL AND password IS NOT NULL
      `);
      console.log("✓ Migrated password -> password_hash");

      // Copy username -> name where name is null
      await pool.query(`
        UPDATE users SET name = username 
        WHERE name IS NULL AND username IS NOT NULL
      `);
      console.log("✓ Migrated username -> name");
    }

    // Set placeholder email for any users still missing it
    await pool.query(`
      UPDATE users SET email = 'user' || id::text || '@placeholder.local' 
      WHERE email IS NULL
    `);

    // Set placeholder password_hash for any users still missing it
    await pool.query(`
      UPDATE users SET password_hash = '' 
      WHERE password_hash IS NULL
    `);

    // Now make email and password_hash NOT NULL if they aren't already
    // Check if they have NOT NULL constraint
    const { rows: notNullCols } = await pool.query(`
      SELECT column_name, is_nullable FROM information_schema.columns 
      WHERE table_name = 'users' AND table_schema = 'public'
      AND column_name IN ('email', 'password_hash')
    `);
    
    for (const col of notNullCols) {
      if (col.is_nullable === 'YES') {
        await pool.query(`ALTER TABLE users ALTER COLUMN ${col.column_name} SET NOT NULL`);
        console.log(`✓ Set users.${col.column_name} NOT NULL`);
      }
    }

    // Add unique constraint on email if not exists
    const { rows: emailConstraints } = await pool.query(`
      SELECT constraint_name FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
      WHERE tc.table_name = 'users' AND ccu.column_name = 'email' AND tc.constraint_type = 'UNIQUE'
    `);
    if (emailConstraints.length === 0) {
      // First ensure no duplicate emails
      await pool.query(`
        UPDATE users u1 SET email = email || '_' || id::text
        WHERE id NOT IN (
          SELECT MIN(id) FROM users GROUP BY email
        )
      `);
      await pool.query(`ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email)`);
      console.log("✓ Added unique constraint on users.email");
    }

    // ── 2. Create organizations table ──────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id VARCHAR(32) PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        plan TEXT NOT NULL DEFAULT 'free',
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        stripe_price_id TEXT,
        subscription_status TEXT DEFAULT 'active',
        subscription_current_period_end TIMESTAMP,
        max_projects INTEGER NOT NULL DEFAULT 1,
        max_competitors INTEGER NOT NULL DEFAULT 3,
        max_prompts INTEGER NOT NULL DEFAULT 10,
        max_scans_per_month INTEGER NOT NULL DEFAULT 1,
        scans_this_month INTEGER NOT NULL DEFAULT 0,
        scans_reset_at TIMESTAMP NOT NULL DEFAULT NOW(),
        has_api_access BOOLEAN NOT NULL DEFAULT false,
        has_white_label BOOLEAN NOT NULL DEFAULT false,
        has_scheduled_scans BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log("✓ organizations table created/exists");

    // ── 3. Create org_members table ────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS org_members (
        id SERIAL PRIMARY KEY,
        org_id VARCHAR NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'member',
        joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(org_id, user_id)
      );
    `);
    console.log("✓ org_members table created/exists");

    // ── 4. Create invitations table ────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invitations (
        id SERIAL PRIMARY KEY,
        org_id VARCHAR NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'member',
        token TEXT NOT NULL UNIQUE,
        invited_by INTEGER NOT NULL REFERENCES users(id),
        accepted_at TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log("✓ invitations table created/exists");

    // ── 5. Create password_reset_tokens table ──────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        used_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log("✓ password_reset_tokens table created/exists");

    // ── 6. Create api_keys table ───────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id SERIAL PRIMARY KEY,
        org_id VARCHAR NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        key_hash TEXT NOT NULL UNIQUE,
        key_prefix TEXT NOT NULL,
        last_used_at TIMESTAMP,
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log("✓ api_keys table created/exists");

    // ── 7. Check and update projects table ─────────────────────────────────
    const { rows: projCols } = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'projects' AND table_schema = 'public'
    `);
    const projColNames = projCols.map((r: any) => r.column_name);
    console.log("Current projects columns:", projColNames.join(", "));

    if (!projColNames.includes("org_id")) {
      await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS org_id VARCHAR REFERENCES organizations(id) ON DELETE CASCADE`);
      console.log("✓ Added projects.org_id column");
    }

    // ── 8. Create scan_schedules table ─────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scan_schedules (
        id SERIAL PRIMARY KEY,
        project_id VARCHAR NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        frequency TEXT NOT NULL DEFAULT 'weekly',
        day_of_week INTEGER DEFAULT 1,
        hour INTEGER DEFAULT 8,
        is_active BOOLEAN NOT NULL DEFAULT true,
        last_run_at TIMESTAMP,
        next_run_at TIMESTAMP,
        email_report BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log("✓ scan_schedules table created/exists");

    // ── 9. Create tags table if missing ────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        project_id VARCHAR NOT NULL,
        name TEXT NOT NULL,
        color TEXT DEFAULT '#22c55e'
      );
    `);
    console.log("✓ tags table created/exists");

    // ── 10. Migrate existing users to orgs ─────────────────────────────────
    const { rows: existingUsers } = await pool.query(`SELECT id, email, name FROM users LIMIT 100`);

    for (const user of existingUsers) {
      // Check if user already has an org
      const { rows: existingMemberships } = await pool.query(
        `SELECT o.id FROM organizations o 
         JOIN org_members om ON om.org_id = o.id 
         WHERE om.user_id = $1 LIMIT 1`,
        [user.id]
      );

      if (existingMemberships.length === 0) {
        const orgId = `org_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        const displayName = user.name || user.email?.split('@')[0] || `user${user.id}`;
        const baseSlug = displayName.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;

        await pool.query(
          `INSERT INTO organizations (id, name, slug, plan, max_projects, max_competitors, max_prompts, max_scans_per_month)
           VALUES ($1, $2, $3, 'free', 1, 3, 10, 1)`,
          [orgId, `${displayName}'s Organization`, slug]
        );

        await pool.query(
          `INSERT INTO org_members (org_id, user_id, role)
           VALUES ($1, $2, 'owner')`,
          [orgId, user.id]
        );

        // Assign all existing projects to this org
        await pool.query(
          `UPDATE projects SET org_id = $1 WHERE org_id IS NULL`,
          [orgId]
        );

        console.log(`✓ Migrated user ${user.email} to org ${orgId}`);
      }
    }

    // ── 11. Handle scan_results table if it exists ─────────────────────────
    const { rows: scanResultsCols } = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'scan_results' AND table_schema = 'public'
    `);
    if (scanResultsCols.length > 0) {
      console.log("✓ scan_results table exists");
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
