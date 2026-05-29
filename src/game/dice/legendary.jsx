import React, { useRef } from 'react';
import { DiceBase } from './base.js';
import { getStat } from '../engine/utils.js';
import { dealDmg, spawnFx } from '../engine/helpers.js';
import { CELL } from '../constants.js';
import { DiceImgBase, DiceCardLegend, DotLayer, GakNakBorder, nextDcId } from '../../components/dice/Primitives.jsx';
import jokerImg from '../../assets/dice/joker.webp';
import growthImg from '../../assets/dice/growth.webp';
import sunImg from '../../assets/dice/sun.webp';
import comboImg from '../../assets/dice/combo.webp';
import moonImg from '../../assets/dice/moon.webp';
import summonImg from '../../assets/dice/summon.webp';

// Sun inactive 전용 컴포넌트 (Hook 사용 가능)
function SunSVGInactive({ size, dot }) {
  const S=size, b="#886633";
  const cx=S*.5, cy=S*.5;
  const pts=[];
  for(let i=0;i<12;i++){
    const a=(i/12)*Math.PI*2 - Math.PI/2;
    const r=i%2===0?S*.42:S*.28;
    pts.push(`${(cx+r*Math.cos(a)).toFixed(2)},${(cy+r*Math.sin(a)).toFixed(2)}`);
  }
  return (
    <DiceCardLegend size={S} borderColor={b}>
      <polygon points={pts.join(" ")} fill={b} opacity="0.38"/>
      <circle cx={cx} cy={cy} r={S*.22} fill={b} opacity="0.6"/>
      <circle cx={cx} cy={cy} r={S*.13} fill={b} opacity="0.82"/>
      <DotLayer dot={dot} color={b} size={S} legend={true}/>
    </DiceCardLegend>
  );
}

// Moon inactive 전용 컴포넌트 (Hook 사용 가능)
function MoonSVGInactive({ size, dot, moonCount=0 }) {
  const S=size, b='#888888';
  const uidRef = useRef(`mn${nextDcId()}`).current;
  const cx=S*.5, cy=S*.5, rx=S*.2, pad=S*.1;
  const phase = moonCount<=3?"crescent":moonCount<=5?"half":"full";
  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{display:"block"}}>
      <defs>
        <linearGradient id={`imn_${uidRef}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF"/>
          <stop offset="100%" stopColor="#F0F0F0"/>
        </linearGradient>
        <linearGradient id={`gmn_${uidRef}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="white" stopOpacity="0.0"/>
          <stop offset="35%"  stopColor="white" stopOpacity="0.7"/>
          <stop offset="52%"  stopColor="white" stopOpacity="0.7"/>
          <stop offset="100%" stopColor="white" stopOpacity="0.0"/>
        </linearGradient>
        <filter id={`fmn_${uidRef}`} x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy={S*.025} stdDeviation={S*.04} floodColor="rgba(0,0,0,0.28)"/>
        </filter>
        <clipPath id={`cmn_${uidRef}`}>
          <rect x={pad} y={pad} width={S-pad*2} height={S-pad*2} rx={rx*.65}/>
        </clipPath>
        {phase==="half" && (
          <clipPath id={`hmn_${uidRef}`}>
            <rect x={pad} y={pad} width={S*.5-pad} height={S-pad*2}/>
          </clipPath>
        )}
      </defs>
      <rect x="0" y="0" width={S} height={S} rx={rx} fill="#F2EED8" filter={`url(#fmn_${uidRef})`}/>
      <GakNakBorder S={S} color={b}/>
      <rect x={pad} y={pad} width={S-pad*2} height={S-pad*2} rx={rx*.65} fill={`url(#imn_${uidRef})`}/>
      <g clipPath={`url(#cmn_${uidRef})`}>
        {phase==="full" && <circle cx={cx} cy={cy} r={S*.28} fill={b} opacity="0.72"/>}
        {phase==="half" && <circle cx={cx} cy={cy} r={S*.28} fill={b} opacity="0.72" clipPath={`url(#hmn_${uidRef})`}/>}
        {phase==="crescent" && <>
          <circle cx={cx} cy={cy} r={S*.28} fill={b} opacity="0.72"/>
          <circle cx={cx+S*.17} cy={cy-S*.02} r={S*.25} fill="rgba(255,255,255,0.96)"/>
        </>}
        <DotLayer dot={dot} color={b} size={S} legend={true}/>
      </g>
      <rect x={pad} y={pad} width={S-pad*2} height={S-pad*2} rx={rx*.65} fill={`url(#gmn_${uidRef})`}/>
    </svg>
  );
}

