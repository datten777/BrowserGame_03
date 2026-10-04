import { FONT } from './ui.js';

/** パーティクル・ダメージ数字・画面揺れ */
export class Effects {
  constructor() {
    this.parts = [];
    this.texts = [];
    this.shake = 0;
  }

  clear() {
    this.parts.length = 0;
    this.texts.length = 0;
    this.shake = 0;
  }

  burst(x, y, color, n = 12, speed = 60, life = 0.5) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.8);
      const l = life * (0.6 + Math.random() * 0.6);
      this.parts.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: l, max: l, color, size: 1 + Math.floor(Math.random() * 2), drag: true,
      });
    }
  }

  spark(x, y) {
    this.burst(x, y, '#fff6c0', 6, 90, 0.2);
  }

  dust(x, y) {
    this.burst(x, y, 'rgba(230,220,190,0.8)', 5, 25, 0.35);
  }

  ember(x, y) {
    const l = 2 + Math.random() * 1.5;
    this.parts.push({
      x, y, vx: (Math.random() - 0.5) * 12, vy: -12 - Math.random() * 18,
      life: l, max: l, color: Math.random() < 0.5 ? '#ff8a3a' : '#ffcf5a', size: 1, drag: false,
    });
  }

  text(x, y, str, color = '#fff') {
    this.texts.push({ x, y, str, color, life: 0.75 });
  }

  update(dt) {
    const drag = Math.pow(0.02, dt);
    for (const p of this.parts) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.drag) {
        p.vx *= drag;
        p.vy *= drag;
      }
      p.life -= dt;
    }
    this.parts = this.parts.filter((p) => p.life > 0);
    for (const t of this.texts) {
      t.y -= 22 * dt;
      t.life -= dt;
    }
    this.texts = this.texts.filter((t) => t.life > 0);
    this.shake = Math.max(0, this.shake - dt * 20);
  }

  draw(ctx) {
    for (const p of this.parts) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    ctx.font = FONT(7);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    for (const t of this.texts) {
      ctx.globalAlpha = Math.min(1, t.life * 3);
      ctx.strokeText(t.str, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.str, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }
}
