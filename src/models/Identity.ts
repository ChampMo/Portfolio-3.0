import { Schema } from "mongoose";
import { defineModel } from "@/lib/db/defineModel";

/**
 * Singleton document (key: "main") holding everything about the person:
 * hero copy, contact, socials, education, media, and the editable section
 * eyebrows used across the site.
 */
const IdentitySchema = new Schema(
  {
    key: { type: String, unique: true, default: "main" },

    profile: {
      firstName: { type: String, default: "Monthol" },
      lastName: { type: String, default: "Sukjinda" },
      nickname: { type: String, default: "Champ" },
      /** Shown under the hero name — e.g. "FULL-STACK DEVELOPER" */
      role: { type: String, default: "Full-Stack Developer" },
      motto: { type: String, default: "" },
      intro: { type: String, default: "" },
    },

    /** Drives the pulsing status pill in the hero and contact sections. */
    availability: {
      isOpen: { type: Boolean, default: true },
      label: { type: String, default: "Open to work" },
    },

    contact: {
      phone: { type: String, default: "" },
      email: { type: String, default: "" },
      address: { type: String, default: "" },
      /** Telemetry readout in the hero rail. Decorative but real. */
      latitude: { type: String, default: "13.7563" },
      longitude: { type: String, default: "100.5018" },
      timezone: { type: String, default: "Asia/Bangkok" },
    },

    socials: {
      github: { type: String, default: "" },
      linkedin: { type: String, default: "" },
      instagram: { type: String, default: "" },
      facebook: { type: String, default: "" },
    },

    education: {
      universityName: { type: String, default: "" },
      universityShort: { type: String, default: "" },
      universityLogo: { type: String, default: "" },
      major: { type: String, default: "" },
      timelineStart: { type: String, default: "" },
      timelineEnd: { type: String, default: "" },
      gpax: { type: String, default: "" },
      /** e.g. "Second Class Honours" — printed under the GPA on the résumé. */
      honours: { type: String, default: "" },
    },

    media: {
      avatar: { type: String, default: "" },
      slideshowImages: { type: [String], default: [] },
      cvUrl: { type: String, default: "" },
      cvVisible: { type: Boolean, default: true },
      transcriptUrl: { type: String, default: "" },
      transcriptVisible: { type: Boolean, default: true },
    },

    /** Editable eyebrow + lead for each public section. */
    sections: {
      about: {
        eyebrow: { type: String, default: "Identity" },
        lead: { type: String, default: "Fourth-year student, full-stack builder" },
        body: { type: String, default: "" },
      },
      skills: {
        eyebrow: { type: String, default: "Tech Forge" },
        lead: { type: String, default: "The arsenal" },
        body: { type: String, default: "" },
      },
      services: {
        eyebrow: { type: String, default: "Service Bay" },
        lead: { type: String, default: "What I can take on" },
        body: { type: String, default: "" },
      },
      projects: {
        eyebrow: { type: String, default: "Mission Archives" },
        lead: { type: String, default: "Selected work" },
        body: { type: String, default: "" },
      },
      experience: {
        eyebrow: { type: String, default: "Mission Log" },
        lead: { type: String, default: "Trajectory so far" },
        body: { type: String, default: "" },
      },
      contact: {
        eyebrow: { type: String, default: "Channel Open" },
        lead: { type: String, default: "Let's build something" },
        body: { type: String, default: "" },
      },
    },
  },
  { timestamps: true }
);

export type IdentityDoc = {
  _id: string;
  key: string;
  profile: {
    firstName: string;
    lastName: string;
    nickname: string;
    role: string;
    motto: string;
    intro: string;
  };
  availability: { isOpen: boolean; label: string };
  contact: {
    phone: string;
    email: string;
    address: string;
    latitude: string;
    longitude: string;
    timezone: string;
  };
  socials: {
    github: string;
    linkedin: string;
    instagram: string;
    facebook: string;
  };
  education: {
    universityName: string;
    universityShort: string;
    universityLogo: string;
    major: string;
    timelineStart: string;
    timelineEnd: string;
    gpax: string;
    honours: string;
  };
  media: {
    avatar: string;
    slideshowImages: string[];
    cvUrl: string;
    cvVisible: boolean;
    transcriptUrl: string;
    transcriptVisible: boolean;
  };
  sections: Record<
    "about" | "skills" | "services" | "projects" | "experience" | "contact",
    { eyebrow: string; lead: string; body: string }
  >;
};

export default defineModel<IdentityDoc>("Identity", IdentitySchema);