export class JokerDice extends DiceBase {
  static type     = 'joker';
  static name     = '조커';
  static rarity   = 'legendary';
  static border   = '#RAINBOW';
  static bg       = '#FFFFFF';
  static target   = 'first';
  static minClass = 7;
  static description = '합성 시 어떤 타입과도 합성 가능한 만능 전설 주사위.';
  static ability = { type: 'joker' };
  static stats   = { dmg: { base: 40, cP: 5, lP: 10 }, atkInt: { base: 1.5, cM: 0, lM: 0 } };
  static extraStatDefs = [{ label: '특수 효과', fixed: '만능 합성' }];
  static render(p) { return <DiceImgBase {...p} img={jokerImg} dotColor="#FF8800" scale={1.25} imgDy={-p.size * 0.065}/>; }
}

export class GrowthDice extends DiceBase {
  static type     = 'growth';
  static name     = '성장';
  static rarity   = 'legendary';
  static border   = '#7700CC';
  static bg       = '#BB66FF';
  static target   = 'first';
  static minClass = 7;
  static description = '시간이 지날수록 데미지가 지수적으로 증가합니다.';
  static ability = { type: 'growth' };
  static stats   = { dmg: { base: 10, cP: 5, lP: 10 }, atkInt: { base: 2.0, cM: 0, lM: 0 }, growthTime: { base: 21, cM: 1, lM: 0 } };
  static extraStatDefs = [{ label: '성장 주기(초)', key: 'growthTime' }];
  static render(p) { return <DiceImgBase {...p} img={growthImg} dotColor={GrowthDice.border} scale={1.25} imgDy={-p.size * 0.065}/>; }
}

export class SunDice extends DiceBase {
  static type     = 'sun';
  static name     = '태양';
  static rarity   = 'legendary';
  static border   = '#886633';
  static bg       = '#DDAA66';
  static target   = 'first';
  static minClass = 7;
  static description = '낮 시간대에 활성화되어 빠른 공격속도와 스플래시 피해를 발휘합니다.';
  static ability = { type: 'sun', splashRadius: CELL * 0.9 };
  static stats   = { dmg: { base: 40, cP: 5, lP: 11 }, atkInt: { base: 1.2, cM: 0, lM: 0 }, splashDmg: { base: 40, cP: 5, lP: 11 } };
  static extraStatDefs = [{ label: '스플래시 피해', key: 'splashDmg' }, { label: '활성 조건', fixed: '낮 시간대' }];
  static onModifyDmg(proj, tgt, dmg, p) {
    const sunDice = p.dice[proj.diceKey];
    if (sunDice) {
      if (sunDice.sunLastTarget === tgt.id) sunDice.sunHits = (sunDice.sunHits||0) + 1;
      else { sunDice.sunHits = 1; sunDice.sunLastTarget = tgt.id; }
      dmg *= Math.ceil(sunDice.sunHits / 2);
    }
    return dmg;
  }
  static onHit(proj, tgt, enemies, p) {
    if ((proj.sunCount||0) >= 3 && (proj.sunCount % 2) === 1) {
      const sunDice = p.dice[proj.diceKey];
      const sd = getStat(SunDice.stats.splashDmg, proj.classLv, proj.level);
      const sunHits = sunDice?.sunHits || 1;
      const splashR = Math.min(CELL * 0.5 + (sunHits - 1) * CELL * 0.2, CELL * 2.5);
      for (const e of enemies)
        if (e.id !== tgt.id && e.hp > 0 && Math.hypot(e.x-tgt.x, e.y-tgt.y) <= splashR)
          dealDmg(p, e, sd);
      spawnFx(p, "burst", tgt.x, tgt.y, SunDice.border);
    }
  }
  static render({ size, dot, active }) {
    if (active) return <DiceImgBase size={size} dot={dot} img={sunImg} dotColor="#DD5500" scale={1.25} imgDy={-size * 0.065}/>;
    return <SunSVGInactive size={size} dot={dot}/>;
  }
}

