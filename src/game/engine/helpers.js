// 순환 의존성 방지: dice import 없음. 순수 game state 조작 함수들.
import { uid } from './utils.js';

export function dealDmg(p, e, dmg) {
  e.hp -= dmg;
}

export function spawnFx(p, type, x, y, color) {
  p.effects.push({ id: uid(), type, x, y, color, life: 0.3, maxLife: 0.3 });
}

export function spawnTxt(p, x, y, val) {
  p.effects.push({ id: uid(), type: "text", x, y: y-10, text: String(val), life: 0.8, maxLife: 0.8, vy: -50 });
}
