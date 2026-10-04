import { Input } from './input.js';
import { Room, TILE, W, H } from './map.js';
import { Player } from './player.js';
import { Enemy } from './enemy.js';
import { Effects } from './effects.js';
import {
  Dialogue, FONT, drawHUD, drawBossBar, drawBanner, drawTitle, drawGameOver, drawEnding,
} from './ui.js';
import { drawPerson, drawLying, drawHeart, LOOKS } from './sprites.js';
import { overlap, center, shrink, clamp } from './util.js';
import { ROOMS, START, objective } from '../data/maps/prologue.js';
import { STORY } from '../data/story.js';

const SCALE = 3;
const FADE = 0.22;

const canvas = document.getElementById('game');
canvas.width = W * SCALE;
canvas.height = H * SCALE;
const ctx = canvas.getContext('2d');
document.fonts?.load(FONT(16));

class Game {
  constructor() {
    this.input = new Input(canvas);
    this.fx = new Effects();
    this.state = 'title';
    this.time = 0;
    this.stateTime = 0;
    this.hitstop = 0;
    this.dialogue = null;
    this.transition = null;
    this.banner = null;
  }

  setState(state) {
    this.state = state;
    this.stateTime = 0;
  }

  // ---- 進行 ---------------------------------------------------------------

  newGame() {
    this.flags = {};
    this.defeated = {};
    this.player = new Player(START.x, START.y);
    this.loadRoom(START.room, START.x, START.y);
    this.fx.clear();
    this.setState('intro');
    this.say(STORY.intro, () => {
      this.setState('play');
      this.enterRoom();
    });
  }

  say(lines, onDone) {
    this.dialogue = new Dialogue(lines, onDone);
  }

  loadRoom(id, x, y) {
    const def = ROOMS[id];
    this.room = new Room(def, this.flags);
    const p = this.player;
    p.x = x;
    p.y = y;
    p.reset();
    const defeated = this.defeated[id] || new Set();
    this.enemies = (def.enemies || [])
      .map((e, i) => (defeated.has(i) ? null : new Enemy(e.type, e.c * TILE + TILE / 2, e.r * TILE + TILE / 2, i)))
      .filter(Boolean);
    this.npcs = (def.npcs || []).map((n) => ({
      ...n, x: n.c * TILE + 3, y: n.r * TILE + 4, w: 10, h: 10, dir: n.dir || 'down',
    }));
    this.projectiles = [];
    this.pickups = [];
    this.lastEntry = { id, x, y };
  }

  enterRoom() {
    const def = this.room.def;
    const key = `visited_${def.id}`;
    if (!this.flags[key]) {
      this.flags[key] = true;
      this.banner = { text: def.name, t: 2.4 };
    }
    def.onEnter?.(this);
  }

  respawn() {
    const p = this.player;
    p.hp = p.maxHp;
    p.dead = false;
    p.invuln = 1;
    const e = this.lastEntry;
    this.loadRoom(e.id, e.x, e.y);
    this.fx.clear();
    this.setState('play');
  }

  /** プレイヤー用の当たり判定（地形＋NPC） */
  blocked(x, y, w, h) {
    if (this.room.rectBlocked(x, y, w, h)) return true;
    const r = { x, y, w, h };
    return this.npcs.some((n) => overlap(r, n));
  }

  /** 正面の NPC・看板に話しかける */
  tryTalk() {
    const p = this.player;
    const box = p.frontBox(10, 12);
    for (const n of this.npcs) {
      if (!overlap(box, n)) continue;
      if (!n.lying) {
        const d = { up: 'down', down: 'up', left: 'right', right: 'left' };
        n.dir = d[p.dir];
      }
      const lines = typeof n.lines === 'function' ? n.lines(this.flags) : n.lines;
      this.say(lines);
      return true;
    }
    const c = center(box);
    const col = Math.floor(c.x / TILE);
    const row = Math.floor(c.y / TILE);
    if (this.room.tileAt(col, row) === 'S') {
      const sign = (this.room.def.signs || []).find((s) => s.c === col && s.r === row);
      if (sign) {
        this.say(sign.lines);
        return true;
      }
    }
    return false;
  }

