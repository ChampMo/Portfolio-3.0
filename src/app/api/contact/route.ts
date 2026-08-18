import { sendContactMessage } from "@/lib/mail/mailer";
import { connectToDatabase } from "@/lib/db/mongodb";
import Message from "@/models/Message";
import { ok, bad, boom, readJson, str } from "@/lib/api/respond";
import { tooMany, clientIp } from "@/lib/api/throttle";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const ip = clientIp(req);

  if (tooMany(`contact:${ip}`, 5, 10 * 60 * 1000)) {
    return bad("Too many messages. Please try again later.", 429);
  }

  const body = await readJson<Record<string, unknown>>(req);
  if (!body) return bad("Invalid JSON body");

  // Honeypot: a real person never fills a hidden field.
  if (str(body.company)) return ok({ ok: true });

  const name = str(body.name);
  const email = str(body.email);
  const message = str(body.message);

  if (!name || name.length > 120) return bad("Please enter your name.");
  if (!EMAIL_RE.test(email)) return bad("Please enter a valid email address.");
  if (message.length < 10) return bad("Please write a slightly longer message.");
  if (message.length > 5000) return bad("That message is too long.");

  // Store first, mail second. If this write fails there is nowhere to put the
  // message, so it is the only step allowed to fail the request.
  let saved;
  try {
    await connectToDatabase();
    saved = await Message.create({
      name,
      email,
      body: message,
      ip,
      userAgent: req.headers.get("user-agent")?.slice(0, 300) ?? "",
    });
  } catch (err) {
    return boom(err, "POST /api/contact (save)");
  }

  // The notification is best-effort. A dead SMTP account must not tell the
  // sender their message was lost when it is sitting safely in the inbox.
  try {
    await sendContactMessage({ name, email, message });
    await Message.updateOne({ _id: saved._id }, { $set: { mailed: true } });
  } catch (err) {
    console.error("[api] POST /api/contact: stored but not mailed:", err);
  }

  return ok({ ok: true });
}
