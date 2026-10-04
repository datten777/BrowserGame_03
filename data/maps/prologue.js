// 序章：ハルネ村。タイル記号の意味は js/map.js を参照。
// 部屋の配置：
//              [hut]
//  [village_west] [village] [village_east]
//              [south_gate] → 霧の森（END）
import { STORY } from '../story.js';

const T = 16;

export const START = { room: 'village', x: 10 * T + 3, y: 8 * T + 3 };

export function objective(flags) {
  return flags.lantern ? '南の門から霧の森へ旅立て' : '北にある師匠の小屋へ向かえ';
}

const byLantern = (before, after) => (flags) => (flags.lantern ? after : before);

export const ROOMS = {
  village: {
    id: 'village',
    name: 'ハルネ村',
    tint: 'rgba(80,20,30,0.14)',
    embers: true,
    exits: { north: 'hut', south: 'south_gate', west: 'village_west', east: 'village_east' },
    tiles: [
      '#########::#########',
      '#RRRR....::....RRRR#',
      '#RRRR....::....RRRR#',
      '#HHDH.*..::..*.HDHH#',
      '#..:.....::.....:..#',
      '#..:::::::::::::::.#',
      '...:.....,......:...',
      '::::....W.......::::',
      '...:.S..........:...',
      '#..:::::::::::::::.#',
      '#.......*::.....*..#',
      '#,,.....x::x.....,,#',
      '#FFF....,::.....FFF#',
      '#.......*::*.......#',
      '#########::#########',
    ],
    enemies: [
      { type: 'slime', c: 6, r: 11 },
      { type: 'slime', c: 14, r: 4 },
    ],
    npcs: [{ c: 12, r: 7, name: '村長', look: 'elder', lines: byLantern(STORY.elder, STORY.elderAfter) }],
    signs: [{ c: 5, r: 8, lines: STORY.signVillage }],
    onEnter(game) {
      if (!game.flags.introDone) {
        game.flags.introDone = true;
        const controls = game.input.isTouch ? STORY.controlsTouch : STORY.controlsKeys;
        game.say([...STORY.villageStart, ...controls]);
      }
    },
  },

  village_west: {
    id: 'village_west',
    name: 'ハルネ村 西の家並み',
    tint: 'rgba(80,20,30,0.14)',
    embers: true,
    exits: { east: 'village' },
    tiles: [
      '####################',
      '#~~~~~~.....RRRR...#',
      '#~~~~~~.....RRRR...#',
      '#~~~~~,.....HHDH...#',
      '#,~~~,...x....:....#',
      '#,,.....x.x...:....#',
      '#.....,.......::::::',
      '#..RRRR.......::::::',
      '#..RRRR...*....:::::',
      '#..HDHH....x.......#',
      '#.........*........#',
      '#..x....,.....RRR..#',
      '#.B.B...x.....HDH..#',
      '#...........,......#',
      '####################',
    ],
    enemies: [
      { type: 'slime', c: 5, r: 5 },
      { type: 'slime', c: 12, r: 9 },
      { type: 'slime', c: 17, r: 12 },
    ],
    npcs: [{ c: 8, r: 10, name: '子ども', look: 'child', lines: byLantern(STORY.child, STORY.childAfter) }],
  },

  village_east: {
    id: 'village_east',
    name: 'ハルネ村 東の畑',
    tint: 'rgba(80,20,30,0.14)',
    embers: true,
    exits: { west: 'village' },
    tiles: [
      '####################',
      '#..FFFFFFFFFF......#',
      '#..Fcccccccc.F..RRR#',
      '#..Fcccccccc.F..HDH#',
      '#..Fcccccccc.F.....#',
      '#..FFFF..FFFFF.....#',
      '::::::.........~~~~#',
      '::::::.....*....~~~#',
      '::::::.........~~~~#',
      '#.........B.....~~~#',
      '#..FFFFFFFF.......~#',
      '#..Fcccccc.F.......#',
      '#..Fcccccc.F..*....#',
      '#..FFFFFFFFF.......#',
      '####################',
    ],
    enemies: [
      { type: 'slime', c: 7, r: 3 },
      { type: 'slime', c: 9, r: 8 },
      { type: 'slime', c: 13, r: 11 },
    ],
    npcs: [{ c: 13, r: 7, name: '農夫', look: 'farmer', lines: byLantern(STORY.farmer, STORY.farmerAfter) }],
  },

  hut: {
    id: 'hut',
    name: 'ガルドの小屋',
    tint: 'rgba(30,10,60,0.22)',
    exits: { south: 'village' },
    lockUntilClear: true,
    tiles: [
      '####################',
      '#####..RRRRRR..#####',
      '####...RRRRRR...####',
      '###....HHHDHH....###',
      '##.......:........##',
      '#........:.........#',
      '#.,......:.....,...#',
      '#........:.........#',
      '#..B.....:......B..#',
      '#........:.........#',
      '#.,......::.....,..#',
      '##........::......##',
      '###.......::.....###',
      '#####.....::...#####',
      '#########::#########',
    ],
    enemies: [
      { type: 'boss', c: 9, r: 7 },
      { type: 'slime', c: 4, r: 6 },
      { type: 'slime', c: 15, r: 9 },
    ],
    npcs: [{
      c: 12, r: 4, name: 'ガルド', look: 'master', lying: true,
      lines: byLantern(STORY.masterHurt, STORY.masterAfter),
    }],
    onEnter(game) {
      if (!game.flags.lantern && !game.flags.bossIntro) {
        game.flags.bossIntro = true;
        game.say(STORY.bossIntro);
      }
    },
    onClear(game) {
      game.say(STORY.masterGift, () => {
        game.flags.lantern = true;
        game.flags.gateOpen = true;
        const p = game.player;
        game.fx.burst(p.x + p.w / 2, p.y + p.h / 2, '#ffd86a', 30, 70, 0.9);
      });
    },
  },

  south_gate: {
    id: 'south_gate',
    name: 'ハルネ村 南門',
    tint: 'rgba(80,20,30,0.1)',
    exits: { north: 'village', south: 'END' },
    tiles: [
      '#########::#########',
      '#........::......,.#',
      '#..RRR...::........#',
      '#..HDH...::....*...#',
      '#.,......::........#',
      '#........::....B...#',
      '#..*.....::........#',
      '#........::......*.#',
      '#........::........#',
      '#........::..,.....#',
      '#.......S::........#',
      '#FFFFFFFPGGPFFFFFFF#',
      '#########::#########',
      '#########::#########',
      '#########::#########',
    ],
    enemies: [
      { type: 'slime', c: 5, r: 5 },
      { type: 'slime', c: 14, r: 7 },
    ],
    npcs: [{ c: 12, r: 10, name: '門番', look: 'guard', lines: byLantern(STORY.guard, STORY.guardAfter) }],
    signs: [{ c: 8, r: 10, lines: STORY.signGate }],
  },
};
