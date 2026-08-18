/**
 * Shard dissolve between two images, on raw WebGL.
 *
 * The frame is shattered into irregular low-poly triangles — no two the same
 * shape — and each one flips from the old image to the new one on its own
 * beat, scattered rather than swept. A triangle outlines itself in the signal
 * colour while it is turning, so the shatter pattern is visible only during
 * the change. Flips are `step`, never a fade: the point is hard edges, not a
 * blur. The tessellation is reseeded every transition, so the same pair of
 * images never breaks apart the same way twice.
 *
 * Written against the WebGL context directly instead of pulling in a 3D
 * library: this is one full-screen quad and one fragment shader, and the whole
 * point of the rebuild was to stop shipping a scene graph to render flat art.
 *
 * Every entry point fails soft. No context, a texture that will not load, a
 * shader that will not compile — the factory returns null and the caller keeps
 * its plain `<img>` stack.
 */

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `
precision highp float;
varying vec2 vUv;

uniform sampler2D uA;
uniform sampler2D uB;
uniform float uProgress;
uniform float uSlide;
uniform float uSeed;
uniform vec2 uGrid;
uniform vec3 uEdge;
uniform vec2 uScaleA;
uniform vec2 uScaleB;

/* How much of the run is spent staggering shards rather than flipping them
   together. Raised well above 1 so only a thin band of the frame is mid-flip
   at any moment — outlining every shard at once was what made the effect read
   as clutter rather than as a change passing through. */
const float SPREAD = 0.78;

/* Outline thickness, in lattice units. Hairline on purpose. */
const float LINE = 0.045;

/* How far a site may wander inside its cell. Near 1.0 the lattice stops being
   readable as a grid at all, which is the entire point. */
const float JITTER = 0.95;

float hash1(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

vec2 hash2(vec2 p) {
  return fract(
    sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453
  );
}

/* One scattered point per grid cell. */
vec2 site(vec2 c) {
  return c + 0.5 + (hash2(c + uSeed) - 0.5) * JITTER;
}

/* Emulates object-fit: cover — the quad is the frame's aspect, the texture is
   its own, and the difference is folded into the UV scale by the caller. */
vec2 cover(vec2 uv, vec2 s) {
  return (uv - 0.5) * s + 0.5;
}

void main() {
  /* Irregular triangulation without a mesh.
   *
   * Scatter one point per cell, then ask which three are nearest to this
   * pixel. Every pixel sharing the same three nearest points forms one
   * triangle — the Delaunay dual of the Voronoi diagram — so the shapes come
   * out uneven and low-poly rather than as a repeating tile. Naming a triangle
   * by its three points (in any order) gives it a stable identity to key the
   * flip timing on.
   *
   * A triangle ends exactly where the third and fourth nearest points swap
   * places, so d4 minus d3 is the distance to the nearest edge — which is what
   * draws the outline. (No backticks in here: the shader lives inside a JS
   * template literal.) */
  vec2 p = vUv * uGrid;
  vec2 base = floor(p);

  float d1 = 8.0, d2 = 8.0, d3 = 8.0, d4 = 8.0;
  vec2 s1 = vec2(0.0), s2 = vec2(0.0), s3 = vec2(0.0);

  for (int y = -2; y <= 2; y++) {
    for (int x = -2; x <= 2; x++) {
      vec2 c = base + vec2(float(x), float(y));
      float d = distance(p, site(c));

      if (d < d1) {
        d4 = d3; d3 = d2; d2 = d1; d1 = d;
        s3 = s2; s2 = s1; s1 = c;
      } else if (d < d2) {
        d4 = d3; d3 = d2; d2 = d;
        s3 = s2; s2 = c;
      } else if (d < d3) {
        d4 = d3; d3 = d;
        s3 = c;
      } else if (d < d4) {
        d4 = d;
      }
    }
  }

  /* Summed, so the identity does not depend on which point came first. */
  float r = fract(hash1(s1) + hash1(s2) + hash1(s3));
  float edgeDist = d4 - d3;

  /* Mostly scattered, with only a trace of direction so the change still has
     somewhere to travel instead of boiling in place. */
  float sweep = vUv.x * 0.6 + (1.0 - vUv.y) * 0.4;
  float delay = mix(sweep, r, 0.78);

  float local = clamp(uProgress * (1.0 + SPREAD) - delay * SPREAD, 0.0, 1.0);
  float on = step(0.5, local);

  /* The arriving shard slides a hair into place — straight lines only. */
  vec2 dir = vec2(r - 0.5, fract(r * 7.31) - 0.5) * 2.0;
  vec2 nudge = dir * uSlide * (1.0 - local);

  vec4 a = texture2D(uA, clamp(cover(vUv, uScaleA), 0.0, 1.0));
  vec4 b = texture2D(uB, clamp(cover(vUv + nudge, uScaleB), 0.0, 1.0));
  vec4 col = mix(a, b, on);

  /* Outlined only in the instant either side of its own flip — not for the
     whole run. Combined with the wide SPREAD this means a narrow diagonal band
     of shards is lit at a time, and the still image is never touched. */
  float active = smoothstep(0.3, 0.5, local) * (1.0 - smoothstep(0.5, 0.74, local));
  float outline = 1.0 - smoothstep(0.0, LINE, edgeDist);
  col.rgb = mix(col.rgb, uEdge, clamp(outline * active, 0.0, 1.0) * 0.9);

  gl_FragColor = col;
}`;

