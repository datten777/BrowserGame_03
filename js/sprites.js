import { ellipse } from './util.js';

export const LOOKS = {
  rio: { hair: '#6b3e1e', skin: '#f2c7a0', body: '#3f8f4f', belt: '#7a5a2a', legs: '#4a3a2a' },
  elder: { hair: '#d8d8d8', skin: '#e8b890', body: '#6a4a8a', belt: '#4a3060', legs: '#3a3040' },
  child: { hair: '#2a1a10', skin: '#f5cfa8', body: '#d8a040', belt: '#8a6020', legs: '#5a4030' },
  farmer: { hair: '#c8a040', skin: '#d8a070', body: '#a07040', belt: '#5a3a1a', legs: '#4a3a2a' },
  guard: { hair: '#2a2a2a', skin: '#e0b088', body: '#5a6a8a', belt: '#c0c0c8', legs: '#3a4050' },
  master: { hair: '#c0c0c0', skin: '#e0b090', body: '#7a3a2a', belt: '#3a2010', legs: '#3a3030' },
};

/** 人物を描く。(x, y) は 16x18 の絵の左上。 */
export function drawPerson(ctx, x, y, dir, look, anim = 0) {
  x = Math.round(x);
  y = Math.round(y);
  const step = anim > 0 ? Math.floor(anim * 8) % 2 : -1;
  const r = (color, dx, dy, w, h) => {
    ctx.fillStyle = color;
    ctx.fillRect(x + dx, y + dy, w, h);
  };

  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ellipse(ctx, x + 8, y + 17, 6, 2);

  r(look.legs, 4, 14, 3, step === 0 ? 3 : 4);
  r(look.legs, 9, 14, 3, step === 1 ? 3 : 4);
  r(look.body, 3, 8, 10, 6);
  r(look.belt, 3, 12, 10, 1);
  r(look.skin, 2, 9, 1, 3);
  r(look.skin, 13, 9, 1, 3);

  if (dir === 'up') {
    r(look.hair, 3, 0, 10, 8);
  } else {
    r(look.skin, 4, 3, 8, 5);
    r(look.hair, 3, 0, 10, 3);
    r(look.hair, 3, 3, 1, 3);
    r(look.hair, 12, 3, 1, 3);
    if (dir === 'left') r(look.hair, 10, 3, 3, 4);
    if (dir === 'right') r(look.hair, 3, 3, 3, 4);
    const eye = '#222';
    if (dir === 'down') {
      r(eye, 6, 5, 1, 2);
      r(eye, 9, 5, 1, 2);
    } else if (dir === 'left') {
      r(eye, 5, 5, 1, 2);
    } else {
      r(eye, 10, 5, 1, 2);
    }
  }
}

/** 倒れている人物（師匠） */
export function drawLying(ctx, x, y, look) {
  x = Math.round(x);
  y = Math.round(y);
  const r = (color, dx, dy, w, h) => {
    ctx.fillStyle = color;
    ctx.fillRect(x + dx, y + dy, w, h);
  };
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ellipse(ctx, x + 8, y + 16, 10, 2);
  r(look.legs, 12, 11, 6, 4);
  r(look.body, 3, 10, 10, 6);
  r(look.belt, 9, 10, 1, 6);
  r(look.skin, -3, 10, 6, 5);
  r(look.hair, -4, 9, 3, 7);
  r('#222', 0, 11, 2, 1);
  r('#b02020', 5, 12, 2, 2);
}

/** 拾える回復ハート */
export function drawHeart(ctx, x, y) {
  const rows = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
  x = Math.round(x);
  y = Math.round(y);
  ctx.fillStyle = '#e8384a';
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) if (row[i] === 'X') ctx.fillRect(x + i, y + j, 1, 1);
  });
  ctx.fillStyle = '#ffb0b8';
  ctx.fillRect(x + 1, y + 1, 1, 1);
}

/** 種火のランタン */
export function drawLantern(ctx, x, y, t) {
  x = Math.round(x);
  y = Math.round(y);
  ctx.fillStyle = '#5a3a1e';
  ctx.fillRect(x + 1, y - 2, 2, 1);
  ctx.fillRect(x, y - 1, 4, 1);
  ctx.fillStyle = Math.sin(t * 12) > 0 ? '#ffd86a' : '#ffb83a';
  ctx.fillRect(x, y, 4, 4);
  ctx.fillStyle = '#5a3a1e';
  ctx.fillRect(x, y + 4, 4, 1);
}
