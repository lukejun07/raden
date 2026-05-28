import React from 'react';
import { DiceBase } from './base.js';
import { getStat } from '../engine/utils.js';
import { dealDmg, spawnFx } from '../engine/helpers.js';
import { CELL } from '../constants.js';
import { DiceImgBase } from '../../components/dice/Primitives.jsx';
import fireImg from '../../assets/dice/fire.webp';
import electricImg from '../../assets/dice/electric.webp';
import poisonImg from '../../assets/dice/poison.webp';
import iceImg from '../../assets/dice/ice.webp';
import steelImg from '../../assets/dice/steel.webp';
import brokenImg from '../../assets/dice/broken.webp';
import gambleImg from '../../assets/dice/gamble.webp';
import lockImg from '../../assets/dice/lock.webp';
import windImg from '../../assets/dice/wind.webp';

export class FireDice extends DiceBase {
  static type    = 'fire';
  static name    = '불';
  static rarity  = 'common';
  static border  = '#E02020';
  static bg      = '#F87070';
  static target  = 'first';
  static description = '불꽃을 발사해 타겟과 주변 적에게 스플래시 피해를 입힙니다.';
  static ability = { type: 'splash', radius: CELL * 1.8 };
  static stats   = { dmg: { base: 20, cP: 3, lP: 10 }, atkInt: { base: 0.8, cM: 0.01, lM: 0 }, splashDmg: { base: 20, cP: 3, lP: 20 } };
  static extraStatDefs = [{ label: '스플래시 피해', key: 'splashDmg' }];
  static onHit(proj, tgt, enemies, p) {
    const sd = getStat(FireDice.stats.splashDmg, proj.classLv, proj.level);
    for (const e of enemies)
      if (e.id !== tgt.id && e.hp > 0 && Math.hypot(e.x-tgt.x, e.y-tgt.y) <= FireDice.ability.radius)
        dealDmg(p, e, sd);
    spawnFx(p, "burst", tgt.x, tgt.y, FireDice.border);
  }
  static render(p) { return <DiceImgBase {...p} img={fireImg} dotColor={FireDice.border}/>; }
}

export class ElectricDice extends DiceBase {
  static type    = 'electric';
  static name    = '전기';
  static rarity  = 'common';
  static border  = '#C89000';
  static bg      = '#F5CF50';
  static target  = 'first';
  static description = '번개를 발사해 최대 3개의 적에게 연쇄 피해를 입힙니다.';
  static ability = { type: 'chain', count: 3, ratios: [1.0, 0.7, 0.3] };
  static stats   = { dmg: { base: 30, cP: 3, lP: 10 }, atkInt: { base: 0.7, cM: 0.02, lM: 0 }, chainDmg: { base: 30, cP: 3, lP: 20 } };
  static extraStatDefs = [{ label: '체인 수', fixed: '3개' }, { label: '체인 배율', fixed: '100/70/30%' }];
  static onHit(proj, tgt, enemies, p) {
    const ab = ElectricDice.ability;
    const cd = getStat(ElectricDice.stats.chainDmg, proj.classLv, proj.level);
    let last = tgt;
    for (let ci = 0; ci < ab.count; ci++) {
      const nx = enemies
        .filter(e => e.id !== tgt.id && e.id !== last.id && e.hp > 0)
        .sort((a,b) => Math.hypot(a.x-last.x,a.y-last.y) - Math.hypot(b.x-last.x,b.y-last.y))[0];
      if (!nx) break;
      dealDmg(p, nx, cd * ab.ratios[ci]);
      spawnFx(p, "chain", nx.x, nx.y, ElectricDice.border);
      last = nx;
    }
  }
  static render(p) { return <DiceImgBase {...p} img={electricImg} dotColor={ElectricDice.border}/>; }
}

export class PoisonDice extends DiceBase {
  static type    = 'poison';
  static name    = '독';
  static rarity  = 'common';
  static border  = '#44AA00';
  static bg      = '#88DD44';
  static target  = 'noPoison';
  static description = '독침을 발사해 타겟에게 지속 독 피해를 입힙니다.';
  static ability = { type: 'poison', tick: 1.0 };
  static stats   = { dmg: { base: 20, cP: 2, lP: 10 }, atkInt: { base: 1.3, cM: 0, lM: 0 }, dotDps: { base: 50, cP: 5, lP: 25 } };
  static extraStatDefs = [{ label: 'DoT 피해/초', key: 'dotDps' }];
  static onHit(proj, tgt) {
    tgt.poison = {
      dps: getStat(PoisonDice.stats.dotDps, proj.classLv, proj.level),
      timer: 0,
      tick: PoisonDice.ability.tick,
    };
  }
  static render(p) { return <DiceImgBase {...p} img={poisonImg} dotColor={PoisonDice.border}/>; }
}

