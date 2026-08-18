import { Schema } from "mongoose";
import { defineModel } from "@/lib/db/defineModel";

/**
 * A contact-form submission, kept independently of the email that announces it.
 *
 * The form used to be mail-only. That makes the SMTP provider a single point of
 * failure for the one thing this site exists to receive — and it has already
 * failed once here (Gmail 535). Writing to the database first means a mail
 * outage costs a notification, not the message.
 */
const MessageSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    read: { type: Boolean, default: false, index: true },
    /** Whether the notification email actually went out. */
    mailed: { type: Boolean, default: false },
    /** Kept for abuse triage only. */
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
  },
  { timestamps: true }
);

MessageSchema.index({ createdAt: -1 });

export type MessageDoc = {
  _id: string;
  name: string;
  email: string;
  body: string;
  read: boolean;
  mailed: boolean;
  ip: string;
  userAgent: string;
  createdAt: string;
  updatedAt: string;
};

export default defineModel<MessageDoc>("Message", MessageSchema);
