import { hash } from './util.js';

export const TILE = 16;
export const COLS = 20;
export const ROWS = 15;
export const W = COLS * TILE;
export const H = ROWS * TILE;

/*
 * タイル記号
 *  .  草地        ,  背の高い草    *  花           :  土の道
 *  x  焼け跡      c  畑           #  木 (壁)      ~  水 (壁)
 *  R  屋根 (壁)   H  家の壁 (壁)   D  扉 (壁)      F  柵 (壁)
 *  B  茂み (壁)   S  看板 (壁)     W  井戸 (壁)    P  石柱 (壁)
 *  G  門 (flags.gateOpen で通行可)
 */
const SOLID = new Set(['#', '~', 'R', 'H', 'D', 'F', 'B', 'S', 'W', 'P']);

export function isSolidTile(ch, flags) {
  if (ch === 'G') return !flags.gateOpen;
  return SOLID.has(ch);
}

export class Room {
  constructor(def, flags) {
    this.def = def;
    this.id = def.id;
    this.flags = flags;
    this.grid = def.tiles.map((row) => row.split(''));
    this.cache = null;
  }

  tileAt(c, r) {
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return null;
    return this.grid[r][c];
  }

  /** 画面外は「壁ではない」扱い（出口の判定は Game 側で行う） */
  solidAt(px, py) {
    const ch = this.tileAt(Math.floor(px / TILE), Math.floor(py / TILE));
    return ch !== null && isSolidTile(ch, this.flags);
  }

  rectBlocked(x, y, w, h) {
    const xs = [x, x + w / 2, x + w - 0.01];
    const ys = [y, y + h / 2, y + h - 0.01];
    for (const px of xs) for (const py of ys) if (this.solidAt(px, py)) return true;
    return false;
  }

  draw(ctx) {
    if (!this.cache) this.cache = this.render();
    ctx.drawImage(this.cache, 0, 0);
  }

  render() {
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const g = cv.getContext('2d');
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) drawTile(g, this.grid[r][c], c, r, this.flags);
    }
    return cv;
  }
}

/** 1px 刻みで動かし、壁に当たったら止める */
export function moveEntity(e, dx, dy, blocked) {
  const res = { hitX: false, hitY: false };
  const stepsX = Math.ceil(Math.abs(dx));
  for (let i = 0; i < stepsX; i++) {
    const nx = e.x + dx / stepsX;
    if (blocked(nx, e.y, e.w, e.h)) { res.hitX = true; break; }
    e.x = nx;
  }
  const stepsY = Math.ceil(Math.abs(dy));
  for (let i = 0; i < stepsY; i++) {
    const ny = e.y + dy / stepsY;
    if (blocked(e.x, ny, e.w, e.h)) { res.hitY = true; break; }
    e.y = ny;
  }
  return res;
}

// ---------------------------------------------------------------------------
// タイル描画（画像を使わずコードでドット絵風に描く）

