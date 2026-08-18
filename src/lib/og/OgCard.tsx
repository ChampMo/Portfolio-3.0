import type { ReactElement } from "react";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

/* The SIGNAL palette, dark variant. Social cards are pasted onto feeds of
   every colour, and the dark card holds its own against both. */
const GROUND = "#12110D";
const PANEL = "#1B1914";
const GRID = "#33301F";
const INK = "#F2EDE2";
const MUTED = "#8C8672";
const SIGNAL = "#FF8A34";
const TELEMETRY = "#5FB8C4";

/**
 * Shared artwork for every generated social card.
 *
 * Deliberately typeface-agnostic: the site's display face ships as woff2, and
 * Satori — the renderer behind `ImageResponse` — cannot read woff2 at all. So
 * the card carries its identity through layout, colour and letter-spacing
 * instead, and lets `next/og` supply the face.
 *
 * Written in Satori's subset of CSS: flex only, explicit `display: flex` on
 * anything with more than one child, and no shorthand it does not implement.
 */
export function OgCard({
  eyebrow,
  title,
  summary,
  chips = [],
  status,
  footer,
}: {
  eyebrow: string;
  title: string;
  summary?: string;
  chips?: string[];
  status?: string;
  footer: string;
}): ReactElement {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: GROUND,
        padding: "62px 70px",
        position: "relative",
      }}
    >
      {/* Grid lines, drawn as elements rather than a repeating gradient —
          Satori's gradient support does not stretch to repeating ones. */}
      {[0, 1, 2, 3].map((i) => (
        <div
          key={`v${i}`}
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 240 * (i + 1),
            width: 1,
            background: GRID,
            opacity: 0.55,
          }}
        />
      ))}
      {[0, 1].map((i) => (
        <div
          key={`h${i}`}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 210 * (i + 1),
            height: 1,
            background: GRID,
            opacity: 0.55,
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 5,
          background: SIGNAL,
        }}
      />

      <div style={{ display: "flex", flexDirection: "column", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              fontSize: 20,
              letterSpacing: 6,
              color: SIGNAL,
              textTransform: "uppercase",
            }}
          >
            {eyebrow}
          </div>
          {status ? (
            <div
              style={{
                marginLeft: 22,
                display: "flex",
                border: `1px solid ${TELEMETRY}`,
                color: TELEMETRY,
                borderRadius: 999,
                padding: "7px 18px",
                fontSize: 17,
                letterSpacing: 3,
                textTransform: "uppercase",
              }}
            >
              {status}
            </div>
          ) : null}
        </div>

        <div
          style={{
            marginTop: 28,
            fontSize: title.length > 22 ? 96 : 126,
            lineHeight: 1,
            color: INK,
            textTransform: "uppercase",
            letterSpacing: -2,
            fontWeight: 700,
          }}
        >
          {title}
        </div>

        {summary ? (
          <div
            style={{
              marginTop: 26,
              fontSize: 30,
              lineHeight: 1.45,
              color: MUTED,
              maxWidth: 880,
            }}
          >
            {summary}
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", flexDirection: "column", position: "relative" }}>
        {chips.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", marginBottom: 30 }}>
            {chips.slice(0, 6).map((c) => (
              <div
                key={c}
                style={{
                  display: "flex",
                  border: `1px solid ${GRID}`,
                  background: PANEL,
                  color: MUTED,
                  borderRadius: 999,
                  padding: "9px 20px",
                  marginRight: 12,
                  marginBottom: 12,
                  fontSize: 19,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                }}
              >
                {c}
              </div>
            ))}
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            borderTop: `1px solid ${GRID}`,
            paddingTop: 26,
            fontSize: 20,
            letterSpacing: 4,
            color: MUTED,
            textTransform: "uppercase",
          }}
        >
          <div style={{ display: "flex", color: INK }}>{footer}</div>
          <div style={{ display: "flex", marginLeft: "auto", color: SIGNAL }}>
            SIGNAL DECK
          </div>
        </div>
      </div>
    </div>
  );
}
