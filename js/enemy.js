import { moveEntity, W, H } from './map.js';
import { ellipse } from './util.js';

export const ENEMY_TYPES = {
  slime: {
    name: '影スライム', w: 12, h: 10, hp: 9, speed: 34,
    aggro: 84, lungeRange: 48, tell: 0.55, lungeSpeed: 165, lungeTime: 0.32,
    recover: 0.55, cooldown: 1.2, touchDmg: 3, lungeDmg: 5, knock: 150, dropRate: 0.3,
  },
  boss: {
    name: '大影獣', w: 24, h: 20, hp: 70, speed: 30, boss: true,
    aggro: 999, lungeRange: 130, tell: 0.75, lungeSpeed: 190, lungeTime: 0.5,
    recover: 0.8, cooldown: 1.0, touchDmg: 4, lungeDmg: 8, knock: 0, dropRate: 0,
  },
};

export class Enemy {
  constructor(type, x, y, index) {
    const t = ENEMY_TYPES[type];
    this.t = t;
    this.type = type;
    this.index = index;
    this.w = t.w;
    this.h = t.h;
    this.x = x - t.w / 2;
    this.y = y - t.h / 2;
    this.hp = t.hp;
    this.maxHp = t.hp;
    this.state = 'wander';
    this.timer = Math.random();
    this.cooldown = 0.6 + Math.random();
    this.vx = 0;
    this.vy = 0;
    this.flash = 0;
    this.anim = Math.random() * 10;
    this.dead = false;
    this.enraged = false;
  }

  get phase2() {
    return this.t.boss && this.hp <= this.maxHp / 2;
  }

  update(dt, game) {
    const t = this.t;
    const p = game.player;
    const blocked = (x, y, w, h) => x < 0 || y < 0 || x + w > W || y + h > H || game.room.rectBlocked(x, y, w, h);
    this.anim += dt;
    this.flash = Math.max(0, this.flash - dt);
    this.cooldown -= dt;

    const dx = p.x + p.w / 2 - (this.x + this.w / 2);
    const dy = p.y + p.h / 2 - (this.y + this.h / 2);
    const dist = Math.hypot(dx, dy) || 1;

    if (this.phase2 && !this.enraged) {
      this.enraged = true;
      game.fx.burst(this.x + this.w / 2, this.y + this.h / 2, '#b070ff', 30, 90, 0.7);
      game.fx.shake = 5;
    }

    switch (this.state) {
      case 'wander':
        this.timer -= dt;
        if (this.timer <= 0) {
          const a = Math.floor(Math.random() * 5);
          const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [0, 0]];
          [this.vx, this.vy] = dirs[a];
          this.timer = 0.8 + Math.random() * 0.8;
        }
        moveEntity(this, this.vx * t.speed * 0.6 * dt, this.vy * t.speed * 0.6 * dt, blocked);
        if (dist < t.aggro && !p.dead) this.state = 'chase';
        break;

      case 'chase':
        moveEntity(this, (dx / dist) * t.speed * dt, (dy / dist) * t.speed * dt, blocked);
        if (dist < t.lungeRange && this.cooldown <= 0) {
          this.state = 'tell';
          this.timer = this.phase2 ? t.tell * 0.65 : t.tell;
        } else if (dist > t.aggro * 1.5) {
          this.state = 'wander';
        }
        break;

      case 'tell':
        this.timer -= dt;
        if (this.timer <= 0) {
          const speed = this.phase2 ? t.lungeSpeed * 1.2 : t.lungeSpeed;
          this.vx = (dx / dist) * speed;
          this.vy = (dy / dist) * speed;
          this.state = 'lunge';
          this.timer = t.lungeTime;
        }
        break;

      case 'lunge': {
        this.timer -= dt;
        const hit = moveEntity(this, this.vx * dt, this.vy * dt, blocked);
        if (hit.hitX || hit.hitY) {
          if (t.boss) game.fx.shake = Math.max(game.fx.shake, 3);
          this.timer = 0;
        }
        if (this.timer <= 0) {
          this.state = 'recover';
          this.timer = t.recover;
          this.cooldown = t.cooldown;
          if (this.phase2) game.spawnRing(this, 8, 75);
        }
        break;
      }

      case 'recover':
        this.timer -= dt;
        if (this.timer <= 0) this.state = 'chase';
        break;

      case 'hurt':
        this.timer -= dt;
        moveEntity(this, this.vx * dt, this.vy * dt, blocked);
        this.vx *= 0.85;
        this.vy *= 0.85;
        if (this.timer <= 0) {
          this.state = 'chase';
          this.cooldown = Math.max(this.cooldown, 0.4);
        }
        break;
    }
  }

  hit(dmg, fromX, fromY, power = 1) {
    this.hp -= dmg;
    this.flash = 0.12;
    if (this.t.boss) return; // ボスはひるまない
    const dx = this.x + this.w / 2 - fromX;
    const dy = this.y + this.h / 2 - fromY;
    const len = Math.hypot(dx, dy) || 1;
    this.vx = (dx / len) * this.t.knock * power;
    this.vy = (dy / len) * this.t.knock * power;
    this.state = 'hurt';
    this.timer = 0.18;
  }

  contactDamage() {
    if (this.state === 'hurt') return 0;
    return this.state === 'lunge' ? this.t.lungeDmg : this.t.touchDmg;
  }

  draw(ctx, time) {
    const cx = this.x + this.w / 2;
    const by = this.y + this.h;
    const boss = this.t.boss;
    const telling = this.state === 'tell';

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ellipse(ctx, cx, by, this.w / 2 + 1, boss ? 3 : 2);

    if (telling) {
      const k = 1 - this.timer / this.t.tell;
      ctx.strokeStyle = `rgba(255,80,110,${0.4 + 0.4 * Math.sin(time * 30)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, by - this.h / 2, this.w * (1.2 - k * 0.4), 0, Math.PI * 2);
      ctx.stroke();
    }

    const wobble = telling ? 1 + 0.15 * Math.sin(time * 40) : 1 + 0.06 * Math.sin(this.anim * 6);
    const rx = (this.w / 2 + 1) / Math.sqrt(wobble);
    const ry = (this.h / 2 + 2) * wobble;
    const cy = by - ry;

    if (boss) {
      ctx.fillStyle = this.enraged ? '#5a1a6a' : '#3a1a4a';
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + i * 5 - 3, cy - ry + 4);
        ctx.lineTo(cx + i * 5, cy - ry - 5 - Math.abs(i === 0 ? 2 : 0));
        ctx.lineTo(cx + i * 5 + 3, cy - ry + 4);
        ctx.fill();
      }
    }

    let body = boss ? '#24102e' : '#2a1838';
    if (this.flash > 0) body = '#ffffff';
    else if (telling && Math.floor(time * 16) % 2 === 0) body = '#ff5a7a';
    ctx.fillStyle = body;
    ellipse(ctx, cx, cy, rx, ry);
    ctx.strokeStyle = this.enraged ? '#d070ff' : '#7a4ab0';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = 'rgba(120,80,170,0.5)';
    ellipse(ctx, cx - rx * 0.35, cy - ry * 0.4, rx * 0.3, ry * 0.2);

    const eye = boss ? 3 : 2;
    ctx.fillStyle = '#ff4a4a';
    ctx.fillRect(Math.round(cx - rx * 0.45), Math.round(cy - 1), eye, eye);
    ctx.fillRect(Math.round(cx + rx * 0.45 - eye), Math.round(cy - 1), eye, eye);
  }
}
