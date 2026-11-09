import nodemailer from "nodemailer";

/** Sends via SMTP_URL if set; otherwise logs the email (handy in development). */
export async function sendMail({ to, subject, text }) {
  if (!process.env.SMTP_URL) {
    console.log(`\n[mail:dev] to=${to}\nsubject=${subject}\n${text}\n`);
    return;
  }
  const t = nodemailer.createTransport(process.env.SMTP_URL);
  await t.sendMail({ from: process.env.MAIL_FROM || "NoteShare <no-reply@noteshare.local>", to, subject, text });
}
