import { W, H } from './map.js';
import { hash } from './util.js';

export const FONT = (size) =>
  `${size}px 'DotGothic16', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', 'Yu Gothic', Meiryo, sans-serif`;

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(10,12,28,0.78)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(255,225,160,0.55)';
  ctx.lineWidth = 0.6;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function shadowText(ctx, str, x, y, color) {
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillText(str, x + 0.7, y + 0.7);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

/** 指定幅で折り返す（日本語は1文字単位） */
export function wrapText(ctx, text, maxW) {
  const out = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const ch of para) {
      if (ctx.measureText(line + ch).width > maxW && line) {
        out.push(line);
        line = ch;
      } else {
        line += ch;
      }
    }
    out.push(line);
  }
  return out;
}

// ---------------------------------------------------------------------------

/** 会話ウィンドウ。lines は { s: 話者, t: 本文 } の配列（s が空ならナレーション） */
export class Dialogue {
  constructor(lines, onDone) {
    this.lines = lines.map((l) => (typeof l === 'string' ? { s: '', t: l } : l));
    this.onDone = onDone;
    this.index = 0;
    this.shown = 0;
    this.blink = 0;
    this.done = false;
  }

  get current() {
    return this.lines[this.index];
  }

  update(dt, input) {
    this.blink += dt;
    const len = this.current.t.length;
    this.shown = Math.min(len, this.shown + dt * 40);
    if (input.pressed('confirm') || input.pressed('attack')) {
      if (this.shown < len) {
        this.shown = len;
      } else {
        this.index++;
        this.shown = 0;
        if (this.index >= this.lines.length) {
          this.index = this.lines.length - 1;
          this.done = true;
        }
      }
    }
  }

  draw(ctx, narration = false) {
    const line = this.current;
    const text = line.t.slice(0, Math.floor(this.shown));
    const complete = this.shown >= line.t.length;
    ctx.textBaseline = 'top';

    if (narration) {
      ctx.font = FONT(9);
      ctx.textAlign = 'center';
      const rows = wrapText(ctx, line.t, W - 40);
      const visible = wrapText(ctx, text, W - 40);
      const top = H / 2 - (rows.length * 14) / 2;
      visible.forEach((r, i) => shadowText(ctx, r, W / 2, top + i * 14, '#e8e0ff'));
      if (complete && Math.floor(this.blink * 3) % 2 === 0) shadowText(ctx, '▼', W / 2, top + rows.length * 14 + 8, '#ffd88a');
      ctx.textAlign = 'left';
      return;
    }

    const bx = 8;
    const bh = 54;
    const by = H - bh - 6;
    const bw = W - 16;
    panel(ctx, bx, by, bw, bh);
    ctx.font = FONT(8);
    ctx.textAlign = 'left';
    if (line.s) {
      const nw = ctx.measureText(line.s).width + 12;
      panel(ctx, bx + 4, by - 11, nw, 13);
      shadowText(ctx, line.s, bx + 10, by - 9, '#ffd88a');
    }
    const rows = wrapText(ctx, text, bw - 18);
    const color = line.s ? '#ffffff' : '#c8e0ff';
    rows.slice(0, 4).forEach((r, i) => shadowText(ctx, r, bx + 9, by + 8 + i * 11, color));
    if (complete && Math.floor(this.blink * 3) % 2 === 0) {
      shadowText(ctx, '▼', bx + bw - 14, by + bh - 12, '#ffd88a');
    }
  }
}

// ---------------------------------------------------------------------------

export function drawHUD(ctx, game, objective) {
  const p = game.player;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';

  panel(ctx, 4, 4, 108, 26);
  ctx.font = FONT(8);
  shadowText(ctx, `Lv ${p.level}`, 9, 7, '#ffd88a');
  shadowText(ctx, 'リオ', 38, 7, '#ffffff');
  ctx.font = FONT(6);
  shadowText(ctx, 'HP', 9, 19, '#ffb0a0');
  const barX = 22;
  const barW = 58;
  const ratio = p.hp / p.maxHp;
  ctx.fillStyle = '#3a0d12';
  ctx.fillRect(barX, 20, barW, 5);
  ctx.fillStyle = ratio < 0.3 ? '#ff3030' : '#e8504a';
  ctx.fillRect(barX, 20, Math.round(barW * ratio), 5);
  ctx.fillStyle = 'rgba(255,190,170,0.8)';
  ctx.fillRect(barX, 20, Math.round(barW * ratio), 1);
  shadowText(ctx, `${p.hp}/${p.maxHp}`, barX + barW + 3, 19, '#ffffff');

  ctx.font = FONT(7);
  const name = game.room.def.name;
  const nw = ctx.measureText(name).width + 12;
  panel(ctx, W - 4 - nw, 4, nw, 13);
  shadowText(ctx, name, W - 4 - nw + 6, 7, '#ffffff');

  if (objective) {
    ctx.font = FONT(6);
    ctx.textAlign = 'right';
    shadowText(ctx, `▶ ${objective}`, W - 6, 20, '#d8e8ff');
    ctx.textAlign = 'left';
  }
}

