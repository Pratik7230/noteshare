// Usage: npm run admin:make -- you@example.com         (grant admin)
//        npm run admin:make -- you@example.com revoke  (remove admin)
// Talks to the database in DATABASE_URL directly, so it is the safe way to create the first admin.
import dataSource from "../data-source.js";

const [email, mode] = process.argv.slice(2);
if (!email) { console.error("Usage: npm run admin:make -- <email> [revoke]"); process.exit(1); }

await dataSource.initialize();
const revoke = mode === "revoke";
const rows = await dataSource.query(`SELECT id, email, role FROM users WHERE email = $1`, [email.toLowerCase()]);
if (!rows.length) {
  console.error(`No user with email ${email}. Register that account first.`);
  process.exitCode = 1;
} else if (revoke) {
  await dataSource.query(`UPDATE users SET role = 'user' WHERE id = $1`, [rows[0].id]);
  console.log(`${rows[0].email} is now a regular user.`);
} else {
  await dataSource.query(`UPDATE users SET role = 'admin', email_verified = true WHERE id = $1`, [rows[0].id]);
  console.log(`${rows[0].email} is now an admin.`);
}
await dataSource.destroy();
