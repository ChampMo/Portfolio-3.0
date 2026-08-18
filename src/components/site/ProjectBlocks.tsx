import type { ProjectBlock } from "@/models/Project";
import { isGalleryContent } from "@/lib/content/constants";
import GalleryStrip from "./GalleryStrip";
import { safeHref } from "@/lib/content/url";

/** Renders the admin-authored article blocks on a project's page. */
export default function ProjectBlocks({ blocks }: { blocks: ProjectBlock[] }) {
  const list = Array.isArray(blocks) ? blocks : [];
  if (list.length === 0) return null;

  return (
    <div className="flex flex-col gap-8">
      {list.map((block) => {
        const text = typeof block.content === "string" ? block.content : "";

        switch (block.type) {
          case "heading":
            return text ? (
              <h2
                key={block.id}
                className="mt-4 font-display text-[clamp(1.7rem,3.4vw,2.6rem)] uppercase leading-[0.95]"
                data-reveal
              >
                {text}
              </h2>
            ) : null;

          case "paragraph":
            return text ? (
              <p
                key={block.id}
                className="max-w-[68ch] whitespace-pre-wrap text-base leading-[1.85] text-ink-muted"
                data-reveal
              >
                {text}
              </p>
            ) : null;

          case "quote":
            return text ? (
              <blockquote
                key={block.id}
                className="max-w-[60ch] border-l-2 border-signal pl-5 text-lg italic leading-relaxed text-ink"
                data-reveal
              >
                {text}
              </blockquote>
            ) : null;

          case "link": {
            // Guarded at render as well as on write: rows saved before the
            // sanitiser existed have never been through it.
            const href = safeHref(text);
            return href ? (
              <a
                key={block.id}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                data-cursor="OPEN"
                data-reveal
                className="inline-flex w-fit items-center gap-2 break-all rounded-full border border-grid px-5 py-2.5 font-mono text-[11px] text-telemetry transition-colors hover:border-signal hover:text-signal"
              >
                {text}
                <span aria-hidden="true">&#8599;</span>
              </a>
            ) : null;
          }

          case "divider":
            return (
              <hr key={block.id} className="my-2 border-0 border-t border-grid" />
            );

          case "gallery": {
            if (!isGalleryContent(block.content)) return null;
            const { title, images, height } = block.content;
            if (images.length === 0) return null;
            return (
              <GalleryStrip key={block.id} title={title} images={images} height={height} />
            );
          }

          default:
            return null;
        }
      })}
    </div>
  );
}
