import { BASE_SPEED } from '../constants.js';
import { uid } from './utils.js';
import { PATH_WP, PATH_SEG } from './paths.js';

export const MON_SPECS = {
  normal: { w:22, h:22, shape:"rect",   color:"#555566", hpBase:200,  speed:BASE_SPEED,      heartDmg:1, isBoss:false },
  speed:  { w:20, h:20, shape:"circle", color:"#3377CC", hpBase:120,  speed:BASE_SPEED*1.8,  heartDmg:1, isBoss:false },
  big:    { w:34, h:34, shape:"rect",   color:"#334455", hpBase:800,  speed:BASE_SPEED*0.6,  heartDmg:2, isBoss:false },
  boss:   { w:42, h:42, shape:"rect",   color:"#881122", hpBase:25000,speed:BASE_SPEED*0.45, heartDmg:2, isBoss:true  },
};

export function calcBaseHP(wave, timeInWave=0) {
  const t = Math.min(Math.max(timeInWave, 0) / 90, 1);
  const startHp = 350 * Math.pow(1.8, wave - 1);
  const endHp   = startHp * 4;
  return startHp + (endHp - startHp) * t;
}

export function spawnEnemy(monType, wave, timeInWave=0) {
  const ms = MON_SPECS[monType];
  const base = calcBaseHP(wave, timeInWave);
  const hp = monType === "big"   ? base * 4
            : monType === "boss"  ? 3000 * wave
            : monType === "speed" ? base * 0.6
            : base;
  const isDeath = wave >= 7, isFury = wave >= 11;
  const sm = (isDeath ? 1.35 : 1) * (isFury ? 1.3 : 1);
  return {
    id: uid(), monType,
    w: ms.w, h: ms.h, shape: ms.shape, color: ms.color,
    heartDmg: ms.heartDmg, isBoss: ms.isBoss,
    hp, maxHp: hp,
    speed: ms.speed * sm,
    pathD: 0, x: PATH_WP[0].x, y: PATH_WP[0].y,
    dist: PATH_SEG.total,
    slowStacks: 0, slowTimer: 0, slowPctPerStack: 0, locked: 0, everLocked: false, poison: null,
  };
}

export function monSPReward(monType, wave) {
  if (monType === "boss") return wave * 100;
  if (monType === "big")  return wave * 50;
  return wave * 10;
}
