/**
 * Migration script: upgrades the database from the old single-user schema
 * to the new multi-tenant org-based schema.
 *
 * This is idempotent — safe to run multiple times.
 * It handles the full schema transformation without drizzle-kit push.
 */
import pg from "pg";

async function getTableColumns(pool: pg.Pool, tableName: string): Promise<string[]> {
  const { rows } = await pool.query(
    `SELECT column_name FROM information_schema.columns 
     WHERE table_name = $1 AND table_schema = 'public'`,
    [tableName]
  );
  return rows.map((r: any) => r.column_name);
}

async function renameColumnIfExists(pool: pg.Pool, table: string, from: string, to: string): Promise<void> {
  const cols = await getTableColumns(pool, table);
  if (cols.includes(from) && !cols.includes(to)) {
    await pool.query(`ALTER TABLE ${table} RENAME COLUMN "${from}" TO ${to}`);
    console.log(`✓ Renamed ${table}.${from} -> ${to}`);
  }
}

async function addColumnIfMissing(pool: pg.Pool, table: string, column: string, definition: string): Promise<void> {
  const cols = await getTableColumns(pool, table);
  if (!cols.includes(column)) {
    await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${definition}`);
    console.log(`✓ Added ${table}.${column}`);
  }
}

async function migrate() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log("Starting database migration...");

    // ── 1. Handle users table transformation ───────────────────────────────
    const userCols = await getTableColumns(pool, 'users');
    console.log("Current users columns:", userCols.join(", "));

    // Ensure users.id has a DEFAULT (UUID) so new inserts auto-generate IDs
    const { rows: idDefaultRows } = await pool.query(`
      SELECT column_default FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'id' AND table_schema = 'public'
    `);
    const idDefault = idDefaultRows[0]?.column_default;
    if (!idDefault) {
      // Enable uuid-ossp extension if not already enabled
      await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
      await pool.query(`ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid()::text`);
      console.log("✓ Added DEFAULT gen_random_uuid() to users.id");
    } else {
      console.log("✓ users.id already has a default:", idDefault);
    }

    // Add new columns
    await addColumnIfMissing(pool, 'users', 'email', 'TEXT');
    await addColumnIfMissing(pool, 'users', 'password_hash', 'TEXT');
    await addColumnIfMissing(pool, 'users', 'name', 'TEXT');
    await addColumnIfMissing(pool, 'users', 'avatar_url', 'TEXT');
    await addColumnIfMissing(pool, 'users', 'email_verified', 'BOOLEAN NOT NULL DEFAULT false');
    await addColumnIfMissing(pool, 'users', 'created_at', 'TIMESTAMP NOT NULL DEFAULT NOW()');
    await addColumnIfMissing(pool, 'users', 'last_login_at', 'TIMESTAMP');

    // Migrate data from old columns to new ones if old columns exist
    const userColsNow = await getTableColumns(pool, 'users');
    if (userColsNow.includes('username') && userColsNow.includes('password')) {
      await pool.query(`UPDATE users SET email = username || '@placeholder.local' WHERE email IS NULL AND username IS NOT NULL`);
      await pool.query(`UPDATE users SET password_hash = password WHERE password_hash IS NULL AND password IS NOT NULL`);
      await pool.query(`UPDATE users SET name = username WHERE name IS NULL AND username IS NOT NULL`);
      console.log("✓ Migrated username/password -> email/password_hash/name");
    }

    // Set defaults for any remaining nulls
    await pool.query(`UPDATE users SET email = 'user' || id::text || '@placeholder.local' WHERE email IS NULL`);
    await pool.query(`UPDATE users SET password_hash = '' WHERE password_hash IS NULL`);

    // Drop old columns that are no longer needed (or make them nullable)
    const userColsFinal = await getTableColumns(pool, 'users');
    if (userColsFinal.includes('username')) {
      // Make username nullable so new inserts don't fail
      await pool.query(`ALTER TABLE users ALTER COLUMN username DROP NOT NULL`);
      console.log("✓ Made users.username nullable (legacy column)");
    }
    if (userColsFinal.includes('password')) {
      // Make password nullable so new inserts don't fail  
      await pool.query(`ALTER TABLE users ALTER COLUMN password DROP NOT NULL`);
      console.log("✓ Made users.password nullable (legacy column)");
    }
    // Also remove old role/emailVerified/avatarUrl/lastLoginAt/updatedAt camelCase columns if they exist
    // (these were added by the previous migration with camelCase names)
    for (const oldCol of ['role', 'emailVerified', 'avatarUrl', 'lastLoginAt', 'updatedAt']) {
      if (userColsFinal.includes(oldCol)) {
        // These are duplicates of the snake_case versions - make them nullable
        try {
          await pool.query(`ALTER TABLE users ALTER COLUMN "${oldCol}" DROP NOT NULL`);
        } catch (e) {
          // Ignore if already nullable
        }
      }
    }

    // Make NOT NULL
    const userColsCheck = await getTableColumns(pool, 'users');
    if (userColsCheck.includes('email')) {
      const { rows } = await pool.query(`SELECT is_nullable FROM information_schema.columns WHERE table_name='users' AND column_name='email' AND table_schema='public'`);
      if (rows[0]?.is_nullable === 'YES') {
        await pool.query(`ALTER TABLE users ALTER COLUMN email SET NOT NULL`);
        console.log("✓ Set users.email NOT NULL");
      }
    }
    if (userColsCheck.includes('password_hash')) {
      const { rows } = await pool.query(`SELECT is_nullable FROM information_schema.columns WHERE table_name='users' AND column_name='password_hash' AND table_schema='public'`);
      if (rows[0]?.is_nullable === 'YES') {
        await pool.query(`ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL`);
        console.log("✓ Set users.password_hash NOT NULL");
      }
    }

    // Add unique constraint on email if not exists
    const { rows: emailConstraints } = await pool.query(`
      SELECT tc.constraint_name 
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu 
        ON tc.constraint_name = ccu.constraint_name 
        AND tc.table_schema = ccu.table_schema
      WHERE tc.table_name = 'users' 
        AND tc.table_schema = 'public'
        AND ccu.column_name = 'email' 
        AND tc.constraint_type = 'UNIQUE'
    `);
    if (emailConstraints.length === 0) {
      // Deduplicate emails first
      await pool.query(`
        UPDATE users SET email = email || '_dup_' || id::text
        WHERE id NOT IN (SELECT MIN(id) FROM users GROUP BY lower(email))
      `);
      try {
        await pool.query(`ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email)`);
        console.log("✓ Added unique constraint on users.email");
      } catch (e: any) {
        if (e.code !== '42P07') throw e;
        console.log("✓ Unique constraint on users.email already exists");
      }
    } else {
      console.log("✓ Unique constraint on users.email already exists");
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
    // Add missing columns to organizations if it already existed
    await addColumnIfMissing(pool, 'organizations', 'subscription_status', "TEXT DEFAULT 'active'");
    await addColumnIfMissing(pool, 'organizations', 'subscription_current_period_end', 'TIMESTAMP');
    await addColumnIfMissing(pool, 'organizations', 'has_api_access', 'BOOLEAN NOT NULL DEFAULT false');
    await addColumnIfMissing(pool, 'organizations', 'has_white_label', 'BOOLEAN NOT NULL DEFAULT false');
    await addColumnIfMissing(pool, 'organizations', 'has_scheduled_scans', 'BOOLEAN NOT NULL DEFAULT false');
    // Rename camelCase columns in organizations if they exist
    await renameColumnIfExists(pool, 'organizations', 'stripeCustomerId', 'stripe_customer_id');
    await renameColumnIfExists(pool, 'organizations', 'stripeSubscriptionId', 'stripe_subscription_id');
    await renameColumnIfExists(pool, 'organizations', 'stripePriceId', 'stripe_price_id');
    await renameColumnIfExists(pool, 'organizations', 'stripeCurrentPeriodEnd', 'subscription_current_period_end');
    await renameColumnIfExists(pool, 'organizations', 'maxProjects', 'max_projects');
    await renameColumnIfExists(pool, 'organizations', 'maxCompetitors', 'max_competitors');
    await renameColumnIfExists(pool, 'organizations', 'maxPrompts', 'max_prompts');
    await renameColumnIfExists(pool, 'organizations', 'maxScansPerMonth', 'max_scans_per_month');
    await renameColumnIfExists(pool, 'organizations', 'scansThisMonth', 'scans_this_month');
    await renameColumnIfExists(pool, 'organizations', 'scansResetAt', 'scans_reset_at');
    await renameColumnIfExists(pool, 'organizations', 'createdAt', 'created_at');
    console.log("✓ organizations table ready");

    // ── 3. Create/fix org_members table ──────────────────────────────────────
    // Check if id column has a sequence (SERIAL). If not, drop and recreate.
    const { rows: idSeqRows } = await pool.query(`
      SELECT column_default FROM information_schema.columns
      WHERE table_name = 'org_members' AND column_name = 'id' AND table_schema = 'public'
    `);
    const idHasSerial = idSeqRows.length > 0 && idSeqRows[0].column_default && idSeqRows[0].column_default.includes('nextval');
    const orgMembersCols = await getTableColumns(pool, 'org_members');
    if (orgMembersCols.length === 0 || !idHasSerial) {
      // Drop and recreate with proper SERIAL id
      await pool.query(`DROP TABLE IF EXISTS org_members CASCADE`);
      await pool.query(`
        CREATE TABLE org_members (
          id SERIAL PRIMARY KEY,
          org_id VARCHAR NOT NULL,
          user_id TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'member',
          joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
          UNIQUE(org_id, user_id)
        );
      `);
      console.log("✓ org_members table created with SERIAL id");
    } else {
      // Rename camelCase columns to snake_case
      await renameColumnIfExists(pool, 'org_members', 'orgId', 'org_id');
      await renameColumnIfExists(pool, 'org_members', 'userId', 'user_id');
      await renameColumnIfExists(pool, 'org_members', 'joinedAt', 'joined_at');
      console.log("✓ org_members table ready");
    }

    // ── 4. Create/fix invitations table ────────────────────────────────────
    const { rows: invIdSeqRows } = await pool.query(`
      SELECT column_default FROM information_schema.columns
      WHERE table_name = 'invitations' AND column_name = 'id' AND table_schema = 'public'
    `);
    const invIdHasSerial = invIdSeqRows.length > 0 && invIdSeqRows[0].column_default && invIdSeqRows[0].column_default.includes('nextval');
    const invitationsCols = await getTableColumns(pool, 'invitations');
    if (invitationsCols.length === 0 || !invIdHasSerial) {
      await pool.query(`DROP TABLE IF EXISTS invitations CASCADE`);
      await pool.query(`
        CREATE TABLE invitations (
          id SERIAL PRIMARY KEY,
          org_id VARCHAR NOT NULL,
          email TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'member',
          token TEXT NOT NULL UNIQUE,
          invited_by TEXT NOT NULL,
          accepted_at TIMESTAMP,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
      console.log("✓ invitations table created with SERIAL id");
    } else {
      await renameColumnIfExists(pool, 'invitations', 'orgId', 'org_id');
      await renameColumnIfExists(pool, 'invitations', 'invitedBy', 'invited_by');
      await renameColumnIfExists(pool, 'invitations', 'acceptedAt', 'accepted_at');
      await renameColumnIfExists(pool, 'invitations', 'expiresAt', 'expires_at');
      await renameColumnIfExists(pool, 'invitations', 'createdAt', 'created_at');
      console.log("✓ invitations table ready");
    }

    // ── 5. Create/fix password_reset_tokens table ──────────────────────────
    const { rows: prtIdSeqRows } = await pool.query(`
      SELECT column_default FROM information_schema.columns
      WHERE table_name = 'password_reset_tokens' AND column_name = 'id' AND table_schema = 'public'
    `);
    const prtIdHasSerial = prtIdSeqRows.length > 0 && prtIdSeqRows[0].column_default && prtIdSeqRows[0].column_default.includes('nextval');
    const prtCols = await getTableColumns(pool, 'password_reset_tokens');
    if (prtCols.length === 0 || !prtIdHasSerial) {
      await pool.query(`DROP TABLE IF EXISTS password_reset_tokens CASCADE`);
      await pool.query(`
        CREATE TABLE password_reset_tokens (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          token TEXT NOT NULL UNIQUE,
          expires_at TIMESTAMP NOT NULL,
          used_at TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
      console.log("✓ password_reset_tokens table created with SERIAL id");
    } else {
      await renameColumnIfExists(pool, 'password_reset_tokens', 'userId', 'user_id');
      await renameColumnIfExists(pool, 'password_reset_tokens', 'expiresAt', 'expires_at');
      await renameColumnIfExists(pool, 'password_reset_tokens', 'usedAt', 'used_at');
      await renameColumnIfExists(pool, 'password_reset_tokens', 'createdAt', 'created_at');
      console.log("✓ password_reset_tokens table ready");
    }

    // ── 6. Create/fix api_keys table ───────────────────────────────────────
    const { rows: akIdSeqRows } = await pool.query(`
      SELECT column_default FROM information_schema.columns
      WHERE table_name = 'api_keys' AND column_name = 'id' AND table_schema = 'public'
    `);
    const akIdHasSerial = akIdSeqRows.length > 0 && akIdSeqRows[0].column_default && akIdSeqRows[0].column_default.includes('nextval');
    const apiKeysCols = await getTableColumns(pool, 'api_keys');
    if (apiKeysCols.length === 0 || !akIdHasSerial) {
      await pool.query(`DROP TABLE IF EXISTS api_keys CASCADE`);
      await pool.query(`
        CREATE TABLE api_keys (
          id SERIAL PRIMARY KEY,
          org_id VARCHAR NOT NULL,
          name TEXT NOT NULL,
          key_hash TEXT NOT NULL UNIQUE,
          key_prefix TEXT NOT NULL,
          last_used_at TIMESTAMP,
          created_by TEXT NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
      console.log("✓ api_keys table created with SERIAL id");
    } else {
      await renameColumnIfExists(pool, 'api_keys', 'orgId', 'org_id');
      await renameColumnIfExists(pool, 'api_keys', 'keyHash', 'key_hash');
      await renameColumnIfExists(pool, 'api_keys', 'keyPrefix', 'key_prefix');
      await renameColumnIfExists(pool, 'api_keys', 'lastUsedAt', 'last_used_at');
      await renameColumnIfExists(pool, 'api_keys', 'createdBy', 'created_by');
      await renameColumnIfExists(pool, 'api_keys', 'createdAt', 'created_at');
      console.log("✓ api_keys table ready");
    }

    // ── 7. Check and update projects table ─────────────────────────────────
    const projCols = await getTableColumns(pool, 'projects');
    console.log("Current projects columns:", projCols.join(", "));

    // Handle orgId -> org_id rename in projects
    if (projCols.includes('orgId') && !projCols.includes('org_id')) {
      await pool.query(`ALTER TABLE projects RENAME COLUMN "orgId" TO org_id`);
      console.log("✓ Renamed projects.orgId -> org_id");
    } else if (!projCols.includes('org_id')) {
      await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS org_id VARCHAR`);
      console.log("✓ Added projects.org_id column");
    }

    // Rename other camelCase columns in projects
    await renameColumnIfExists(pool, 'projects', 'brandName', 'brand_name');
    await renameColumnIfExists(pool, 'projects', 'createdAt', 'created_at');

    // Make projects.user_id nullable (old schema had user_id NOT NULL, new schema uses org_id)
    const projColsFinal = await getTableColumns(pool, 'projects');
    if (projColsFinal.includes('user_id')) {
      try {
        await pool.query(`ALTER TABLE projects ALTER COLUMN user_id DROP NOT NULL`);
        console.log("✓ Made projects.user_id nullable (legacy column)");
      } catch (e) {
        // Already nullable, ignore
      }
    }
    // Also make projects.plan nullable if it exists (old schema had it)
    if (projColsFinal.includes('plan')) {
      try {
        await pool.query(`ALTER TABLE projects ALTER COLUMN plan DROP NOT NULL`);
        console.log("✓ Made projects.plan nullable (legacy column)");
      } catch (e) {
        // Already nullable, ignore
      }
    }
    console.log("✓ projects table ready");

    // ── 8. Create scan_schedules table ─────────────────────────────────────
    const ssCols = await getTableColumns(pool, 'scan_schedules');
    if (ssCols.length === 0) {
      await pool.query(`
        CREATE TABLE scan_schedules (
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
      console.log("✓ scan_schedules table created");
    } else {
      await renameColumnIfExists(pool, 'scan_schedules', 'projectId', 'project_id');
      await renameColumnIfExists(pool, 'scan_schedules', 'dayOfWeek', 'day_of_week');
      await renameColumnIfExists(pool, 'scan_schedules', 'isActive', 'is_active');
      await renameColumnIfExists(pool, 'scan_schedules', 'lastRunAt', 'last_run_at');
      await renameColumnIfExists(pool, 'scan_schedules', 'nextRunAt', 'next_run_at');
      await renameColumnIfExists(pool, 'scan_schedules', 'emailReport', 'email_report');
      await renameColumnIfExists(pool, 'scan_schedules', 'createdAt', 'created_at');
      // Handle orgId column if it exists (old schema had it)
      const ssColsNow = await getTableColumns(pool, 'scan_schedules');
      if (ssColsNow.includes('orgId') || ssColsNow.includes('org_id')) {
        // Remove org_id from scan_schedules if it exists (not in new schema)
        // Actually keep it, just rename
        await renameColumnIfExists(pool, 'scan_schedules', 'orgId', 'org_id');
      }
      console.log("✓ scan_schedules table ready");
    }

    // ── 9. Create tags table if missing ────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        project_id VARCHAR NOT NULL,
        name TEXT NOT NULL,
        color TEXT DEFAULT '#22c55e'
      );
    `);
    await renameColumnIfExists(pool, 'tags', 'projectId', 'project_id');
    console.log("✓ tags table ready");

    // ── 10. Fix other existing tables ──────────────────────────────────────
    // prompts table
    await renameColumnIfExists(pool, 'prompts', 'projectId', 'project_id');
    await renameColumnIfExists(pool, 'prompts', 'tagId', 'tag_id');
    await renameColumnIfExists(pool, 'prompts', 'isActive', 'is_active');
    await renameColumnIfExists(pool, 'prompts', 'createdAt', 'created_at');

    // competitors table
    await renameColumnIfExists(pool, 'competitors', 'projectId', 'project_id');
    await renameColumnIfExists(pool, 'competitors', 'brandName', 'brand_name');
    await renameColumnIfExists(pool, 'competitors', 'isHidden', 'is_hidden');

    // daily_metrics table
    await renameColumnIfExists(pool, 'daily_metrics', 'projectId', 'project_id');
    await renameColumnIfExists(pool, 'daily_metrics', 'brandName', 'brand_name');
    await renameColumnIfExists(pool, 'daily_metrics', 'visibilityPct', 'visibility_pct');
    await renameColumnIfExists(pool, 'daily_metrics', 'sovPct', 'sov_pct');
    await renameColumnIfExists(pool, 'daily_metrics', 'avgRank', 'avg_rank');
    await renameColumnIfExists(pool, 'daily_metrics', 'sentimentScore', 'sentiment_score');
    await renameColumnIfExists(pool, 'daily_metrics', 'brandStrength', 'brand_strength');

    // boost_actions table
    await renameColumnIfExists(pool, 'boost_actions', 'projectId', 'project_id');
    await renameColumnIfExists(pool, 'boost_actions', 'generatedAt', 'generated_at');

    // citations table
    await renameColumnIfExists(pool, 'citations', 'projectId', 'project_id');
    await renameColumnIfExists(pool, 'citations', 'pageTitle', 'page_title');
    await renameColumnIfExists(pool, 'citations', 'citationCount', 'citation_count');
    await renameColumnIfExists(pool, 'citations', 'isOwned', 'is_owned');
    await renameColumnIfExists(pool, 'citations', 'weekChange', 'week_change');

    // analysis_runs table
    await renameColumnIfExists(pool, 'analysis_runs', 'projectId', 'project_id');
    await renameColumnIfExists(pool, 'analysis_runs', 'totalPrompts', 'total_prompts');
    await renameColumnIfExists(pool, 'analysis_runs', 'completedPrompts', 'completed_prompts');
    await renameColumnIfExists(pool, 'analysis_runs', 'modelsUsed', 'models_used');
    await renameColumnIfExists(pool, 'analysis_runs', 'startedAt', 'started_at');
    await renameColumnIfExists(pool, 'analysis_runs', 'completedAt', 'completed_at');

    // scan_results table (if exists)
    const scanResultsCols = await getTableColumns(pool, 'scan_results');
    if (scanResultsCols.length > 0) {
      await renameColumnIfExists(pool, 'scan_results', 'runId', 'run_id');
      await renameColumnIfExists(pool, 'scan_results', 'promptId', 'prompt_id');
      await renameColumnIfExists(pool, 'scan_results', 'brandMentioned', 'brand_mentioned');
      await renameColumnIfExists(pool, 'scan_results', 'brandRank', 'brand_rank');
      await renameColumnIfExists(pool, 'scan_results', 'sentimentScore', 'sentiment_score');
      await renameColumnIfExists(pool, 'scan_results', 'responseText', 'response_text');
      await renameColumnIfExists(pool, 'scan_results', 'createdAt', 'created_at');
      console.log("✓ scan_results table ready");
    }

    // ── 11. Migrate existing users to orgs ─────────────────────────────────
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
          `INSERT INTO org_members (org_id, user_id, role) VALUES ($1, $2, 'owner')`,
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

    console.log("\n✅ Migration completed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
