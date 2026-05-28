import { uid, getStat, cellKey, cellXY } from './utils.js';
import { DICE_REGISTRY } from '../dice/index.js';
import { COLS, ROWS } from '../constants.js';

export function getSelfSpeedBuff(d, classLv, ingameLv) {
  const def = DICE_REGISTRY[d.type];
  if (!def.stats.speedBuff) return 0;
  return Math.min(getStat(def.stats.speedBuff, classLv, ingameLv) / 100, 0.95);
}

export function addDiceAnim(p, key, type) {
  if (!p.animations) p.animations = [];
  p.animations = p.animations.filter(a => a.key !== key);
  p.animations.push({ key, type, progress: 0, duration: 0.1 });
}

export function pickTarget(enemies, mode) {
  if (!enemies.length) return null;
  if (mode === "first")    return enemies.reduce((a,b) => a.dist < b.dist ? a : b);
  if (mode === "strongest")return enemies.reduce((a,b) => a.hp > b.hp ? a : b);
  if (mode === "noPoison") { const u = enemies.filter(e=>!e.poison); return u.length ? u[Math.floor(Math.random()*u.length)] : enemies[Math.floor(Math.random()*enemies.length)]; }
  return enemies[Math.floor(Math.random() * enemies.length)];
}

export function makePlayer(id, deck, rawClassLevels = {}, critMult = 2) {
  const classLevels = Object.fromEntries(
    deck.map(t => [t, Math.max(rawClassLevels[t]||1, DICE_REGISTRY[t]?.minClass||1)])
  );
  return {
    id, deck, sp: 100, summonCost: 10, hearts: 3,
    dice: {}, enemies: [], projs: [], effects: [],
    wave: 1, dead: false, gameTime: 0, nextBossTime: 90,
    bigTimer: 20, totalKills: 0, animations: [],
    spawnQueue: [], summonPending: [], bossRound: false,
    comboCount: 0, diceLevels: {}, classLevels, critMult,
  };
}

export function makeDice(type, dot, ingameLv, classLv) {
  const def = DICE_REGISTRY[type];
  const startDot = (dot !== undefined) ? dot : 1;
  const lvl = ingameLv || 1;
  const clvl = classLv || 1;
  const d = { id: uid(), type, dot: startDot, level: 1, cd: 0, subIdx: 0 };
  if (def.stats.growthTime) {
    d.growthTimer = getStat(def.stats.growthTime, clvl, lvl);
  }
  return d;
}