type Slot = { tex: WebGLTexture; w: number; h: number };

/**
 * Newest instance per canvas.
 *
 * `getContext` hands back the *same* context object every time it is called on
 * one canvas, so two overlapping instances — which React's development
 * double-mount guarantees — end up sharing one GL state machine. The older one
 * must not paint over, or tear down, what the newer one set up.
 */
const generation = new WeakMap<HTMLCanvasElement, number>();

export type DisplaceFade = {
  /** Paints one image with no transition. */
  show(index: number): void;
  /** Melts `from` into `to`. Resolves when the animation settles. */
  transition(from: number, to: number, ms: number): void;
  resize(): void;
  dispose(): void;
};

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Required before the pixels may be uploaded as a texture. If the host
    // does not answer with CORS headers the load fails and we fall back.
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`image failed: ${url}`));
    img.src = url;
  });
}

/** Average spacing between scattered points, in CSS pixels — roughly the size
 *  a triangle comes out. Large: a few big shards read as deliberate, where
 *  many small ones read as noise. */
const CELL_PX = 118;

/** "#ff8a34" or "#f83" to normalised rgb. Anything else falls back to orange. */
function parseHex(input: string): [number, number, number] {
  const hex = input.trim().replace("#", "");
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;
  if (!/^[0-9a-f]{6}$/i.test(full)) return [1, 0.54, 0.2];
  return [
    parseInt(full.slice(0, 2), 16) / 255,
    parseInt(full.slice(2, 4), 16) / 255,
    parseInt(full.slice(4, 6), 16) / 255,
  ];
}

