import React from 'react';
import { DiceBase } from './base.js';
import { getStat } from '../engine/utils.js';
import { DiceCard, DotLayer } from '../../components/dice/Primitives.jsx';
import { DiceImgBase } from '../../components/dice/Primitives.jsx';
import gamblegrowthImg from '../../assets/dice/gamblegrowth.webp';
import lightImg from '../../assets/dice/light.webp';

export class SacrificeDice extends DiceBase {
  static type     = 'sacrifice';
  static name     = '제물';
  static rarity   = 'rare';
  static border   = '#884400';
  static bg       = '#DDAA66';
  static target   = 'first';
  static minClass = 3;
  static description = '합칠 때마다 사용된 제물 주사위 수만큼 추가 SP를 획득합니다. 눈금당 공격력 +10.';
  static ability  = { type: 'none' };
  static stats    = { dmg: { base: 80, cP: 10, lP: 10 }, atkInt: { base: 1.0, cM: 0, lM: 0 }, spReward: { base: 80 } };
  static extraStatDefs = [{ label: 'SP 보상', key: 'spReward' }];
  static onModifyDmg(proj, tgt, dmg) { return dmg + (proj.dot - 1) * 10; }
  static render({ size: S, dot }) {
    const b = '#884400';
    const cx = S * 0.5, cy = S * 0.5;
    const flames = [0, 60, 120, 180, 240, 300].slice(0, 3).map(a => {
      const r = a * Math.PI / 180;
      return `${(cx + S*0.22*Math.cos(r)).toFixed(1)},${(cy + S*0.22*Math.sin(r)).toFixed(1)}`;
    });
    return (
      <DiceCard size={S} border={b}>
        <circle cx={cx} cy={cy} r={S*0.28} fill={b} opacity="0.18"/>
        <polygon points={`${cx},${cy-S*0.22} ${cx+S*0.19},${cy+S*0.11} ${cx-S*0.19},${cy+S*0.11}`}
          fill={b} opacity="0.5"/>
        <circle cx={cx} cy={cy} r={S*0.1} fill={b} opacity="0.8"/>
        <DotLayer dot={dot} color={b} size={S}/>
      </DiceCard>
    );
  }
}

export class GambleGrowthDice extends DiceBase {
  static type     = 'gamblegrowth';
  static name     = '도박성장';
  static rarity   = 'rare';
  static border   = '#BB8800';
  static bg       = '#FFDD44';
  static target   = 'first';
  static minClass = 3;
  static description = '시간이 지날수록 피해량이 증가하는 도박형 주사위입니다.';
  static ability = { type: 'gamblegrowth' };
  static stats   = { dmg: { base: 30, cP: 0, lP: 0 }, atkInt: { base: 1.0, cM: 0, lM: 0 }, growthTime: { base: 45, cM: 1, lM: 1 } };
  static extraStatDefs = [{ label: '성장 시간(초)', key: 'growthTime' }];
  static onTick(d, p, dt, key, ctx) {
    const gcl = (p.classLevels||{})[d.type] || 1;
    if (d.growthTimer === undefined)
      d.growthTimer = getStat(GambleGrowthDice.stats.growthTime, gcl, p.diceLevels[d.type]||1);
    d.growthTimer -= dt;
    if (d.growthTimer <= 0) {
      const { makeDice, rnd } = ctx;
      const newType = rnd(p.deck);
      const newDot = Math.floor(Math.random() * 7) + 1;
      p.dice[key] = makeDice(newType, newDot, p.diceLevels[newType]||1, (p.classLevels||{})[newType]||1);
    }
  }
  static render(p) { return <DiceImgBase {...p} img={gamblegrowthImg} dotColor={GambleGrowthDice.border}/>; }
}

export class CritDice extends DiceBase {
  static type     = 'crit';
  static name     = '크리티컬';
  static rarity   = 'rare';
  static border   = '#DD2255';
  static bg       = '#FFAABB';
  static target   = 'none';
  static minClass = 3;
  static description = '공격하지 않고 인접 4칸 주사위의 크리티컬 확률을 높입니다.';
  static ability  = { type: 'critAura' };
  static stats    = { atkInt: { base: 9999 }, critBonus: { base: 7.6, cP: 0.2, lP: 1 } };
  static extraStatDefs = [{ label: '크리확률 증가(%)', key: 'critBonus' }];
  static render({ size: S, dot }) {
    const b = '#DD2255';
    const cx = S * 0.5, cy = S * 0.5, arm = S * 0.22, sw = S * 0.11;
    return (
      <DiceCard size={S} border={b}>
        <rect x={cx - sw/2} y={cy - arm} width={sw} height={arm*2} rx={sw*0.4} fill={b} opacity="0.55"/>
        <rect x={cx - arm} y={cy - sw/2} width={arm*2} height={sw} rx={sw*0.4} fill={b} opacity="0.55"/>
        <DotLayer dot={dot} color={b} size={S}/>
      </DiceCard>
    );
  }
}

export class LightDice extends DiceBase {
  static type     = 'light';
  static name     = '빛';
  static rarity   = 'rare';
  static border   = '#DDB800';
  static bg       = '#FFFFD0';
  static target   = 'none';
  static minClass = 3;
  static description = '공격하지 않고 주변 아군 주사위의 공격속도를 증가시킵니다.';
  static ability = { type: 'lightAura' };
  static stats   = { atkInt: { base: 9999 } };
  static extraStatDefs = [{ label: '공속 오라', fixed: '주변 +15%' }];
  static render(p) { return <DiceImgBase {...p} img={lightImg} dotColor={LightDice.border}/>; }
}
