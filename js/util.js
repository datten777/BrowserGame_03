export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function center(e) {
  return { x: e.x + e.w / 2, y: e.y + e.h / 2 };
}

export function shrink(r, n) {
  return { x: r.x + n, y: r.y + n, w: r.w - n * 2, h: r.h - n * 2 };
}

/** 座標から 0〜1 の決まった乱数を作る（タイルの模様用） */
export function hash(x, y) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function ellipse(ctx, cx, cy, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
  ctx.fill();
}