export async function createDisplaceFade(
  canvas: HTMLCanvasElement,
  urls: string[],
  /** Flash colour for a cell as it turns. Pass the theme's signal colour. */
  edgeColor = "#ff8a34"
): Promise<DisplaceFade | null> {
  if (urls.length === 0) return null;

  const edge = parseHex(edgeColor);

  const myGen = (generation.get(canvas) ?? 0) + 1;
  generation.set(canvas, myGen);
  const isCurrent = () => generation.get(canvas) === myGen;

  const gl = (canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    premultipliedAlpha: false,
  }) ?? null) as WebGLRenderingContext | null;
  if (!gl) return null;

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;

  const prog = gl.createProgram();
  if (!prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW
  );
  const aPos = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const u = {
    a: gl.getUniformLocation(prog, "uA"),
    b: gl.getUniformLocation(prog, "uB"),
    progress: gl.getUniformLocation(prog, "uProgress"),
    slide: gl.getUniformLocation(prog, "uSlide"),
    seed: gl.getUniformLocation(prog, "uSeed"),
    grid: gl.getUniformLocation(prog, "uGrid"),
    edge: gl.getUniformLocation(prog, "uEdge"),
    scaleA: gl.getUniformLocation(prog, "uScaleA"),
    scaleB: gl.getUniformLocation(prog, "uScaleB"),
  };

  let images: HTMLImageElement[];
  try {
    images = await Promise.all(urls.map(loadImage));
  } catch {
    return null;
  }

  const slots: Slot[] = images.map((img) => {
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    // No mipmaps and clamped wrapping, so non-power-of-two uploads are legal
    // on WebGL 1 — which every real photograph is.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    return { tex, w: img.naturalWidth || 1, h: img.naturalHeight || 1 };
  });

  let raf = 0;
  let disposed = false;

  /* The point lattice must be isotropic or the triangles come out stretched,
     so the row count is derived from the frame's aspect rather than fixed. */
  function gridFor(): [number, number] {
    const w = Math.max(1, canvas.clientWidth);
    const h = Math.max(1, canvas.clientHeight);
    const cols = Math.min(26, Math.max(6, Math.round(w / CELL_PX)));
    const rows = Math.min(26, Math.max(4, Math.round((cols * h) / w)));
    return [cols, rows];
  }

  function coverScale(slot: Slot): [number, number] {
    const frame = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    const image = slot.w / slot.h;
    // Scale the axis that has slack, which crops it rather than letterboxing.
    return image > frame ? [frame / image, 1] : [1, image / frame];
  }

  function draw(from: number, to: number, progress: number, seed: number) {
    if (disposed || !isCurrent()) return;
    if (canvas.width < 2 || canvas.height < 2) return;

    const A = slots[from] ?? slots[0];
    const B = slots[to] ?? slots[0];

    // Program, buffer and attribute are rebound on every draw rather than once
    // at setup: they are context-wide state, and anything else sharing this
    // context could have moved them since.
    gl!.useProgram(prog);
    gl!.bindBuffer(gl!.ARRAY_BUFFER, buf);
    gl!.enableVertexAttribArray(aPos);
    gl!.vertexAttribPointer(aPos, 2, gl!.FLOAT, false, 0, 0);

    gl!.viewport(0, 0, canvas.width, canvas.height);
    gl!.clearColor(0, 0, 0, 0);
    gl!.clear(gl!.COLOR_BUFFER_BIT);
    gl!.activeTexture(gl!.TEXTURE0);
    gl!.bindTexture(gl!.TEXTURE_2D, A.tex);
    gl!.uniform1i(u.a, 0);
    gl!.activeTexture(gl!.TEXTURE1);
    gl!.bindTexture(gl!.TEXTURE_2D, B.tex);
    gl!.uniform1i(u.b, 1);

    const sa = coverScale(A);
    const sb = coverScale(B);
    gl!.uniform2f(u.scaleA, sa[0], sa[1]);
    gl!.uniform2f(u.scaleB, sb[0], sb[1]);
    const [cols, rows] = gridFor();
    gl!.uniform2f(u.grid, cols, rows);
    gl!.uniform3f(u.edge, edge[0], edge[1], edge[2]);
    gl!.uniform1f(u.progress, progress);
    gl!.uniform1f(u.slide, 0.035);
    gl!.uniform1f(u.seed, seed);

    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
  }

  function resize(): boolean {
    if (disposed) return false;
    // Capped at 2× so a high-DPI phone does not render four times the pixels
    // for an effect measured in ripples.
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    // False while the element still has no box — the caller retries.
    return w > 1 && h > 1;
  }

  let last = 0;
  resize();
  draw(0, 0, 0, 0);

  return {
    show(index: number) {
      last = index;
      // The canvas can still be unmeasured on the frame the textures land —
      // a 1×1 viewport would paint nothing and never repaint itself.
      const paint = () => {
        if (disposed || !isCurrent()) return;
        if (!resize()) {
          requestAnimationFrame(paint);
          return;
        }
        draw(index, index, 0, 0);
      };
      paint();
    },

    transition(from: number, to: number, ms: number) {
      if (disposed || !isCurrent()) return;
      cancelAnimationFrame(raf);
      resize();
      last = to;
      const seed = Math.random() * 10;
      const start = performance.now();

      const step = (now: number) => {
        const t = Math.min(1, (now - start) / ms);
        draw(from, to, t, seed);
        if (t < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    },

    resize() {
      resize();
      draw(last, last, 0, 0);
    },

    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      // Only this instance's own objects. Never `WEBGL_lose_context` — the
      // context belongs to the canvas, not to this instance, and destroying it
      // here killed the newer instance that had already taken over. That is
      // what left the frame blank: a live but contextless canvas showing the
      // panel colour straight through.
      for (const s of slots) gl.deleteTexture(s.tex);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    },
  };
}