export function drawBossBar(ctx, boss) {
  const w = 160;
  const x = (W - w) / 2;
  const y = H - 14;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';
  ctx.font = FONT(7);
  shadowText(ctx, boss.t.name, W / 2, y - 10, '#e0b0ff');
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(x - 1, y - 1, w + 2, 7);
  ctx.fillStyle = boss.enraged ? '#c050ff' : '#8a40c0';
  ctx.fillRect(x, y, Math.max(0, w * boss.hp / boss.maxHp), 5);
  ctx.textAlign = 'left';
}

export function drawBanner(ctx, banner) {
  const a = Math.min(1, banner.t, (2.4 - banner.t) * 3);
  ctx.globalAlpha = Math.max(0, a);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.font = FONT(14);
  const w = ctx.measureText(banner.text).width;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(W / 2 - w / 2 - 20, 46, w + 40, 22);
  ctx.fillStyle = '#ffd88a';
  ctx.fillRect(W / 2 - w / 2 - 14, 47, w + 28, 0.6);
  ctx.fillRect(W / 2 - w / 2 - 14, 67, w + 28, 0.6);
  shadowText(ctx, banner.text, W / 2, 57, '#ffffff');
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

export function drawTitle(ctx, t, isTouch = false) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#070a1e');
  grad.addColorStop(1, '#22123a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 70; i++) {
    const sx = hash(i, 1) * W;
    const sy = hash(i, 2) * H * 0.7;
    ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * (0.5 + hash(i, 3) * 2) + i));
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(sx, sy, 1, 1);
  }
  ctx.globalAlpha = 1;

  // 枯れた灯台樹のシルエット
  ctx.fillStyle = '#0c0818';
  ctx.fillRect(152, 110, 16, 100);
  const branch = (x, y, len, ang, depth) => {
    if (depth === 0) return;
    const x2 = x + Math.cos(ang) * len;
    const y2 = y + Math.sin(ang) * len;
    ctx.strokeStyle = '#0c0818';
    ctx.lineWidth = depth * 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    branch(x2, y2, len * 0.72, ang - 0.45, depth - 1);
    branch(x2, y2, len * 0.72, ang + 0.4, depth - 1);
  };
  branch(160, 115, 30, -Math.PI / 2, 5);
  ctx.fillStyle = '#0c0818';
  ctx.fillRect(0, 205, W, H - 205);

  // 種火の光
  const pulse = 0.85 + 0.15 * Math.sin(t * 3);
  const glow = ctx.createRadialGradient(160, 196, 2, 160, 196, 60 * pulse);
  glow.addColorStop(0, 'rgba(255,210,120,0.9)');
  glow.addColorStop(0.3, 'rgba(255,150,60,0.35)');
  glow.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 120, W, H - 120);
  ctx.fillStyle = '#ffe8a8';
  ctx.fillRect(158, 193, 4, 5);

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.font = FONT(26);
  shadowText(ctx, '灯火の継承者', W / 2, 52, '#ffd88a');
  ctx.font = FONT(7);
  shadowText(ctx, '― ともしびのけいしょうしゃ ―', W / 2, 76, '#c8b8e8');
  shadowText(ctx, '序章 体験版', W / 2, 88, '#8a7aa8');

  if (Math.floor(t * 2) % 2 === 0) {
    ctx.font = FONT(9);
    shadowText(ctx, isTouch ? 'タップでスタート' : 'Enter／タップ でスタート', W / 2, 160, '#ffffff');
  }
  ctx.font = FONT(6);
  const help = isTouch
    ? '移動：左のパッド　攻撃・話す：攻撃ボタン　回避：回避ボタン'
    : '移動：WASD／矢印　攻撃・話す・決定：J／Z／Space　回避：L／X／Shift';
  shadowText(ctx, help, W / 2, 226, '#a8a0c0');
  ctx.textAlign = 'left';
}

export function drawGameOver(ctx, t) {
  ctx.fillStyle = `rgba(30,0,8,${Math.min(0.75, t)})`;
  ctx.fillRect(0, 0, W, H);
  if (t < 0.4) return;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.font = FONT(18);
  shadowText(ctx, '力尽きた……', W / 2, H / 2 - 14, '#ff8a8a');
  if (t > 0.8 && Math.floor(t * 2) % 2 === 0) {
    ctx.font = FONT(8);
    shadowText(ctx, 'Enter／タップ で再挑戦', W / 2, H / 2 + 16, '#ffffff');
  }
  ctx.textAlign = 'left';
}

export function drawEnding(ctx, t, lines) {
  ctx.fillStyle = '#05060c';
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  lines.forEach((line, i) => {
    const a = Math.max(0, Math.min(1, t - i * 1.2));
    if (a <= 0) return;
    ctx.globalAlpha = a;
    ctx.font = FONT(i === 0 ? 14 : 8);
    shadowText(ctx, line, W / 2, 60 + i * 30 + (i > 0 ? 10 : 0), i === 0 ? '#ffd88a' : '#e8e0ff');
  });
  ctx.globalAlpha = 1;
  if (t > lines.length * 1.2 + 0.5 && Math.floor(t * 2) % 2 === 0) {
    ctx.font = FONT(7);
    shadowText(ctx, 'Enter／タップ でタイトルへ', W / 2, 212, '#a8a0c0');
  }
  ctx.textAlign = 'left';
}
