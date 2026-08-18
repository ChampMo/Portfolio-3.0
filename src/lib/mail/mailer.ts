import nodemailer from "nodemailer";

function buildTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP env missing (SMTP_HOST / SMTP_USER / SMTP_PASS required)");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

function mailTo(): string {
  const to = process.env.MAIL_TO || process.env.SMTP_USER;
  if (!to) throw new Error("MAIL_TO (or SMTP_USER) must be set");
  return to;
}

/** Minimal escaping so user-supplied text can never inject markup. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const SHELL = (title: string, inner: string) => `
<div style="font-family:ui-monospace,Menlo,Consolas,monospace;background:#12110D;padding:32px;color:#F2EDE2;">
  <div style="max-width:520px;margin:0 auto;border:1px solid #33301F;background:#1B1914;border-radius:14px;padding:28px;">
    <p style="letter-spacing:.24em;color:#FF8A34;font-size:10px;margin:0 0 14px;">SIGNAL // ADMIN</p>
    <h1 style="margin:0 0 18px;font-size:20px;color:#F2EDE2;font-weight:600;">${esc(title)}</h1>
    ${inner}
  </div>
</div>`;

/** Fired on every successful admin sign-in so unexpected access is visible. */
export async function sendSignInAlert(email: string, name: string) {
  const when = new Date().toLocaleString("en-GB", { timeZone: "Asia/Bangkok" });
  const html = SHELL(
    "Admin sign-in",
    `<p style="font-size:13px;line-height:1.7;color:#8C8672;margin:0;">
       <b style="color:#F2EDE2;">${esc(name || email)}</b> signed in to the portfolio admin panel.
     </p>
     <table style="margin-top:16px;font-size:12px;color:#8C8672;">
       <tr><td style="padding:4px 16px 4px 0;">Account</td><td style="color:#5FB8C4;">${esc(email)}</td></tr>
       <tr><td style="padding:4px 16px 4px 0;">Time (BKK)</td><td style="color:#F2EDE2;">${esc(when)}</td></tr>
     </table>
     <p style="margin:18px 0 0;font-size:11px;color:#8C8672;">
       If this wasn't you, remove the address from ADMIN_ALLOWED_EMAILS and redeploy.
     </p>`
  );

  const transporter = buildTransport();
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER!,
    to: mailTo(),
    subject: `[SIGNAL] Admin sign-in — ${email}`,
    text: `${name || email} (${email}) signed in to the admin panel at ${when} BKK.`,
    html,
  });
}

/** Contact form on the public site. */
export async function sendContactMessage(input: {
  name: string;
  email: string;
  message: string;
}) {
  const html = SHELL(
    "New contact message",
    `<table style="font-size:12px;color:#8C8672;">
       <tr><td style="padding:4px 16px 4px 0;">From</td><td style="color:#F2EDE2;">${esc(input.name)}</td></tr>
       <tr><td style="padding:4px 16px 4px 0;">Email</td><td style="color:#5FB8C4;">${esc(input.email)}</td></tr>
     </table>
     <div style="margin-top:18px;padding-top:16px;border-top:1px solid #33301F;font-size:13px;line-height:1.7;color:#F2EDE2;white-space:pre-wrap;">${esc(
       input.message
     )}</div>`
  );

  const transporter = buildTransport();
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER!,
    to: mailTo(),
    replyTo: input.email,
    subject: `[SIGNAL] Message from ${input.name}`,
    text: `From: ${input.name} <${input.email}>\n\n${input.message}`,
    html,
  });
}
