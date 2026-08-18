import { type ProductPlatform } from "@/lib/content/constants";

export type ReleaseAsset = {
  name: string;
  url: string;
  size: number;
  downloads: number;
  platform: ProductPlatform;
  arch: string;
  /** An installer is what most people actually want; archives are the escape. */
  kind: "installer" | "archive" | "other";
};

export type Release = {
  version: string;
  publishedAt: string;
  notesUrl: string;
  assets: ReleaseAsset[];
  totalDownloads: number;
};

/**
 * Classifies a release asset from its filename.
 *
 * Tauri, Electron and the usual CI templates all name their output the same
 * way, so the filename carries platform and architecture reliably enough that
 * labelling eight files by hand in the admin would be busywork.
 *
 * `.app.tar.gz` is checked explicitly: it is the Tauri macOS bundle and the
 * only macOS artefact whose name mentions neither "darwin" nor "macos".
 */
function classify(name: string): Pick<ReleaseAsset, "platform" | "arch" | "kind"> {
  const n = name.toLowerCase();

  let platform: ProductPlatform = "WINDOWS";
  if (/\.(dmg|pkg)$|\.app\.tar\.gz$|darwin|macos|osx/.test(n)) platform = "MACOS";
  else if (/\.(appimage|deb|rpm)$|linux/.test(n)) platform = "LINUX";
  else if (/\.apk$|android/.test(n)) platform = "ANDROID";
  else if (/\.ipa$/.test(n)) platform = "IOS";

  const arch = /aarch64|arm64/.test(n)
    ? platform === "MACOS"
      ? "Apple Silicon"
      : "arm64"
    : /x64|x86_64|amd64/.test(n)
      ? "x64"
      : "";

  const kind: ReleaseAsset["kind"] = /\.(exe|msi|dmg|pkg|deb|rpm|apk)$/.test(n)
    ? "installer"
    : /\.(zip|appimage)$|\.tar\.gz$/.test(n)
      ? "archive"
      : "other";

  return { platform, arch, kind };
}

/**
 * Latest published release for "owner/repo", or null.
 *
 * Cached for an hour through Next's fetch cache. Unauthenticated GitHub allows
 * 60 requests an hour per IP, and a page that called this on every render would
 * spend that in a minute — after which it would silently lose its download
 * buttons. Setting `GITHUB_TOKEN` raises the ceiling to 5000; it is optional.
 *
 * Failure is always null, never a throw: GitHub being unreachable must fall
 * back to the manually entered downloads, not take the page down with it.
 */
export async function getLatestRelease(repo: string): Promise<Release | null> {
  const clean = repo
    .trim()
    .replace(/^https?:\/\/github\.com\//i, "")
    .replace(/\/+$/, "");
  if (!/^[\w.-]+\/[\w.-]+$/.test(clean)) return null;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${clean}/releases/latest`, {
      headers,
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      tag_name?: string;
      published_at?: string;
      html_url?: string;
      assets?: Array<{
        name?: string;
        size?: number;
        download_count?: number;
        browser_download_url?: string;
      }>;
    };

    const raw = data.assets ?? [];

    const assets: ReleaseAsset[] = raw
      .filter((a) => a.name && a.browser_download_url)
      // `.sig` signatures and `latest.json` are updater machinery, not
      // something to put in front of a person.
      .filter((a) => !/\.sig$|^latest\.json$/i.test(a.name!))
      .map((a) => ({
        name: a.name!,
        url: a.browser_download_url!,
        size: a.size ?? 0,
        downloads: a.download_count ?? 0,
        ...classify(a.name!),
      }));

    return {
      version: (data.tag_name ?? "").replace(/^v/i, ""),
      publishedAt: data.published_at ?? "",
      notesUrl: data.html_url ?? `https://github.com/${clean}/releases`,
      assets,
      totalDownloads: raw.reduce((n, a) => n + (a.download_count ?? 0), 0),
    };
  } catch {
    return null;
  }
}

/** Human file size. */
export function fileSize(bytes: number): string {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export const PLATFORM_LABEL: Record<ProductPlatform, string> = {
  WEB: "Web",
  WINDOWS: "Windows",
  MACOS: "macOS",
  LINUX: "Linux",
  ANDROID: "Android",
  IOS: "iOS",
};
