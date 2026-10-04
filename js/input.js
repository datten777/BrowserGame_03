const KEYMAP = {
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  attack: ['KeyJ', 'KeyZ', 'Space'],
  dodge: ['KeyL', 'KeyX', 'ShiftLeft', 'ShiftRight'],
  skill: ['KeyK', 'KeyC'],
  confirm: ['Enter', 'KeyJ', 'KeyZ', 'Space'],
  menu: ['Escape'],
};
const GAME_KEYS = new Set(Object.values(KEYMAP).flat());

/** キーボードとタッチ操作をまとめて「アクション」として扱う */
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.virtual = new Set();
    this.pressedSet = new Set();
    this.isTouch = false;

    addEventListener('keydown', (e) => {
      if (GAME_KEYS.has(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(e.code);
      for (const [action, codes] of Object.entries(KEYMAP)) {
        if (codes.includes(e.code)) this.pressedSet.add(action);
      }
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => {
      this.keys.clear();
      this.virtual.clear();
    });
    canvas.addEventListener('pointerdown', () => this.pressedSet.add('confirm'));

    this.setupTouch();
  }

  down(action) {
    return this.virtual.has(action) || KEYMAP[action].some((c) => this.keys.has(c));
  }

  pressed(action) {
    return this.pressedSet.has(action);
  }

  endFrame() {
    this.pressedSet.clear();
  }

  setupTouch() {
    const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    if (!isTouch) return;
    this.isTouch = true;
    document.body.classList.add('touch');
    document.getElementById('touch').hidden = false;

    const pad = document.getElementById('dpad');
    const knob = pad.querySelector('.knob');
    const dirs = ['up', 'down', 'left', 'right'];
    let padPointer = null;

    const setDir = (e) => {
      const r = pad.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const len = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, r.width / 2 / len) * 0.6;
      knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
      dirs.forEach((d) => this.virtual.delete(d));
      if (len < 12) return;
      const ax = dx / len;
      const ay = dy / len;
      if (ax > 0.38) this.virtual.add('right');
      if (ax < -0.38) this.virtual.add('left');
      if (ay > 0.38) this.virtual.add('down');
      if (ay < -0.38) this.virtual.add('up');
    };
    const endPad = (e) => {
      if (e.pointerId !== padPointer) return;
      padPointer = null;
      knob.style.transform = '';
      dirs.forEach((d) => this.virtual.delete(d));
    };
    pad.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      padPointer = e.pointerId;
      pad.setPointerCapture(e.pointerId);
      setDir(e);
    });
    pad.addEventListener('pointermove', (e) => {
      if (e.pointerId === padPointer) setDir(e);
    });
    pad.addEventListener('pointerup', endPad);
    pad.addEventListener('pointercancel', endPad);

    for (const btn of document.querySelectorAll('#buttons button')) {
      const action = btn.dataset.action;
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        btn.setPointerCapture(e.pointerId);
        this.virtual.add(action);
        this.pressedSet.add(action);
        if (action === 'attack') this.pressedSet.add('confirm');
        btn.classList.add('on');
      });
      const release = () => {
        this.virtual.delete(action);
        btn.classList.remove('on');
      };
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
    }
  }
}