export class IceDice extends DiceBase {
  static type    = 'ice';
  static name    = '얼음';
  static rarity  = 'common';
  static border  = '#0088EE';
  static bg      = '#55CCFF';
  static target  = 'first';
  static description = '얼음 탄환을 발사해 적의 이동속도를 감소시킵니다. 최대 3스택.';
  static ability = { type: 'slow', maxStacks: 3 };
  static stats   = { dmg: { base: 30, cP: 3, lP: 30 }, atkInt: { base: 1.5, cM: 0.02, lM: 0 }, slowPct: { base: 5, cP: 0.5, lP: 2 } };
  static extraStatDefs = [{ label: '감속률(%)', key: 'slowPct' }, { label: '최대 스택', fixed: '3' }];
  static onHit(proj, tgt) {
    const sp = getStat(IceDice.stats.slowPct, proj.classLv, proj.level);
    tgt.slowStacks = Math.min((tgt.slowStacks||0)+1, IceDice.ability.maxStacks);
    tgt.slowPctPerStack = Math.max(tgt.slowPctPerStack||0, sp);
    tgt.slowTimer = 3;
  }
  static render(p) { return <DiceImgBase {...p} img={iceImg} dotColor={IceDice.border}/>; }
}

export class SteelDice extends DiceBase {
  static type    = 'steel';
  static name    = '쇠';
  static rarity  = 'common';
  static border  = '#666666';
  static bg      = '#AAAAAA';
  static target  = 'strongest';
  static description = '강력한 포탄을 발사합니다. 보스 몬스터에게 추가 피해.';
  static ability = { type: 'bossKiller', mult: 2.0 };
  static stats   = { dmg: { base: 100, cP: 10, lP: 100 }, atkInt: { base: 1.0, cM: 0, lM: 0 } };
  static extraStatDefs = [{ label: '보스 배율', fixed: '×2.0' }];
  static onModifyDmg(proj, tgt, dmg) {
    return tgt.isBoss ? dmg * SteelDice.ability.mult : dmg;
  }
  static render(p) { return <DiceImgBase {...p} img={steelImg} dotColor={SteelDice.border}/>; }
}

export class BrokenDice extends DiceBase {
  static type    = 'broken';
  static name    = '고장난';
  static rarity  = 'common';
  static border  = '#AA44CC';
  static bg      = '#CC88EE';
  static target  = 'random';
  static description = '고장난 주사위. 무작위 대상에게 피해를 입힙니다.';
  static ability = { type: 'none' };
  static stats   = { dmg: { base: 50, cP: 10, lP: 50 }, atkInt: { base: 0.9, cM: 0, lM: 0 } };
  static extraStatDefs = [];
  static render(p) { return <DiceImgBase {...p} img={brokenImg} dotColor={BrokenDice.border}/>; }
}

export class GambleDice extends DiceBase {
  static type    = 'gamble';
  static name    = '도박';
  static rarity  = 'common';
  static border  = '#4422CC';
  static bg      = '#8866EE';
  static target  = 'first';
  static description = '도박 피해를 입힙니다. 피해량이 7~777배 범위로 무작위 결정.';
  static ability = { type: 'randomDmg' };
  static stats   = { dmg: { base: 7, cP: 10, lP: 77 }, atkInt: { base: 1.0, cM: 0.01, lM: 0 } };
  static extraStatDefs = [{ label: '피해 범위', fixed: '7~777배' }];
  static skipCrit = true;
  static onModifyDmg(proj, tgt, dmg) {
    return dmg + Math.random() * dmg;   // [1x ~ 2x]
  }
  static render(p) { return <DiceImgBase {...p} img={gambleImg} dotColor={GambleDice.border}/>; }
}

export class LockDice extends DiceBase {
  static type    = 'lock';
  static name    = '잠금';
  static rarity  = 'common';
  static border  = '#334488';
  static bg      = '#667799';
  static target  = 'first';
  static description = '타겟을 일정 확률로 잠금하여 이동을 멈춥니다.';
  static ability = { type: 'lock' };
  static stats   = { dmg: { base: 30, cP: 5, lP: 20 }, atkInt: { base: 0.8, cM: 0.01, lM: 0 }, lockProb: { base: 4, cP: 1, lP: 2 }, lockDur: { base: 3, cP: 0.2, lP: 0.5 } };
  static extraStatDefs = [{ label: '잠금 확률(%)', key: 'lockProb' }, { label: '잠금 시간(초)', key: 'lockDur' }];
  static onHit(proj, tgt, enemies, p) {
    if (tgt.everLocked) return;
    const prob = getStat(LockDice.stats.lockProb, proj.classLv, proj.level) / 100;
    if (Math.random() < prob) {
      tgt.locked = getStat(LockDice.stats.lockDur, proj.classLv, proj.level);
      tgt.everLocked = true;
      spawnFx(p, "lock", tgt.x, tgt.y, "#8090FF");
    }
  }
  static render(p) { return <DiceImgBase {...p} img={lockImg} dotColor={LockDice.border}/>; }
}

export class WindDice extends DiceBase {
  static type    = 'wind';
  static name    = '바람';
  static rarity  = 'common';
  static border  = '#30C4A8';
  static bg      = '#55DDCC';
  static target  = 'first';
  static description = '가장 빠른 적을 공격하며, 자신의 공격속도를 빠르게 유지합니다.';
  static ability = { type: 'windBuff' };
  static stats   = { dmg: { base: 20, cP: 3, lP: 15 }, atkInt: { base: 0.45, cM: 0, lM: 0 }, speedBuff: { base: 10, cP: 2, lP: 10 } };
  static extraStatDefs = [{ label: '공속 버프(%)', key: 'speedBuff' }];
  static render(p) { return <DiceImgBase {...p} img={windImg} dotColor={WindDice.border}/>; }
}
