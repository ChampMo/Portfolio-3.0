import { Schema } from "mongoose";
import { defineModel } from "@/lib/db/defineModel";

/**
 * Record of a Google account that has signed in. This is NOT the access
 * control list — that lives in ADMIN_ALLOWED_EMAILS so access can be revoked
 * by editing env alone, without touching the database.
 *
 * `sessionVersion` lets you force-invalidate every issued cookie for a user
 * (the "sign out everywhere" button) by bumping the number.
 */
const AdminUserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    googleSub: { type: String, default: "", index: true },
    name: { type: String, default: "" },
    picture: { type: String, default: "" },

    sessionVersion: { type: Number, default: 1 },
    lastLoginAt: { type: Date, default: null },
    loginCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export type AdminUserDoc = {
  _id: string;
  email: string;
  googleSub: string;
  name: string;
  picture: string;
  sessionVersion: number;
  lastLoginAt: Date | null;
  loginCount: number;
  createdAt: string;
  updatedAt: string;
};

export default defineModel<AdminUserDoc>("AdminUser", AdminUserSchema);
