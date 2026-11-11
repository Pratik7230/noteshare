/** Adds profile fields: bio and profile picture reference. */
export class AddUserProfile1730000000001 {
  name = "AddUserProfile1730000000001";

  async up(q) {
    await q.query(`ALTER TABLE users ADD COLUMN bio varchar(280)`);
    await q.query(`ALTER TABLE users ADD COLUMN avatar_key varchar(1024)`);
    await q.query(`ALTER TABLE users ADD COLUMN avatar_updated_at timestamptz`);
  }

  async down(q) {
    await q.query(`ALTER TABLE users DROP COLUMN avatar_updated_at`);
    await q.query(`ALTER TABLE users DROP COLUMN avatar_key`);
    await q.query(`ALTER TABLE users DROP COLUMN bio`);
  }
}
