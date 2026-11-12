/** Admin panel: roles, suspension, note takedowns, reports, audit log, site settings. */
export class AddAdmin1730000000002 {
  name = "AddAdmin1730000000002";

  async up(q) {
    await q.query(`ALTER TABLE users ADD COLUMN role varchar(16) NOT NULL DEFAULT 'user'`);
    await q.query(`ALTER TABLE users ADD CONSTRAINT chk_users_role CHECK (role IN ('user','admin'))`);
    await q.query(`ALTER TABLE users ADD COLUMN suspended_at timestamptz`);
    await q.query(`ALTER TABLE users ADD COLUMN suspended_reason varchar(255)`);
    await q.query(`ALTER TABLE users ADD COLUMN last_login_at timestamptz`);
    await q.query(`CREATE INDEX idx_users_created_at ON users (created_at DESC)`);

    await q.query(`ALTER TABLE notes ADD COLUMN disabled_at timestamptz`);
    await q.query(`ALTER TABLE notes ADD COLUMN disabled_reason varchar(255)`);

    await q.query(`
      CREATE TABLE note_reports (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        note_id uuid NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
        reporter_id uuid REFERENCES users(id) ON DELETE SET NULL,
        reason varchar(16) NOT NULL CHECK (reason IN ('spam','abuse','illegal','copyright','other')),
        details varchar(500),
        status varchar(16) NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','dismissed')),
        resolved_by_id uuid REFERENCES users(id) ON DELETE SET NULL,
        resolved_at timestamptz,
        resolution_note varchar(500),
        created_at timestamptz NOT NULL DEFAULT now()
      )`);
    await q.query(`CREATE INDEX idx_note_reports_status ON note_reports (status, created_at DESC)`);
    await q.query(`CREATE INDEX idx_note_reports_note ON note_reports (note_id)`);

    await q.query(`
      CREATE TABLE audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id uuid REFERENCES users(id) ON DELETE SET NULL,
        admin_email varchar(255) NOT NULL,
        action varchar(64) NOT NULL,
        target_type varchar(32),
        target_id varchar(64),
        meta jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )`);
    await q.query(`CREATE INDEX idx_audit_logs_created ON audit_logs (created_at DESC)`);
    await q.query(`CREATE INDEX idx_audit_logs_action ON audit_logs (action)`);

    await q.query(`
      CREATE TABLE site_settings (
        key varchar(64) PRIMARY KEY,
        value jsonb NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      )`);
  }

  async down(q) {
    await q.query(`DROP TABLE site_settings`);
    await q.query(`DROP TABLE audit_logs`);
    await q.query(`DROP TABLE note_reports`);
    await q.query(`ALTER TABLE notes DROP COLUMN disabled_reason`);
    await q.query(`ALTER TABLE notes DROP COLUMN disabled_at`);
    await q.query(`DROP INDEX idx_users_created_at`);
    await q.query(`ALTER TABLE users DROP COLUMN last_login_at`);
    await q.query(`ALTER TABLE users DROP COLUMN suspended_reason`);
    await q.query(`ALTER TABLE users DROP COLUMN suspended_at`);
    await q.query(`ALTER TABLE users DROP CONSTRAINT chk_users_role`);
    await q.query(`ALTER TABLE users DROP COLUMN role`);
  }
}