  spawnRing(src, n, speed) {
    const c = center(src);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      this.projectiles.push({ x: c.x, y: c.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 3, dmg: 4 });
    }
  }

  // ---- 更新 ---------------------------------------------------------------

  update(dt) {
    this.time += dt;
    this.stateTime += dt;
    this.fx.update(dt);
    if (this.banner) {
      this.banner.t -= dt;
      if (this.banner.t <= 0) this.banner = null;
    }
    const confirm = this.input.pressed('confirm');

    switch (this.state) {
      case 'title':
        if (confirm) this.newGame();
        break;
      case 'intro':
        this.updateDialogue(dt);
        break;
      case 'play':
        this.updatePlay(dt);
        break;
      case 'gameover':
        if (this.stateTime > 0.8 && confirm) this.respawn();
        break;
      case 'ending':
        if (this.stateTime > STORY.ending.length * 1.2 + 0.5 && confirm) this.setState('title');
        break;
    }
  }

  updateDialogue(dt) {
    this.dialogue.update(dt, this.input);
    if (this.dialogue.done) {
      const cb = this.dialogue.onDone;
      this.dialogue = null;
      cb?.();
    }
  }

  updatePlay(dt) {
    if (this.transition) return this.updateTransition(dt);
    if (this.dialogue) return this.updateDialogue(dt);
    if (this.hitstop > 0) {
      this.hitstop -= dt;
      return;
    }

    const p = this.player;
    p.update(dt, this);
    if (this.dialogue) return;

    for (const e of this.enemies) e.update(dt, this);
    this.updateProjectiles(dt);
    this.resolveCombat();
    this.updatePickups(dt);

    if (this.room.def.embers && Math.random() < dt * 5) {
      this.fx.ember(Math.random() * W, H - Math.random() * 40);
    }

    if (p.dead) {
      this.fx.burst(p.x + p.w / 2, p.y + p.h / 2, '#ff6a6a', 20, 60, 0.8);
      this.setState('gameover');
      return;
    }
    this.checkExits();
  }

  resolveCombat() {
    const p = this.player;
    const box = p.attackBox();
    if (box) {
      for (const e of this.enemies) {
        if (e.dead || p.hitSet.has(e) || !overlap(box, e)) continue;
        p.hitSet.add(e);
        const dmg = p.attackDamage();
        const pc = center(p);
        const ec = center(e);
        const finisher = p.combo === 3;
        e.hit(dmg, pc.x, pc.y, finisher ? 1.4 : 1);
        this.fx.spark(ec.x, ec.y);
        this.fx.text(ec.x, e.y - 3, String(dmg), finisher ? '#ffd86a' : '#ffffff');
        this.hitstop = Math.max(this.hitstop, finisher ? 0.08 : 0.045);
        this.fx.shake = Math.max(this.fx.shake, finisher ? 3 : 1.5);
        if (e.hp <= 0) this.killEnemy(e);
      }
    }

    for (const e of this.enemies) {
      if (e.dead) continue;
      const dmg = e.contactDamage();
      if (dmg > 0 && overlap(shrink(e, 2), p)) {
        const ec = center(e);
        if (p.hurt(dmg, ec.x, ec.y)) this.onPlayerHurt(dmg);
      }
    }

    const before = this.enemies.length;
    this.enemies = this.enemies.filter((e) => !e.dead);
    const def = this.room.def;
    const clearKey = `clear_${def.id}`;
    if (before > 0 && this.enemies.length === 0 && !this.flags[clearKey]) {
      this.flags[clearKey] = true;
      def.onClear?.(this);
    }
  }

  onPlayerHurt(dmg) {
    const p = this.player;
    this.fx.text(p.x + p.w / 2, p.y - 8, String(dmg), '#ff6a6a');
    this.fx.shake = Math.max(this.fx.shake, 3);
    this.hitstop = Math.max(this.hitstop, 0.06);
  }

  killEnemy(e) {
    e.dead = true;
    (this.defeated[this.room.id] ||= new Set()).add(e.index);
    const c = center(e);
    if (e.t.boss) {
      this.fx.burst(c.x, c.y, '#b070ff', 50, 110, 1.2);
      this.fx.burst(c.x, c.y, '#ffffff', 20, 60, 0.8);
      this.fx.shake = 8;
      this.hitstop = 0.3;
      this.projectiles = [];
    } else {
      this.fx.burst(c.x, c.y, '#7a4ab0', 14, 60, 0.5);
      if (Math.random() < e.t.dropRate) this.pickups.push({ x: c.x - 3.5, y: c.y - 3, w: 7, h: 6, t: 0 });
    }
  }

  updateProjectiles(dt) {
    const p = this.player;
    for (const b of this.projectiles) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      const out = b.x < 0 || b.y < 0 || b.x > W || b.y > H;
      if (out || this.room.solidAt(b.x, b.y)) {
        b.life = 0;
        if (!out) this.fx.burst(b.x, b.y, '#b070ff', 4, 30, 0.25);
        continue;
      }
      if (overlap({ x: b.x - 2, y: b.y - 2, w: 4, h: 4 }, p) && p.hurt(b.dmg, b.x, b.y)) {
        b.life = 0;
        this.onPlayerHurt(b.dmg);
      }
    }
    this.projectiles = this.projectiles.filter((b) => b.life > 0);
  }

  updatePickups(dt) {
    const p = this.player;
    for (const k of this.pickups) {
      k.t += dt;
      if (overlap(k, p)) {
        const heal = Math.min(6, p.maxHp - p.hp);
        p.hp += heal;
        this.fx.text(p.x + p.w / 2, p.y - 8, `+${heal}`, '#7aff8a');
        k.t = 99;
      }
    }
    this.pickups = this.pickups.filter((k) => k.t < 10);
  }

  checkExits() {
    const p = this.player;
    const def = this.room.def;
    // ボス部屋は倒すまで出られない。ノックバックで部屋の外へ押し出されることもない。
    const locked = (def.lockUntilClear && this.enemies.length > 0) || p.state === 'hurt';
    const ex = locked ? {} : def.exits || {};
    if (ex.west && p.x < -p.w / 2) return this.startTransition('west');
    if (ex.east && p.x + p.w / 2 > W) return this.startTransition('east');
    if (ex.north && p.y < -p.h / 2) return this.startTransition('north');
    if (ex.south && p.y + p.h / 2 > H) return this.startTransition('south');
    p.x = clamp(p.x, ex.west ? -p.w : 0, ex.east ? W : W - p.w);
    p.y = clamp(p.y, ex.north ? -p.h : 0, ex.south ? H : H - p.h);
  }

  startTransition(dir) {
    const target = this.room.def.exits[dir];
    if (target === 'END') {
      this.setState('ending');
      return;
    }
    this.transition = { dir, target, t: 0, swapped: false };
  }

  updateTransition(dt) {
    const tr = this.transition;
    tr.t += dt;
    if (!tr.swapped && tr.t >= FADE) {
      tr.swapped = true;
      const p = this.player;
      let { x, y } = p;
      if (tr.dir === 'west') x = W - p.w - 1;
      if (tr.dir === 'east') x = 1;
      if (tr.dir === 'north') y = H - p.h - 1;
      if (tr.dir === 'south') y = 1;
      this.loadRoom(tr.target, x, y);
      this.fx.clear();
    }
    if (tr.t >= FADE * 2) {
      this.transition = null;
      this.enterRoom();
    }
  }

  // ---- 描画 ---------------------------------------------------------------

  draw(ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.imageSmoothingEnabled = false;

    if (this.state === 'title') return drawTitle(ctx, this.time, this.input.isTouch);
    if (this.state === 'ending') return drawEnding(ctx, this.stateTime, STORY.ending);
    if (this.state === 'intro') return this.dialogue?.draw(ctx, true);

    ctx.save();
    const sh = this.fx.shake;
    if (sh > 0) ctx.translate((Math.random() - 0.5) * sh * 2, (Math.random() - 0.5) * sh * 2);
    this.drawWorld(ctx);
    ctx.restore();

    drawHUD(ctx, this, objective(this.flags));
    const boss = this.enemies.find((e) => e.t.boss);
    if (boss && !this.dialogue) drawBossBar(ctx, boss);
    if (this.banner && !this.dialogue) drawBanner(ctx, this.banner);
    if (this.dialogue) this.dialogue.draw(ctx);
    if (this.transition) {
      const t = this.transition.t;
      ctx.fillStyle = `rgba(0,0,0,${t < FADE ? t / FADE : Math.max(0, 2 - t / FADE)})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (this.state === 'gameover') drawGameOver(ctx, this.stateTime);
  }

  drawWorld(ctx) {
    const p = this.player;
    this.room.draw(ctx);

    for (const k of this.pickups) {
      if (k.t > 7 && Math.floor(k.t * 8) % 2 === 0) continue;
      drawHeart(ctx, k.x, k.y + Math.sin(k.t * 5) * 1.5);
    }

    const drawables = [
      ...this.npcs.map((n) => ({
        y: n.y + n.h,
        draw: () => (n.lying ? drawLying(ctx, n.x - 3, n.y - 6, LOOKS[n.look]) : drawPerson(ctx, n.x - 3, n.y - 8, n.dir, LOOKS[n.look])),
      })),
      ...this.enemies.map((e) => ({ y: e.y + e.h, draw: () => e.draw(ctx, this.time) })),
    ];
    if (this.state !== 'gameover') drawables.push({ y: p.y + p.h, draw: () => p.draw(ctx, this) });
    drawables.sort((a, b) => a.y - b.y).forEach((d) => d.draw());

    for (const b of this.projectiles) {
      ctx.fillStyle = 'rgba(176,112,255,0.4)';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f0d8ff';
      ctx.fillRect(b.x - 1.5, b.y - 1.5, 3, 3);
    }

    this.fx.draw(ctx);

    if (this.room.def.tint) {
      ctx.fillStyle = this.room.def.tint;
      ctx.fillRect(0, 0, W, H);
    }

    if (this.flags.lantern && this.state !== 'gameover') {
      const c = center(p);
      const r = 46 + Math.sin(this.time * 7) * 2;
      const g = ctx.createRadialGradient(c.x, c.y, 2, c.x, c.y, r);
      g.addColorStop(0, 'rgba(255,190,90,0.28)');
      g.addColorStop(1, 'rgba(255,150,60,0)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = g;
      ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
      ctx.globalCompositeOperation = 'source-over';
    }
  }
}

const game = new Game();
window.__game = game; // デバッグ用

let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 1 / 30);
  last = now;
  game.update(dt);
  game.draw(ctx);
  game.input.endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
