import { moveEntity } from './map.js';
import { DIRS } from './util.js';
import { drawPerson, drawLantern, LOOKS } from './sprites.js';

const SPEED = 78;
const ROLL_SPEED = 175;
const ROLL_TIME = 0.28;
const ROLL_COOLDOWN = 0.4;
const ATTACK_TIME = 0.24;
const FINISHER_TIME = 0.32;
const COMBO_WINDOW = 0.28;
const ACTIVE_FROM = 0.03;
const ACTIVE_TO = 0.16;

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 10;
    this.h = 10;
    this.dir = 'down';
    this.level = 1;
    this.maxHp = 30;
    this.hp = 30;
    this.atk = 3;
    this.state = 'idle';
    this.timer = 0;
    this.attackTotal = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.queued = false;
    this.invuln = 0;
    this.rollCooldown = 0;
    this.vx = 0;
    this.vy = 0;
    this.walkAnim = 0;
    this.hitSet = new Set();
    this.dead = false;
  }

  reset() {
    this.state = 'idle';
    this.timer = 0;
    this.combo = 0;
    this.queued = false;
  }

  update(dt, game) {
    const input = game.input;
    const blocked = (x, y, w, h) => game.blocked(x, y, w, h);
    this.invuln = Math.max(0, this.invuln - dt);
    this.rollCooldown = Math.max(0, this.rollCooldown - dt);
    this.comboTimer -= dt;

    let mx = (input.down('right') ? 1 : 0) - (input.down('left') ? 1 : 0);
    let my = (input.down('down') ? 1 : 0) - (input.down('up') ? 1 : 0);
    if (mx && my) {
      mx *= Math.SQRT1_2;
      my *= Math.SQRT1_2;
    }

    switch (this.state) {
      case 'idle':
      case 'walk':
        if (input.pressed('attack')) {
          if (game.tryTalk()) return;
          this.faceInput(mx, my);
          this.startAttack(false);
          break;
        }
        if (input.pressed('dodge') && this.rollCooldown <= 0) {
          this.startRoll(mx, my, game);
          break;
        }
        if (mx || my) {
          this.faceInput(mx, my);
          moveEntity(this, mx * SPEED * dt, my * SPEED * dt, blocked);
          this.state = 'walk';
          this.walkAnim += dt;
        } else {
          this.state = 'idle';
          this.walkAnim = 0;
        }
        break;

      case 'attack': {
        this.timer -= dt;
        if (input.pressed('attack')) this.queued = true;
        const elapsed = this.attackTotal - this.timer;
        if (elapsed < 0.08) {
          const d = DIRS[this.dir];
          moveEntity(this, d.x * 40 * dt, d.y * 40 * dt, blocked);
        }
        if (input.pressed('dodge') && this.rollCooldown <= 0 && elapsed > ACTIVE_TO) {
          this.startRoll(mx, my, game);
          break;
        }
        if (this.timer <= 0) {
          if (this.queued && this.combo < 3) {
            this.faceInput(mx, my);
            this.startAttack(true);
          } else {
            this.state = 'idle';
            this.comboTimer = this.combo < 3 ? COMBO_WINDOW : 0;
          }
        }
        break;
      }

      case 'roll':
        this.timer -= dt;
        moveEntity(this, this.vx * dt, this.vy * dt, blocked);
        if (this.timer <= 0) this.state = 'idle';
        break;

      case 'hurt':
        this.timer -= dt;
        moveEntity(this, this.vx * dt, this.vy * dt, blocked);
        this.vx *= 0.85;
        this.vy *= 0.85;
        if (this.timer <= 0) this.state = 'idle';
        break;
    }
  }

  faceInput(mx, my) {
    if (!mx && !my) return;
    if (Math.abs(mx) > Math.abs(my)) this.dir = mx > 0 ? 'right' : 'left';
    else if (Math.abs(my) > Math.abs(mx)) this.dir = my > 0 ? 'down' : 'up';
    else {
      const keep = (this.dir === 'right' && mx > 0) || (this.dir === 'left' && mx < 0)
        || (this.dir === 'down' && my > 0) || (this.dir === 'up' && my < 0);
      if (!keep) this.dir = my > 0 ? 'down' : 'up';
    }
  }

  startAttack(chained) {
    if (chained) this.combo += 1;
    else this.combo = this.comboTimer > 0 && this.combo < 3 ? this.combo + 1 : 1;
    this.state = 'attack';
    this.attackTotal = this.combo === 3 ? FINISHER_TIME : ATTACK_TIME;
    this.timer = this.attackTotal;
    this.queued = false;
    this.hitSet.clear();
  }

  startRoll(mx, my, game) {
    if (!mx && !my) {
      mx = DIRS[this.dir].x;
      my = DIRS[this.dir].y;
    } else {
      this.faceInput(mx, my);
    }
    this.state = 'roll';
    this.timer = ROLL_TIME;
    this.rollCooldown = ROLL_TIME + ROLL_COOLDOWN;
    this.vx = mx * ROLL_SPEED;
    this.vy = my * ROLL_SPEED;
    this.combo = 0;
    game.fx.dust(this.x + this.w / 2, this.y + this.h);
  }

  /** 正面の当たり判定 */
  frontBox(reach, width) {
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;
    switch (this.dir) {
      case 'right': return { x: this.x + this.w - 2, y: cy - width / 2, w: reach, h: width };
      case 'left': return { x: this.x + 2 - reach, y: cy - width / 2, w: reach, h: width };
      case 'up': return { x: cx - width / 2, y: this.y - 2 - reach, w: width, h: reach + 4 };
      default: return { x: cx - width / 2, y: this.y + this.h - 2, w: width, h: reach };
    }
  }

  attackBox() {
    if (this.state !== 'attack') return null;
    const elapsed = this.attackTotal - this.timer;
    if (elapsed < ACTIVE_FROM || elapsed > ACTIVE_TO) return null;
    return this.combo === 3 ? this.frontBox(20, 26) : this.frontBox(16, 20);
  }

  attackDamage() {
    return this.combo === 3 ? this.atk * 2 : this.atk;
  }

  get invulnerable() {
    return this.invuln > 0 || this.state === 'roll' || this.dead;
  }

  /** ダメージを受けたら true */
  hurt(dmg, fromX, fromY) {
    if (this.invulnerable) return false;
    this.hp = Math.max(0, this.hp - dmg);
    this.invuln = 1.0;
    this.state = 'hurt';
    this.timer = 0.2;
    this.combo = 0;
    const dx = this.x + this.w / 2 - fromX;
    const dy = this.y + this.h / 2 - fromY;
    const len = Math.hypot(dx, dy) || 1;
    this.vx = (dx / len) * 150;
    this.vy = (dy / len) * 150;
    if (this.hp <= 0) this.dead = true;
    return true;
  }

  draw(ctx, game) {
    const blink = this.invuln > 0 && this.state !== 'roll' && Math.floor(this.invuln * 20) % 2 === 0;
    if (blink) return;
    const sx = this.x - 3;
    const sy = this.y - 8;
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;

    if (this.state === 'roll') {
      const p = 1 - this.timer / ROLL_TIME;
      const sign = this.vx < 0 || (this.vx === 0 && this.vy < 0) ? -1 : 1;
      ctx.save();
      ctx.translate(Math.round(cx), Math.round(cy - 2));
      ctx.rotate(p * Math.PI * 2 * sign);
      ctx.fillStyle = LOOKS.rio.body;
      ctx.fillRect(-6, -5, 12, 10);
      ctx.fillStyle = LOOKS.rio.hair;
      ctx.fillRect(-5, -6, 10, 5);
      ctx.fillStyle = LOOKS.rio.skin;
      ctx.fillRect(-2, 2, 4, 3);
      ctx.restore();
      return;
    }

    const swordBehind = this.state === 'attack' && this.dir === 'up';
    if (swordBehind) this.drawSword(ctx, cx, cy);
    drawPerson(ctx, sx, sy, this.dir, LOOKS.rio, this.state === 'walk' ? this.walkAnim : 0);
    if (game.flags.lantern && this.dir !== 'up') {
      const lx = this.dir === 'left' ? sx + 12 : sx;
      drawLantern(ctx, lx, sy + 10, game.time);
    }
    if (this.state === 'attack' && !swordBehind) this.drawSword(ctx, cx, cy);
  }

  drawSword(ctx, cx, cy) {
    const base = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[this.dir];
    const elapsed = this.attackTotal - this.timer;
    const p = Math.min(1, elapsed / 0.14);
    const sweep = this.combo === 3 ? 2.6 : 1.8;
    const sign = this.combo === 2 ? -1 : 1;
    const from = base - (sweep / 2) * sign;
    const angle = from + sweep * p * sign;
    const reach = this.combo === 3 ? 20 : 16;

    ctx.save();
    ctx.translate(cx, cy - 2);
    if (p < 1) {
      ctx.strokeStyle = `rgba(255,255,240,${0.55 * (1 - p * 0.5)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (sign > 0) ctx.arc(0, 0, reach - 3, from, angle);
      else ctx.arc(0, 0, reach - 3, angle, from);
      ctx.stroke();
    }
    ctx.rotate(angle);
    ctx.fillStyle = '#c89a40';
    ctx.fillRect(2, -2, 2, 4);
    ctx.fillStyle = '#e8eef8';
    ctx.fillRect(4, -1, reach - 5, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(reach - 2, -0.5, 2, 1);
    ctx.restore();
  }
}
