/** Initial schema. Hand-written SQL so it is explicit and reviewable. */
export class InitialSchema1730000000000 {
  name = "InitialSchema1730000000000";

  async up(q) {
    await q.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

    await q.query(`
      CREATE TABLE users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(120) NOT NULL,
        email varchar(255) NOT NULL,
        password varchar(255) NOT NULL,
        email_verified boolean NOT NULL DEFAULT false,
        email_verify_token_hash varchar(128),
        reset_token_hash varchar(128),
        reset_token_expires_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_users_email UNIQUE (email)
      )`);

    await q.query(`
      CREATE TABLE notes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        title varchar(255) NOT NULL DEFAULT '',
        slug varchar(64) NOT NULL,
        content text NOT NULL DEFAULT '',
        content_type varchar(16) NOT NULL DEFAULT 'rich',
        privacy varchar(16) NOT NULL DEFAULT 'unlisted',
        share_permission varchar(8) NOT NULL DEFAULT 'edit',
        password_hash varchar(255),
        edit_key_hash varchar(128),
        owner_id uuid REFERENCES users(id) ON DELETE SET NULL,
        expires_at timestamptz,
        access_expires_at timestamptz,
        max_views int,
        view_count int NOT NULL DEFAULT 0,
        is_archived boolean NOT NULL DEFAULT false,
        is_deleted boolean NOT NULL DEFAULT false,
        deleted_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_notes_slug UNIQUE (slug),
        CONSTRAINT chk_notes_content_type CHECK (content_type IN ('rich','markdown','plain')),
        CONSTRAINT chk_notes_privacy CHECK (privacy IN ('public','unlisted','private')),
        CONSTRAINT chk_notes_share_permission CHECK (share_permission IN ('view','edit')),
        CONSTRAINT chk_notes_max_views CHECK (max_views IS NULL OR max_views > 0)
      )`);
    await q.query(`CREATE INDEX idx_notes_owner_updated ON notes (owner_id, updated_at DESC)`);
    await q.query(`CREATE INDEX idx_notes_expires_at ON notes (expires_at) WHERE expires_at IS NOT NULL`);
    await q.query(`CREATE INDEX idx_notes_title_trgm ON notes USING gin (title gin_trgm_ops)`);
    await q.query(`CREATE INDEX idx_notes_content_fts ON notes USING gin (to_tsvector('simple', content))`);

    await q.query(`
      CREATE TABLE note_permissions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        note_id uuid NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        permission varchar(8) NOT NULL CHECK (permission IN ('VIEW','EDIT')),
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_note_permissions_note_user UNIQUE (note_id, user_id)
      )`);
    await q.query(`CREATE INDEX idx_note_permissions_user ON note_permissions (user_id)`);

    await q.query(`
      CREATE TABLE note_versions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        note_id uuid NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
        title varchar(255) NOT NULL DEFAULT '',
        content text NOT NULL DEFAULT '',
        version_number int NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_note_versions_note_number UNIQUE (note_id, version_number)
      )`);

    await q.query(`
      CREATE TABLE tags (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(50) NOT NULL,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT uq_tags_user_name UNIQUE (user_id, name)
      )`);

    await q.query(`
      CREATE TABLE note_tags (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        note_id uuid NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
        tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        CONSTRAINT uq_note_tags_note_tag UNIQUE (note_id, tag_id)
      )`);
    await q.query(`CREATE INDEX idx_note_tags_tag ON note_tags (tag_id)`);

    await q.query(`
      CREATE TABLE note_views (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        note_id uuid NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
        visitor_hash varchar(64) NOT NULL,
        viewed_at timestamptz NOT NULL DEFAULT now()
      )`);
    await q.query(`CREATE INDEX idx_note_views_note_visitor ON note_views (note_id, visitor_hash)`);

    await q.query(`
      CREATE TABLE note_stars (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        note_id uuid NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT uq_note_stars_note_user UNIQUE (note_id, user_id)
      )`);

    await q.query(`
      CREATE TABLE note_attachments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        note_id uuid NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
        filename varchar(255) NOT NULL,
        storage_key varchar(512) NOT NULL,
        mime_type varchar(127) NOT NULL,
        size int NOT NULL CHECK (size >= 0),
        created_at timestamptz NOT NULL DEFAULT now()
      )`);
    await q.query(`CREATE INDEX idx_note_attachments_note ON note_attachments (note_id)`);

    await q.query(`
      CREATE TABLE note_invitations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        note_id uuid NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
        email varchar(255) NOT NULL,
        permission varchar(8) NOT NULL CHECK (permission IN ('VIEW','EDIT')),
        token varchar(128) NOT NULL,
        expires_at timestamptz NOT NULL,
        accepted_at timestamptz,
        CONSTRAINT uq_note_invitations_token UNIQUE (token)
      )`);
    await q.query(`CREATE INDEX idx_note_invitations_email ON note_invitations (email)`);

    await q.query(`
      CREATE TABLE note_slug_redirects (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        note_id uuid NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
        old_slug varchar(64) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_note_slug_redirects_old_slug UNIQUE (old_slug)
      )`);
  }

  async down(q) {
    for (const t of [
      "note_slug_redirects", "note_invitations", "note_attachments", "note_stars",
      "note_views", "note_tags", "tags", "note_versions", "note_permissions",
      "notes", "users",
    ]) {
      await q.query(`DROP TABLE IF EXISTS ${t}`);
    }
  }
}