function drawTile(g, ch, c, r, flags) {
  const x = c * TILE;
  const y = r * TILE;
  const rnd = (i) => hash(c * 7 + i * 31, r * 13 + i * 17);
  const rect = (color, dx, dy, w, h) => {
    g.fillStyle = color;
    g.fillRect(x + dx, y + dy, w, h);
  };

  const grass = (tufts = 4, tuftColor = '#4c8834') => {
    rect('#5b9a3e', 0, 0, 16, 16);
    for (let i = 0; i < tufts; i++) {
      rect(tuftColor, Math.floor(rnd(i) * 15), Math.floor(rnd(i + 9) * 14), 1, 2);
    }
  };
  const path = () => {
    rect('#c9a66b', 0, 0, 16, 16);
    for (let i = 0; i < 5; i++) rect('#b08d55', Math.floor(rnd(i) * 15), Math.floor(rnd(i + 5) * 15), 1, 1);
  };
  const wall = () => {
    rect('#dccba0', 0, 0, 16, 16);
    rect('#8a6a42', 0, 0, 16, 1);
    rect('#8a6a42', 0, 15, 16, 1);
    rect('#8a6a42', 0, 0, 1, 16);
  };

  switch (ch) {
    case '.':
      grass();
      break;
    case ',':
      grass(7, '#6aae48');
      break;
    case '*': {
      grass(2);
      const colors = ['#f0e060', '#f07090', '#ffffff'];
      for (let i = 0; i < 3; i++) {
        const fx = 2 + Math.floor(rnd(i + 20) * 11);
        const fy = 2 + Math.floor(rnd(i + 30) * 11);
        rect(colors[i], fx, fy, 2, 2);
        rect('#c8a020', fx, fy, 1, 1);
      }
      break;
    }
    case ':':
      path();
      break;
    case 'x':
      rect('#4b3b32', 0, 0, 16, 16);
      for (let i = 0; i < 4; i++) rect('#2e241e', Math.floor(rnd(i) * 12), Math.floor(rnd(i + 4) * 12), 4, 3);
      rect('#e0602a', Math.floor(rnd(9) * 15), Math.floor(rnd(10) * 15), 1, 1);
      break;
    case 'c':
      rect('#7a5434', 0, 0, 16, 16);
      for (let k = 2; k < 16; k += 5) {
        rect('#6a4628', 0, k, 16, 1);
        rect('#7ac050', 3 + (k % 3), k - 2, 1, 2);
        rect('#7ac050', 11 - (k % 3), k - 2, 1, 2);
      }
      break;
    case '#':
      grass(2);
      rect('#5a3a1e', 6, 10, 4, 6);
      rect('#2f6a2a', 1, 2, 14, 9);
      rect('#2f6a2a', 3, 0, 10, 13);
      rect('#24521f', 2, 9, 12, 2);
      rect('#3f8a36', 4, 2, 5, 3);
      break;
    case '~':
      rect('#3b6fb0', 0, 0, 16, 16);
      for (let i = 0; i < 3; i++) rect('#6a9ad8', Math.floor(rnd(i) * 12), Math.floor(rnd(i + 3) * 15), 3, 1);
      break;
    case 'R':
      rect('#a5473b', 0, 0, 16, 16);
      for (let k = 3; k < 16; k += 4) rect('#83352b', 0, k, 16, 1);
      for (let k = 0; k < 16; k += 4) rect('#83352b', (k * 3 + r * 2) % 16, k, 1, 3);
      break;
    case 'H':
      wall();
      if (rnd(1) < 0.5) {
        rect('#6a4a28', 4, 4, 8, 7);
        rect('#3a4a6a', 5, 5, 6, 5);
        rect('#ffd98a', 5, 5, 2, 2);
      }
      break;
    case 'D':
      wall();
      rect('#6b4423', 4, 3, 8, 13);
      rect('#4e3018', 4, 3, 8, 1);
      rect('#e0c060', 10, 9, 1, 1);
      break;
    case 'F':
      grass(2);
      rect('#9a7448', 0, 6, 16, 2);
      rect('#9a7448', 0, 11, 16, 2);
      rect('#7a5a34', 1, 4, 2, 11);
      rect('#7a5a34', 13, 4, 2, 11);
      break;
    case 'B':
      grass(2);
      rect('#2f7a2a', 2, 4, 12, 10);
      rect('#2f7a2a', 1, 6, 14, 6);
      rect('#4a9a3a', 4, 5, 4, 2);
      rect('#4a9a3a', 9, 8, 3, 2);
      break;
    case 'S':
      grass(2);
      rect('#6a4a28', 7, 8, 2, 8);
      rect('#6a4a28', 2, 2, 12, 8);
      rect('#b08850', 3, 3, 10, 6);
      rect('#6a4a28', 5, 5, 6, 1);
      rect('#6a4a28', 5, 7, 4, 1);
      break;
    case 'W':
      grass(2);
      rect('#6d6d75', 1, 3, 14, 12);
      rect('#8d8d95', 2, 4, 12, 10);
      rect('#1c3a6a', 4, 6, 8, 6);
      rect('#2c5a9a', 5, 7, 3, 1);
      break;
    case 'P':
      path();
      rect('#6a6a78', 2, 0, 12, 16);
      rect('#9a9aa6', 3, 0, 9, 15);
      rect('#b8b8c4', 3, 0, 9, 2);
      break;
    case 'G':
      path();
      if (!flags.gateOpen) {
        for (let k = 1; k < 16; k += 4) rect('#7a5530', k, 0, 2, 16);
        rect('#5a3a20', 0, 3, 16, 2);
        rect('#5a3a20', 0, 11, 16, 2);
      }
      break;
    default:
      grass();
  }
}