export class ComboDice extends DiceBase {
  static type     = 'combo';
  static name     = '콤보';
  static rarity   = 'legendary';
  static border   = '#CC1188';
  static bg       = '#FFDDEE';
  static target   = 'first';
  static minClass = 7;
  static description = '합성될 때마다 콤보 스택이 영구적으로 쌓이며 피해량이 증가합니다.';
  static ability = { type: 'combo' };
  static stats   = { dmg: { base: 50, cP: 10, lP: 10 }, atkInt: { base: 1.2, cM: 0, lM: 0 }, comboDmg: { base: 8, cP: 2, lP: 1 } };
  static extraStatDefs = [{ label: '콤보 피해', key: 'comboDmg' }];
  static render({ size: S, dot, comboCount=0 }) {
    const sc = 1.25, off = -(S * (sc-1)/2), dy = -S * 0.065;
    const fs = comboCount >= 100 ? S*0.16 : comboCount >= 10 ? S*0.19 : S*0.23;
    return (
      <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{display:"block"}}>
        <image href={comboImg} x={off} y={off+dy} width={S*sc} height={S*sc}/>
        <DotLayer dot={dot} color={ComboDice.border} size={S}/>
        {comboCount > 0 && <>
          <circle cx={S*0.5} cy={S*0.5} r={S*0.22} fill="rgba(0,0,0,0.62)"/>
          <text x={S*0.5} y={S*0.5+fs*0.36} textAnchor="middle"
            fontSize={fs} fontWeight="900" fill="#FFD700"
            fontFamily="monospace,sans-serif" style={{userSelect:"none"}}>
            {comboCount}
          </text>
        </>}
      </svg>
    );
  }
}

export class MoonDice extends DiceBase {
  static type     = 'moon';
  static name     = '달';
  static rarity   = 'legendary';
  static border   = '#888888';
  static bg       = '#DDDDDD';
  static target   = 'none';
  static minClass = 7;
  static description = '밤 시간대에 활성화되어 아군 공격력을 증폭시키는 오라를 발산합니다.';
  static ability = { type: 'moonAura' };
  static stats   = { atkInt: { base: 9999 } };
  static extraStatDefs = [{ label: '활성 조건', fixed: '밤 시간대' }];
  static render({ size, dot, active, moonCount=0 }) {
    if (active) return <DiceImgBase size={size} dot={dot} img={moonImg} dotColor="#44AADD" scale={1.25} imgDy={-size*0.065}/>;
    return <MoonSVGInactive size={size} dot={dot} moonCount={moonCount}/>;
  }
}

export class SummonDice extends DiceBase {
  static type     = 'summon';
  static name     = '소환';
  static rarity   = 'legendary';
  static border   = '#009944';
  static bg       = '#88FFAA';
  static target   = 'first';
  static minClass = 7;
  static description = '공격 명중 시 일정 확률로 빈 슬롯에 새 주사위를 소환합니다.';
  static ability = { type: 'summon' };
  static stats   = { dmg: { base: 10, cP: 10, lP: 10 }, atkInt: { base: 1.5, cM: 0, lM: 0 } };
  static extraStatDefs = [{ label: '소환 조건', fixed: '명중 확률' }];
  static render(p) { return <DiceImgBase {...p} img={summonImg} dotColor={SummonDice.border} scale={1.25} imgDy={-p.size * 0.065}/>; }
}
