import nodemailer from "nodemailer";

const host = process.env.MAIL_SMTP_HOST;
const port = Number(process.env.MAIL_SMTP_PORT ?? 587);
const secure = (process.env.MAIL_SMTP_SECURE ?? "tls").toLowerCase() === "ssl";

export const mailTransport = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: {
    user: process.env.MAIL_SMTP_USER,
    pass: process.env.MAIL_SMTP_PASS,
  },
});

export async function sendMail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  const fromAddress = process.env.MAIL_FROM_ADDRESS;
  const fromName = process.env.MAIL_FROM_NAME ?? "Sims";

  return mailTransport.sendMail({
    from: `${fromName} <${fromAddress}>`,
    ...options,
  });
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  return sendMail(options);
}
