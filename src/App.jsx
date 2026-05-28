import React, { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════
//  LAYOUT
// ═══════════════════════════════════════════════════════════════
const CELL = 68;
const COLS = 5, ROWS = 3;
const BW = (COLS + 2) * CELL; // 476
const BH = (ROWS + 2) * CELL; // 340
const BASE_SPEED = 50;

// n자(ㄷ자) 경로: 하단좌(스폰) → 상단좌 → 상단우 → 하단우(기지)
const PATH_WP = [
  { x: CELL * 0.5,      y: BH - CELL * 0.5 }, // 하단좌 (스폰)
  { x: CELL * 0.5,      y: CELL * 0.5 },       // 상단좌
  { x: BW - CELL * 0.5, y: CELL * 0.5 },       // 상단우
  { x: BW - CELL * 0.5, y: BH - CELL * 0.5 }, // 하단우 (기지)
];
const PATH_SEG = (() => {
  const segs = []; let cum = 0;
  for (let i = 0; i < PATH_WP.length - 1; i++) {
    const dx = PATH_WP[i+1].x - PATH_WP[i].x;
    const dy = PATH_WP[i+1].y - PATH_WP[i].y;
    const len = Math.hypot(dx, dy);
    segs.push({ sx: PATH_WP[i].x, sy: PATH_WP[i].y, dx, dy, len, cum });
    cum += len;
  }
  return { segs, total: cum };
})();
function posOnPath(d) {
  d = Math.max(0, Math.min(d, PATH_SEG.total));
  for (const seg of PATH_SEG.segs) {
    if (d <= seg.cum + seg.len) {
      const t = (d - seg.cum) / seg.len;
      return { x: seg.sx + seg.dx * t, y: seg.sy + seg.dy * t };
    }
  }
  return { ...PATH_WP[PATH_WP.length - 1] };
}

// ═══════════════════════════════════════════════════════════════
//  DICE DEFINITIONS (일반 등급 9종)
// ═══════════════════════════════════════════════════════════════
// stats: (cP, cM) = 클래스 레벨당 증감 / (lP, lM) = 인게임 SP 파워업당 증감
const DICE_DEFS = {
  // ── 일반 등급 ──
  fire:        { name:"불",     border:"#E02020", bg:"#F87070", target:"first",
    ability:{ type:"splash", radius:CELL*1.8 },
    stats:{ dmg:{base:20,cP:3,lP:10}, atkInt:{base:0.8,cM:0.01,lM:0}, splashDmg:{base:20,cP:3,lP:20} } },
  electric:    { name:"전기",   border:"#C89000", bg:"#F5CF50", target:"first",
    ability:{ type:"chain", count:3, ratios:[1.0,0.7,0.3] },
    stats:{ dmg:{base:30,cP:3,lP:10}, atkInt:{base:0.7,cM:0.02,lM:0}, chainDmg:{base:30,cP:3,lP:20} } },
  poison:      { name:"독",     border:"#44AA00", bg:"#88DD44", target:"noPoison",
    ability:{ type:"poison", tick:1.0 },
    stats:{ dmg:{base:20,cP:2,lP:10}, atkInt:{base:1.3,cM:0,lM:0}, dotDps:{base:50,cP:5,lP:25} } },
  ice:         { name:"얼음",   border:"#0088EE", bg:"#55CCFF", target:"first",
    ability:{ type:"slow", maxStacks:3 },
    stats:{ dmg:{base:30,cP:3,lP:30}, atkInt:{base:1.5,cM:0.02,lM:0}, slowPct:{base:5,cP:0.5,lP:2} } },
  steel:       { name:"쇠",     border:"#666666", bg:"#AAAAAA", target:"strongest",
    ability:{ type:"bossKiller", mult:2.0 },
    stats:{ dmg:{base:100,cP:10,lP:100}, atkInt:{base:1.0,cM:0,lM:0} } },
  broken:      { name:"고장난", border:"#AA44CC", bg:"#CC88EE", target:"random",
    ability:{ type:"none" },
    stats:{ dmg:{base:50,cP:10,lP:50}, atkInt:{base:0.9,cM:0,lM:0} } },
  gamble:      { name:"도박",   border:"#4422CC", bg:"#8866EE", target:"first",
    ability:{ type:"randomDmg" },
    stats:{ dmg:{base:7,cP:10,lP:77}, atkInt:{base:1.0,cM:0.01,lM:0} } },
  lock:        { name:"잠금",   border:"#334488", bg:"#667799", target:"first",
    ability:{ type:"lock" },
    stats:{ dmg:{base:30,cP:5,lP:20}, atkInt:{base:0.8,cM:0.01,lM:0}, lockProb:{base:4,cP:1,lP:2}, lockDur:{base:3,cP:0.2,lP:0.5} } },
  wind:        { name:"바람",   border:"#00AA88", bg:"#44DDBB", target:"first",
    ability:{ type:"windBuff" },
    stats:{ dmg:{base:20,cP:3,lP:15}, atkInt:{base:0.45,cM:0,lM:0}, speedBuff:{base:10,cP:2,lP:10} } },
  // ── 희귀 등급 ──
  gamblegrowth:{ name:"도박성장", border:"#BB8800", bg:"#FFDD44", target:"first", minClass:3,
    ability:{ type:"gamblegrowth" },
    stats:{ dmg:{base:30,cP:0,lP:0}, atkInt:{base:1.0,cM:0,lM:0}, growthTime:{base:45,cM:1,lM:1} } },
  // ── 전설 등급 ──
  joker:       { name:"조커",   border:"#RAINBOW", bg:"#FFFFFF", target:"first", minClass:7,
    ability:{ type:"joker" },
    stats:{ dmg:{base:40,cP:5,lP:10}, atkInt:{base:1.5,cM:0,lM:0} } },
  growth:      { name:"성장",   border:"#7700CC", bg:"#BB66FF", target:"first", minClass:7,
    ability:{ type:"growth" },
    stats:{ dmg:{base:10,cP:5,lP:10}, atkInt:{base:2.0,cM:0,lM:0}, growthTime:{base:21,cM:1,lM:0} } },
  // ── 희귀 등급 (추가) ──
  light:       { name:"빛",     border:"#DDB800", bg:"#FFFFD0", target:"none", minClass:3,
    ability:{ type:"lightAura" },
    stats:{ atkInt:{base:9999} } },
  // ── 전설 등급 (추가) ──
  sun:         { name:"태양",   border:"#886633", bg:"#DDAA66", target:"first", minClass:7,
    ability:{ type:"sun", splashRadius:CELL*0.9 },
    stats:{ dmg:{base:40,cP:5,lP:11}, atkInt:{base:1.2,cM:0,lM:0}, splashDmg:{base:40,cP:5,lP:11} } },
  combo:       { name:"콤보",   border:"#CC1188", bg:"#FFDDEE", target:"first", minClass:7,
    ability:{ type:"combo" },
    stats:{ dmg:{base:50,cP:10,lP:10}, atkInt:{base:1.2,cM:0,lM:0}, comboDmg:{base:8,cP:2,lP:1} } },
  moon:        { name:"달",     border:"#888888", bg:"#DDDDDD", target:"none", minClass:7,
    ability:{ type:"moonAura" },
    stats:{ atkInt:{base:9999} } },
  // ── 영웅 등급 ──
  adapt:       { name:"적응",   border:"#RAINBOW", bg:"#FFFFFF", target:"first", minClass:5,
    ability:{ type:"adapt" },
    stats:{ dmg:{base:20,cP:5,lP:10}, atkInt:{base:1.0,cM:0,lM:0} } },
  // ── 전설 등급 ──
  summon:      { name:"소환",   border:"#009944", bg:"#88FFAA", target:"first", minClass:7,
    ability:{ type:"summon" },
    stats:{ dmg:{base:10,cP:10,lP:10}, atkInt:{base:1.5,cM:0,lM:0} } },
};
const DICE_KEYS = Object.keys(DICE_DEFS);
const LV_COST = [100, 200, 400, 700];

// ═══════════════════════════════════════════════════════════════
//  SVG DICE
// ═══════════════════════════════════════════════════════════════
// 3x3 그리드 위치 (1~9): 1=좌상, 2=중상, 3=우상, 4=좌중, 5=중, 6=우중, 7=좌하, 8=중하, 9=우하
const G = [null,[25,25],[50,25],[75,25],[25,50],[50,50],[75,50],[25,75],[50,75],[75,75]];
const DOT_LAYOUTS = {
  1:[G[5]],
  2:[G[3],G[7]],
  3:[G[3],G[5],G[7]],
  4:[G[1],G[3],G[7],G[9]],
  5:[G[1],G[3],G[5],G[7],G[9]],
  6:[G[1],G[3],G[4],G[6],G[7],G[9]],
  7:"star",
};

function StarDot({ size, color }) {
  const S = size;
  const cx = S/2, cy = S/2, R = S*0.28, r = S*0.12;
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = (i * 36 - 90) * Math.PI / 180;
    const rad = i % 2 === 0 ? R : r;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`);
  }
  return (
    <polygon points={pts.join(" ")} fill={color}
      style={{ filter: `drop-shadow(0 0 ${S*0.04}px rgba(0,0,0,0.4))` }} />
  );
}

function DotLayer({ dot, color, size }) {
  if (dot === 7) return <StarDot size={size} color={color} />;
  const pos = DOT_LAYOUTS[dot] || DOT_LAYOUTS[1];
  const r = size * (dot <= 2 ? 0.075 : dot <= 4 ? 0.068 : 0.06);
  return (
    <>
      {pos.map(([px, py], i) => (
        <circle key={i}
          cx={(px / 100) * size} cy={(py / 100) * size} r={r}
          fill="#222"
          style={{ filter: `drop-shadow(0 ${size*0.012}px ${size*0.02}px rgba(0,0,0,0.25))` }}
        />
      ))}
    </>
  );
}

let _dcCtr = 0;
function DiceCard({ size, border, children }) {
  const uid = useRef(`dc${_dcCtr++}`).current;
  const S = size;
  const rx = S * 0.2;
  const pad = S * 0.1;
  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{ display:"block" }}>
      <defs>
        <linearGradient id={`inner_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F0F2F8" />
        </linearGradient>
        <linearGradient id={`glim_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="white" stopOpacity="0.0" />
          <stop offset="35%"  stopColor="white" stopOpacity="0.7" />
          <stop offset="52%"  stopColor="white" stopOpacity="0.7" />
          <stop offset="100%" stopColor="white" stopOpacity="0.0" />
        </linearGradient>
        <filter id={`sh_${uid}`} x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy={S*0.025} stdDeviation={S*0.04} floodColor="rgba(0,0,0,0.28)" />
        </filter>
        <clipPath id={`clip_${uid}`}>
          <rect x={pad} y={pad} width={S-pad*2} height={S-pad*2} rx={rx*0.65}/>
        </clipPath>
      </defs>
      <rect x="1" y="1" width={S-2} height={S-2} rx={rx}
        fill={border} filter={`url(#sh_${uid})`}/>
      <rect x={pad} y={pad} width={S-pad*2} height={S-pad*2} rx={rx*0.65}
        fill={`url(#inner_${uid})`}/>
      <g clipPath={`url(#clip_${uid})`}>
        {children}
      </g>
      <rect x={pad} y={pad} width={S-pad*2} height={S-pad*2} rx={rx*0.65}
        fill={`url(#glim_${uid})`}/>
    </svg>
  );
}

function GakNakBorder({ S }) {
  const arm = S * 0.44, sw = S * 0.078, dc = "#C8A000", h = sw / 2;
  // ㄱ: 우측상단 꺾쇠 (상단 수평 + 우측 수직)
  const gPath = `M${S - arm},${h} L${S - h},${h} L${S - h},${arm}`;
  // ㄴ: 좌측하단 꺾쇠 (좌측 수직 + 하단 수평)
  const nPath = `M${h},${S - arm} L${h},${S - h} L${arm},${S - h}`;
  return (
    <>
      <path d={gPath} fill="none" stroke={dc} strokeWidth={sw} strokeLinecap="square" strokeLinejoin="miter" opacity="0.95"/>
      <path d={nPath} fill="none" stroke={dc} strokeWidth={sw} strokeLinecap="square" strokeLinejoin="miter" opacity="0.95"/>
    </>
  );
}

function DiceCardLegend({ size, children }) {
  const uid = useRef(`dcl${_dcCtr++}`).current;
  const S = size, rx = S * 0.2, pad = S * 0.1;
  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{ display:"block" }}>
      <defs>
        <linearGradient id={`inner_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F0F2F8" />
        </linearGradient>
        <linearGradient id={`glim_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="white" stopOpacity="0.0" />
          <stop offset="35%"  stopColor="white" stopOpacity="0.7" />
          <stop offset="52%"  stopColor="white" stopOpacity="0.7" />
          <stop offset="100%" stopColor="white" stopOpacity="0.0" />
        </linearGradient>
        <filter id={`sh_${uid}`} x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy={S*0.025} stdDeviation={S*0.04} floodColor="rgba(0,0,0,0.28)" />
        </filter>
        <clipPath id={`clip_${uid}`}>
          <rect x={pad} y={pad} width={S-pad*2} height={S-pad*2} rx={rx*0.65}/>
        </clipPath>
      </defs>
      <rect x="0" y="0" width={S} height={S} rx={rx} fill="#F2EED8" filter={`url(#sh_${uid})`}/>
      <GakNakBorder S={S}/>
      <rect x={pad} y={pad} width={S-pad*2} height={S-pad*2} rx={rx*0.65}
        fill={`url(#inner_${uid})`}/>
      <g clipPath={`url(#clip_${uid})`}>
        {children}
      </g>
      <rect x={pad} y={pad} width={S-pad*2} height={S-pad*2} rx={rx*0.65}
        fill={`url(#glim_${uid})`}/>
    </svg>
  );
}

function DiceFire({ size=60, dot=1 }) {
  const S=size, b=DICE_DEFS.fire.border;
  return (
    <DiceCard size={S} border={b}>
      <path d={`M${S*.5},${S*.12} C${S*.5},${S*.12} ${S*.68},${S*.28} ${S*.66},${S*.42} C${S*.74},${S*.34} ${S*.76},${S*.22} ${S*.72},${S*.14} C${S*.82},${S*.26} ${S*.84},${S*.42} ${S*.78},${S*.54} C${S*.84},${S*.5} ${S*.86},${S*.4} ${S*.84},${S*.32} C${S*.9},${S*.44} ${S*.88},${S*.62} ${S*.78},${S*.7} C${S*.84},${S*.68} ${S*.86},${S*.6} ${S*.85},${S*.52} C${S*.9},${S*.64} ${S*.87},${S*.78} ${S*.76},${S*.84} C${S*.66},${S*.9} ${S*.58},${S*.88} ${S*.5},${S*.88} C${S*.42},${S*.88} ${S*.34},${S*.9} ${S*.24},${S*.84} C${S*.13},${S*.78} ${S*.1},${S*.64} ${S*.15},${S*.52} C${S*.14},${S*.6} ${S*.16},${S*.68} ${S*.22},${S*.7} C${S*.12},${S*.62} ${S*.1},${S*.44} ${S*.16},${S*.32} C${S*.15},${S*.4} ${S*.16},${S*.5} ${S*.22},${S*.54} C${S*.16},${S*.42} ${S*.18},${S*.26} ${S*.28},${S*.14} C${S*.24},${S*.22} ${S*.26},${S*.34} ${S*.34},${S*.42} C${S*.32},${S*.28} ${S*.5},${S*.12} Z`}
        fill={b} opacity="0.22"/>
      <path d={`M${S*.5},${S*.18} C${S*.5},${S*.18} ${S*.62},${S*.3} ${S*.6},${S*.4} C${S*.66},${S*.34} ${S*.67},${S*.25} ${S*.65},${S*.2} C${S*.72},${S*.3} ${S*.72},${S*.42} ${S*.66},${S*.5} C${S*.7},${S*.48} ${S*.71},${S*.4} ${S*.7},${S*.34} C${S*.74},${S*.44} ${S*.72},${S*.58} ${S*.64},${S*.66} C${S*.68},${S*.64} ${S*.69},${S*.56} ${S*.68},${S*.5} C${S*.72},${S*.6} ${S*.69},${S*.72} ${S*.6},${S*.78} C${S*.54},${S*.82} ${S*.5},${S*.82} ${S*.46},${S*.82} C${S*.4},${S*.82} ${S*.36},${S*.82} ${S*.32},${S*.77} C${S*.26},${S*.7} ${S*.26},${S*.6} ${S*.3},${S*.5} C${S*.29},${S*.56} ${S*.3},${S*.64} ${S*.34},${S*.66} C${S*.26},${S*.58} ${S*.24},${S*.44} ${S*.28},${S*.34} C${S*.27},${S*.4} ${S*.28},${S*.48} ${S*.32},${S*.5} C${S*.26},${S*.42} ${S*.26},${S*.3} ${S*.34},${S*.2} C${S*.32},${S*.25} ${S*.32},${S*.34} ${S*.38},${S*.4} C${S*.36},${S*.3} ${S*.5},${S*.18} Z`}
        fill={b} opacity="0.28"/>
      <DotLayer dot={dot} color={b} size={S}/>
    </DiceCard>
  );
}

function DiceElectric({ size=60, dot=1 }) {
  const S=size, b=DICE_DEFS.electric.border;
  const zz = (points) => <polyline points={points} fill="none" stroke={b} strokeWidth={S*0.045} strokeLinejoin="round" opacity="0.5"/>;
  return (
    <DiceCard size={S} border={b}>
      {zz(`${S*.09},${S*.15} ${S*.18},${S*.09} ${S*.27},${S*.15} ${S*.36},${S*.09} ${S*.45},${S*.15} ${S*.54},${S*.09} ${S*.63},${S*.15} ${S*.72},${S*.09} ${S*.81},${S*.15} ${S*.91},${S*.09}`)}
      {zz(`${S*.09},${S*.85} ${S*.18},${S*.91} ${S*.27},${S*.85} ${S*.36},${S*.91} ${S*.45},${S*.85} ${S*.54},${S*.91} ${S*.63},${S*.85} ${S*.72},${S*.91} ${S*.81},${S*.85} ${S*.91},${S*.91}`)}
      {zz(`${S*.15},${S*.09} ${S*.09},${S*.18} ${S*.15},${S*.27} ${S*.09},${S*.36} ${S*.15},${S*.45} ${S*.09},${S*.54} ${S*.15},${S*.63} ${S*.09},${S*.72} ${S*.15},${S*.81} ${S*.09},${S*.91}`)}
      {zz(`${S*.85},${S*.09} ${S*.91},${S*.18} ${S*.85},${S*.27} ${S*.91},${S*.36} ${S*.85},${S*.45} ${S*.91},${S*.54} ${S*.85},${S*.63} ${S*.91},${S*.72} ${S*.85},${S*.81} ${S*.91},${S*.91}`)}
      <DotLayer dot={dot} color={b} size={S}/>
    </DiceCard>
  );
}

function DicePoison({ size=60, dot=1 }) {
  const S=size, b=DICE_DEFS.poison.border;
  const blobBorder = `M${S*.5},${S*.04} C${S*.62},${S*.04} ${S*.7},${S*.06} ${S*.78},${S*.1} C${S*.88},${S*.14} ${S*.96},${S*.22} ${S*.96},${S*.32} C${S*.97},${S*.4} ${S*.94},${S*.46} ${S*.96},${S*.54} C${S*.98},${S*.62} ${S*.96},${S*.72} ${S*.9},${S*.8} C${S*.84},${S*.88} ${S*.74},${S*.93} ${S*.64},${S*.95} C${S*.56},${S*.97} ${S*.48},${S*.95} ${S*.4},${S*.96} C${S*.32},${S*.97} ${S*.22},${S*.95} ${S*.14},${S*.9} C${S*.06},${S*.85} ${S*.02},${S*.76} ${S*.02},${S*.66} C${S*.01},${S*.58} ${S*.04},${S*.5} ${S*.02},${S*.42} C${S*.0},${S*.34} ${S*.02},${S*.24} ${S*.08},${S*.16} C${S*.14},${S*.08} ${S*.24},${S*.04} ${S*.34},${S*.04} C${S*.4},${S*.04} ${S*.46},${S*.04} ${S*.5},${S*.04} Z`;
  return (
    <DiceCard size={S} border={b}>
      <path d={blobBorder} fill={b} opacity="0.32"/>
      {[[S*.18,S*.22,S*.07],[S*.8,S*.18,S*.06],[S*.15,S*.75,S*.05],[S*.82,S*.78,S*.08]].map(([cx,cy,r],i)=>(
        <circle key={i} cx={cx} cy={cy} r={r} fill={b} opacity="0.48"/>
      ))}
      <DotLayer dot={dot} color={b} size={S}/>
    </DiceCard>
  );
}

function DiceIce({ size=60, dot=1 }) {
  const S=size, b=DICE_DEFS.ice.border;
  const spikes = (pts) => <polyline points={pts} fill={b} opacity="0.58"/>;
  const topSpike=`${S*.08},${S*.13} ${S*.14},${S*.08} ${S*.2},${S*.14} ${S*.26},${S*.08} ${S*.32},${S*.14} ${S*.38},${S*.08} ${S*.44},${S*.14} ${S*.5},${S*.08} ${S*.56},${S*.14} ${S*.62},${S*.08} ${S*.68},${S*.14} ${S*.74},${S*.08} ${S*.8},${S*.14} ${S*.86},${S*.08} ${S*.92},${S*.13}`;
  const botSpike=`${S*.08},${S*.87} ${S*.14},${S*.92} ${S*.2},${S*.86} ${S*.26},${S*.92} ${S*.32},${S*.86} ${S*.38},${S*.92} ${S*.44},${S*.86} ${S*.5},${S*.92} ${S*.56},${S*.86} ${S*.62},${S*.92} ${S*.68},${S*.86} ${S*.74},${S*.92} ${S*.8},${S*.86} ${S*.86},${S*.92} ${S*.92},${S*.87}`;
  const leftSpike=`${S*.13},${S*.08} ${S*.08},${S*.14} ${S*.14},${S*.2} ${S*.08},${S*.26} ${S*.14},${S*.32} ${S*.08},${S*.38} ${S*.14},${S*.44} ${S*.08},${S*.5} ${S*.14},${S*.56} ${S*.08},${S*.62} ${S*.14},${S*.68} ${S*.08},${S*.74} ${S*.14},${S*.8} ${S*.08},${S*.86} ${S*.13},${S*.92}`;
  const rightSpike=`${S*.87},${S*.08} ${S*.92},${S*.14} ${S*.86},${S*.2} ${S*.92},${S*.26} ${S*.86},${S*.32} ${S*.92},${S*.38} ${S*.86},${S*.44} ${S*.92},${S*.5} ${S*.86},${S*.56} ${S*.92},${S*.62} ${S*.86},${S*.68} ${S*.92},${S*.74} ${S*.86},${S*.8} ${S*.92},${S*.86} ${S*.87},${S*.92}`;
  return (
    <DiceCard size={S} border={b}>
      {spikes(topSpike)}{spikes(botSpike)}{spikes(leftSpike)}{spikes(rightSpike)}
      <DotLayer dot={dot} color={b} size={S}/>
    </DiceCard>
  );
}

function DiceSteel({ size=60, dot=1 }) {
  const S=size, b=DICE_DEFS.steel.border;
  const cx=S/2, cy=S/2;
  const gearPath = () => {
    const OR=S*.3, IR=S*.2, teeth=8;
    let d="";
    for(let i=0;i<teeth;i++){
      const a0=(i/teeth)*Math.PI*2-Math.PI/2;
      const a1=a0+(0.35/teeth)*Math.PI*2;
      const a2=a0+(0.65/teeth)*Math.PI*2;
      const a3=a0+(1/teeth)*Math.PI*2;
      const pt=(r,a)=>[(cx+r*Math.cos(a)).toFixed(2),(cy+r*Math.sin(a)).toFixed(2)];
      const [x0,y0]=pt(IR,a0),[x1,y1]=pt(OR,a1),[x2,y2]=pt(OR,a2),[x3,y3]=pt(IR,a3);
      if(i===0) d+=`M${x0},${y0} `;
      d+=`L${x1},${y1} L${x2},${y2} L${x3},${y3} `;
    }
    return d+"Z";
  };
  return (
    <DiceCard size={S} border={b}>
      <path d={gearPath()} fill={b} opacity="0.48"/>
      <circle cx={cx} cy={cy} r={S*.1} fill={b} opacity="0.62"/>
      <DotLayer dot={dot} color={b} size={S}/>
    </DiceCard>
  );
}

function DiceBroken({ size=60, dot=1 }) {
  const S=size, b=DICE_DEFS.broken.border;
  const arr=(x,y,dir)=>{
    const d={
      up:`M${x},${y+S*.07} L${x},${y-S*.07} M${x-S*.05},${y-S*.03} L${x},${y-S*.07} L${x+S*.05},${y-S*.03}`,
      down:`M${x},${y-S*.07} L${x},${y+S*.07} M${x-S*.05},${y+S*.03} L${x},${y+S*.07} L${x+S*.05},${y+S*.03}`,
      left:`M${x+S*.07},${y} L${x-S*.07},${y} M${x-S*.03},${y-S*.05} L${x-S*.07},${y} L${x-S*.03},${y+S*.05}`,
      right:`M${x-S*.07},${y} L${x+S*.07},${y} M${x+S*.03},${y-S*.05} L${x+S*.07},${y} L${x+S*.03},${y+S*.05}`,
    };
    return <path d={d[dir]} fill="none" stroke={b} strokeWidth={S*0.04} strokeLinecap="round" strokeLinejoin="round" opacity="0.55"/>;
  };
  return (
    <DiceCard size={S} border={b}>
      {arr(S*.18,S*.5,"left")}{arr(S*.82,S*.5,"right")}
      {arr(S*.5,S*.18,"up")}{arr(S*.5,S*.82,"down")}
      {arr(S*.18,S*.25,"up")}{arr(S*.82,S*.25,"up")}
      {arr(S*.18,S*.75,"down")}{arr(S*.82,S*.75,"down")}
      <DotLayer dot={dot} color={b} size={S}/>
    </DiceCard>
  );
}

function DiceGamble({ size=60, dot=1 }) {
  const S=size, b=DICE_DEFS.gamble.border;
  const qps=[[S*.15,S*.18],[S*.5,S*.13],[S*.85,S*.18],[S*.13,S*.5],[S*.87,S*.5],[S*.15,S*.82],[S*.5,S*.87],[S*.85,S*.82],[S*.28,S*.33],[S*.72,S*.33],[S*.28,S*.67],[S*.72,S*.67]];
  return (
    <DiceCard size={S} border={b}>
      {qps.map(([x,y],i)=>(
        <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
          fontSize={S*.14} fontWeight="900" fill={b} opacity="0.62"
          style={{fontFamily:"Arial Black,Arial,sans-serif"}}>?</text>
      ))}
      <DotLayer dot={dot} color={b} size={S}/>
    </DiceCard>
  );
}

function DiceLock({ size=60, dot=1 }) {
  const S=size, b=DICE_DEFS.lock.border;
  const bw=S*.28, bh=S*.24, bx=S*.5-bw/2, by=S*.52;
  return (
    <DiceCard size={S} border={b}>
      <rect x={bx} y={by} width={bw} height={bh} rx={S*.04} fill={b} opacity="0.52"/>
      <path d={`M${S*.36},${by} L${S*.36},${S*.3} Q${S*.36},${S*.2} ${S*.5},${S*.2} Q${S*.64},${S*.2} ${S*.64},${S*.3} L${S*.64},${S*.3}`}
        fill="none" stroke={b} strokeWidth={S*.07} strokeLinecap="round" opacity="0.45"/>
      <circle cx={S*.5} cy={by+bh*.38} r={S*.05} fill={b} opacity="0.58"/>
      <rect x={S*.47} y={by+bh*.44} width={S*.06} height={S*.08} rx={S*.02} fill={b} opacity="0.58"/>
      <DotLayer dot={dot} color={b} size={S}/>
    </DiceCard>
  );
}

function DiceWind({ size=60, dot=1 }) {
  const S=size, b=DICE_DEFS.wind.border;
  return (
    <DiceCard size={S} border={b}>
      <path d={`M${S*.1},${S*.28} Q${S*.3},${S*.15} ${S*.55},${S*.25} Q${S*.75},${S*.35} ${S*.65},${S*.45} Q${S*.55},${S*.55} ${S*.35},${S*.5}`}
        fill="none" stroke={b} strokeWidth={S*.045} strokeLinecap="round" opacity="0.65"/>
      <path d={`M${S*.1},${S*.45} Q${S*.3},${S*.32} ${S*.58},${S*.42} Q${S*.78},${S*.52} ${S*.68},${S*.62} Q${S*.58},${S*.72} ${S*.38},${S*.67}`}
        fill="none" stroke={b} strokeWidth={S*.04} strokeLinecap="round" opacity="0.58"/>
      <path d={`M${S*.15},${S*.62} Q${S*.32},${S*.52} ${S*.55},${S*.6} Q${S*.72},${S*.68} ${S*.65},${S*.78}`}
        fill="none" stroke={b} strokeWidth={S*.035} strokeLinecap="round" opacity="0.5"/>
      <DotLayer dot={dot} color={b} size={S}/>
    </DiceCard>
  );
}

function DiceGambleGrowth({ size=60, dot=1 }) {
  const S=size, b="#BB8800";
  return (
    <DiceCard size={S} border={b}>
      {[[S*.25,S*.3],[S*.75,S*.3],[S*.25,S*.7],[S*.75,S*.7]].map(([x,y],i)=>(
        <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
          fontSize={S*.18} fontWeight="900" fill={b} opacity="0.52"
          style={{fontFamily:"Arial Black,Arial,sans-serif"}}>?</text>
      ))}
      <path d={`M${S*.5},${S*.14} L${S*.5},${S*.56} M${S*.36},${S*.28} L${S*.5},${S*.14} L${S*.64},${S*.28}`}
        fill="none" stroke={b} strokeWidth={S*.052} strokeLinecap="round" strokeLinejoin="round" opacity="0.7"/>
      <DotLayer dot={dot} color={b} size={S}/>
    </DiceCard>
  );
}

function DiceJoker({ size=60, dot=1 }) {
  const S=size;
  const uid = useRef(`jk${_dcCtr++}`).current;
  const rx = S*0.2, pad = S*0.1;
  const rainbowStops = ["#FF0000","#FF8800","#FFEE00","#00CC00","#0088FF","#8800DD","#FF00AA"];
  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{display:"block"}}>
      <defs>
        <linearGradient id={`rbow_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          {rainbowStops.map((c,i)=><stop key={i} offset={`${i*100/6}%`} stopColor={c}/>)}
        </linearGradient>
        <linearGradient id={`glimj_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="white" stopOpacity="0.0"/>
          <stop offset="35%"  stopColor="white" stopOpacity="0.7"/>
          <stop offset="52%"  stopColor="white" stopOpacity="0.7"/>
          <stop offset="100%" stopColor="white" stopOpacity="0.0"/>
        </linearGradient>
        <filter id={`shj_${uid}`} x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy={S*0.025} stdDeviation={S*0.04} floodColor="rgba(0,0,0,0.28)"/>
        </filter>
        <clipPath id={`clipj_${uid}`}>
          <rect x={pad} y={pad} width={S-pad*2} height={S-pad*2} rx={rx*0.65}/>
        </clipPath>
      </defs>
      <rect x="0" y="0" width={S} height={S} rx={rx} fill="#F2EED8" filter={`url(#shj_${uid})`}/>
      <GakNakBorder S={S}/>
      <rect x={pad} y={pad} width={S-pad*2} height={S-pad*2} rx={rx*0.65} fill="#FFFFFF"/>
      <g clipPath={`url(#clipj_${uid})`}>
        <text x={S*.5} y={S*.47} textAnchor="middle" dominantBaseline="middle"
          fontSize={S*.55} fontWeight="900" fill={`url(#rbow_${uid})`} opacity="0.85"
          style={{fontFamily:"Arial Black,Arial,sans-serif"}}>∞</text>
        <DotLayer dot={dot} color="#888" size={S}/>
      </g>
      <rect x={pad} y={pad} width={S-pad*2} height={S-pad*2} rx={rx*0.65} fill={`url(#glimj_${uid})`}/>
    </svg>
  );
}

function DiceGrowth({ size=60, dot=1 }) {
  const S=size, b="#7700CC";
  const bars=[[S*.15,S*.76,S*.15,S*.18],[S*.38,S*.76,S*.15,S*.34],[S*.61,S*.76,S*.15,S*.5]];
  return (
    <DiceCardLegend size={S}>
      {bars.map(([x,y,w,h],i)=>(
        <rect key={i} x={x} y={y-h} width={w} height={h} rx={S*.02} fill={b} opacity={0.3+i*.12}/>
      ))}
      <path d={`M${S*.5},${S*.09} L${S*.5},${S*.52} M${S*.34},${S*.24} L${S*.5},${S*.09} L${S*.66},${S*.24}`}
        fill="none" stroke={b} strokeWidth={S*.048} strokeLinecap="round" strokeLinejoin="round" opacity="0.62"/>
      <DotLayer dot={dot} color={b} size={S}/>
    </DiceCardLegend>
  );
}

function DiceLight({ size=60, dot=1 }) {
  const S=size, b="#DDB800";
  const cx=S*.5, cy=S*.5;
  const rays=8;
  const rayPaths=[];
  for(let i=0;i<rays;i++){
    const a=(i/rays)*Math.PI*2;
    const r1=S*.22, r2=S*.42;
    rayPaths.push(`M${(cx+r1*Math.cos(a)).toFixed(2)},${(cy+r1*Math.sin(a)).toFixed(2)} L${(cx+r2*Math.cos(a)).toFixed(2)},${(cy+r2*Math.sin(a)).toFixed(2)}`);
  }
  return (
    <DiceCard size={S} border={b}>
      {rayPaths.map((d,i)=><path key={i} d={d} stroke={b} strokeWidth={S*.048} strokeLinecap="round" opacity="0.6"/>)}
      <circle cx={cx} cy={cy} r={S*.18} fill={b} opacity="0.72"/>
      <DotLayer dot={dot} color={b} size={S}/>
    </DiceCard>
  );
}

function DiceSun({ size=60, dot=1, active=false }) {
  const S=size, b=active?"#DD5500":"#886633";
  const cx=S*.5, cy=S*.5;
  const pts=[];
  for(let i=0;i<12;i++){
    const a=(i/12)*Math.PI*2 - Math.PI/2;
    const r=i%2===0?S*.42:S*.28;
    pts.push(`${(cx+r*Math.cos(a)).toFixed(2)},${(cy+r*Math.sin(a)).toFixed(2)}`);
  }
  return (
    <DiceCardLegend size={S}>
      <polygon points={pts.join(" ")} fill={b} opacity="0.38"/>
      <circle cx={cx} cy={cy} r={S*.22} fill={b} opacity="0.6"/>
      <circle cx={cx} cy={cy} r={S*.13} fill={b} opacity="0.82"/>
      <DotLayer dot={dot} color={b} size={S}/>
    </DiceCardLegend>
  );
}

function DiceCombo({ size=60, dot=1, comboCount=0 }) {
  const S=size, b="#CC1188";
  const digits = String(comboCount).length;
  const fs = digits >= 4 ? S*.32 : digits === 3 ? S*.4 : digits === 2 ? S*.52 : S*.68;
  return (
    <DiceCardLegend size={S}>
      <text x={S*.5} y={S*.43} textAnchor="middle" dominantBaseline="middle"
        fontSize={fs} fontWeight="900" fill={b} opacity="0.45"
        textLength={S*0.78} lengthAdjust="spacingAndGlyphs"
        style={{fontFamily:"Arial Black,Arial,sans-serif"}}>{comboCount}</text>
      <DotLayer dot={dot} color={b} size={S}/>
    </DiceCardLegend>
  );
}

function DiceMoon({ size=60, dot=1, active=false, moonCount=0 }) {
  const S=size;
  const uidRef = useRef(`mn${_dcCtr++}`).current;
  const b = active ? "#44AADD" : "#888888";
  const cx=S*.5, cy=S*.5, rx=S*.2, pad=S*.1;
  const phase = moonCount<=3?"crescent":moonCount<=5?"half":"full";
  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{display:"block"}}>
      <defs>
        <linearGradient id={`imn_${uidRef}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF"/>
          <stop offset="100%" stopColor={active?"#DDEEFF":"#F0F0F0"}/>
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
      <GakNakBorder S={S}/>
      <rect x={pad} y={pad} width={S-pad*2} height={S-pad*2} rx={rx*.65} fill={`url(#imn_${uidRef})`}/>
      <g clipPath={`url(#cmn_${uidRef})`}>
        {phase==="full" && <circle cx={cx} cy={cy} r={S*.28} fill={b} opacity="0.72"/>}
        {phase==="half" && <circle cx={cx} cy={cy} r={S*.28} fill={b} opacity="0.72" clipPath={`url(#hmn_${uidRef})`}/>}
        {phase==="crescent" && <>
          <circle cx={cx} cy={cy} r={S*.28} fill={b} opacity="0.72"/>
          <circle cx={cx+S*.17} cy={cy-S*.02} r={S*.25} fill="rgba(255,255,255,0.96)"/>
        </>}
        <DotLayer dot={dot} color={b} size={S}/>
      </g>
      <rect x={pad} y={pad} width={S-pad*2} height={S-pad*2} rx={rx*.65} fill={`url(#gmn_${uidRef})`}/>
    </svg>
  );
}

function DiceAdapt({ size=60, dot=1 }) {
  const S=size;
  const uid = useRef(`adp${_dcCtr++}`).current;
  const rx = S*0.2, pad = S*0.1;
  const cx=S*.5, cy=S*.42;
  const inf = `M${cx},${cy} C${cx-S*.1},${cy-S*.18} ${cx-S*.38},${cy-S*.18} ${cx-S*.28},${cy} C${cx-S*.38},${cy+S*.18} ${cx-S*.1},${cy+S*.18} ${cx},${cy} C${cx+S*.1},${cy-S*.18} ${cx+S*.38},${cy-S*.18} ${cx+S*.28},${cy} C${cx+S*.38},${cy+S*.18} ${cx+S*.1},${cy+S*.18} ${cx},${cy} Z`;
  const rainbowStops = ["#FF0000","#FF8800","#FFEE00","#00CC00","#0088FF","#8800DD","#FF00AA"];
  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{display:"block"}}>
      <defs>
        <linearGradient id={`rbowa_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          {rainbowStops.map((c,i)=><stop key={i} offset={`${i*100/6}%`} stopColor={c}/>)}
        </linearGradient>
        <linearGradient id={`glima_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="white" stopOpacity="0.0"/>
          <stop offset="35%"  stopColor="white" stopOpacity="0.7"/>
          <stop offset="52%"  stopColor="white" stopOpacity="0.7"/>
          <stop offset="100%" stopColor="white" stopOpacity="0.0"/>
        </linearGradient>
        <filter id={`sha_${uid}`} x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy={S*0.025} stdDeviation={S*0.04} floodColor="rgba(0,0,0,0.28)"/>
        </filter>
        <clipPath id={`clipa_${uid}`}>
          <rect x={pad} y={pad} width={S-pad*2} height={S-pad*2} rx={rx*0.65}/>
        </clipPath>
      </defs>
      <rect x="1" y="1" width={S-2} height={S-2} rx={rx} fill={`url(#rbowa_${uid})`} filter={`url(#sha_${uid})`}/>
      <rect x={pad} y={pad} width={S-pad*2} height={S-pad*2} rx={rx*0.65} fill="#FFFFFF"/>
      <g clipPath={`url(#clipa_${uid})`}>
        <path d={inf} fill={`url(#rbowa_${uid})`} opacity="0.25"/>
        <path d={inf} fill="none" stroke={`url(#rbowa_${uid})`} strokeWidth={S*.045} strokeLinecap="round" opacity="0.72"/>
        <DotLayer dot={dot} color="#888" size={S}/>
      </g>
      <rect x={pad} y={pad} width={S-pad*2} height={S-pad*2} rx={rx*0.65} fill={`url(#glima_${uid})`}/>
    </svg>
  );
}

function DiceSummon({ size=60, dot=1 }) {
  const S=size, b="#009944";
  const cx=S*.5, cy=S*.5;
  const pPts = Array.from({length:5},(_,i)=>{
    const a=(i*72-90)*Math.PI/180;
    return [cx+S*.24*Math.cos(a), cy+S*.24*Math.sin(a)];
  });
  const starPts = [0,2,4,1,3,0].map(i=>`${pPts[i][0].toFixed(2)},${pPts[i][1].toFixed(2)}`).join(" ");
  return (
    <DiceCardLegend size={S}>
      <circle cx={cx} cy={cy} r={S*.32} fill="none" stroke={b} strokeWidth={S*.022} opacity="0.38"/>
      <circle cx={cx} cy={cy} r={S*.24} fill="none" stroke={b} strokeWidth={S*.018} opacity="0.48"/>
      <polyline points={starPts} fill="none" stroke={b} strokeWidth={S*.032} strokeLinejoin="round" opacity="0.58"/>
      <circle cx={cx} cy={cy} r={S*.09} fill={b} opacity="0.68"/>
      <DotLayer dot={dot} color={b} size={S}/>
    </DiceCardLegend>
  );
}

const DICE_SVG = { fire:DiceFire, electric:DiceElectric, poison:DicePoison, ice:DiceIce, steel:DiceSteel, broken:DiceBroken, gamble:DiceGamble, lock:DiceLock, wind:DiceWind, gamblegrowth:DiceGambleGrowth, joker:DiceJoker, growth:DiceGrowth, light:DiceLight, sun:DiceSun, combo:DiceCombo, moon:DiceMoon, adapt:DiceAdapt, summon:DiceSummon };
function DiceSVG({ type, dot=1, size=56, active=false, comboCount=0, moonCount=0 }) {
  const C = DICE_SVG[type]; return C ? <C size={size} dot={dot} active={active} comboCount={comboCount} moonCount={moonCount}/> : null;
}

// ═══════════════════════════════════════════════════════════════
//  GAME CONSTANTS & HELPERS
// ═══════════════════════════════════════════════════════════════
const MON_SPECS = {
  normal: { w:22, h:22, shape:"rect",   color:"#555566", hpBase:200,  speed:BASE_SPEED,      heartDmg:1, isBoss:false },
  speed:  { w:20, h:20, shape:"circle", color:"#3377CC", hpBase:120,  speed:BASE_SPEED*1.8,  heartDmg:1, isBoss:false },
  big:    { w:34, h:34, shape:"rect",   color:"#334455", hpBase:800,  speed:BASE_SPEED*0.6,  heartDmg:2, isBoss:false },
  boss:   { w:42, h:42, shape:"rect",   color:"#881122", hpBase:25000,speed:BASE_SPEED*0.45, heartDmg:2, isBoss:true  },
};

let _uid = 1;
const uid = () => _uid++;
const rnd = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v,lo,hi) => Math.max(lo, Math.min(hi, v));
const cellKey = (c,r) => `${c},${r}`;
const cellXY = (c,r) => ({ x:(c+1)*CELL+CELL/2, y:(r+1)*CELL+CELL/2 });

// stat = { base, cP?, cM?, lP?, lM? }  cP/cM=클래스당, lP/lM=인게임 파워업당
function getStat(s, classLv, ingameLv) {
  return s.base + (classLv-1)*(s.cP||0) - (classLv-1)*(s.cM||0)
               + (ingameLv-1)*(s.lP||0) - (ingameLv-1)*(s.lM||0);
}
function getSelfSpeedBuff(d, classLv, ingameLv) {
  const def = DICE_DEFS[d.type];
  if (!def.stats.speedBuff) return 0;
  return Math.min(getStat(def.stats.speedBuff, classLv, ingameLv) / 100, 0.95);
}

function addDiceAnim(p, key, type) {
  if (!p.animations) p.animations = [];
  p.animations = p.animations.filter(a => a.key !== key);
  p.animations.push({ key, type, progress: 0, duration: 0.22 });
}

function monSPReward(monType, wave) {
  if (monType === "boss") return wave * 100;
  if (monType === "big")  return wave * 50;
  return wave * 10;
}

function calcBaseHP(wave) {
  return 100 * Math.pow(2, wave - 1);
}

function spawnEnemy(monType, wave) {
  const ms = MON_SPECS[monType];
  const base = calcBaseHP(wave);
  const hp = monType === "big"  ? base * 4
            : monType === "boss" ? base * 20
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

function makePlayer(id, deck, rawClassLevels = {}, critMult = 2) {
  // minClass 미만으로 설정된 값은 minClass로 올려줌
  const classLevels = Object.fromEntries(
    deck.map(t => [t, Math.max(rawClassLevels[t]||1, DICE_DEFS[t]?.minClass||1)])
  );
  return {
    id, deck, sp: 100, summonCost: 10, hearts: 3,
    dice: {}, enemies: [], projs: [], effects: [],
    wave: 1,
    dead: false,
    gameTime: 0, nextBossTime: 90,
    bigTimer: 20,
    killsInInterval: 0, totalKills: 0,
    animations: [],
    bossRound: false,
    comboCount: 0,    // 콤보주사위 합성 카운트
    diceLevels: {},   // 인게임 파워업 레벨 { type: 1~5 }
    classLevels,      // 덱 빌더에서 설정한 클래스 레벨 { type: number }
    critMult,         // 크리티컬 배율 (2~5)
  };
}

function makeDice(type, dot, ingameLv, classLv) {
  const def = DICE_DEFS[type];
  const startDot = (dot !== undefined) ? dot : 1;
  const lvl = ingameLv || 1;
  const clvl = classLv || 1;
  const d = { id: uid(), type, dot: startDot, level: 1, cd: 0, subIdx: 0 };
  if (def.stats.growthTime) {
    d.growthTimer = getStat(def.stats.growthTime, clvl, lvl);
  }
  return d;
}

function pickTarget(enemies, mode) {
  if (!enemies.length) return null;
  if (mode === "first")    return enemies.reduce((a,b) => a.dist < b.dist ? a : b);
  if (mode === "strongest")return enemies.reduce((a,b) => a.hp > b.hp ? a : b);
  if (mode === "noPoison") { const u = enemies.filter(e=>!e.poison); return u.length ? rnd(u) : rnd(enemies); }
  return rnd(enemies);
}

function spawnFx(p, type, x, y, color) {
  p.effects.push({ id:uid(), type, x, y, color, life:0.3, maxLife:0.3 });
}
function spawnTxt(p, x, y, val) {
  p.effects.push({ id:uid(), type:"text", x, y:y-10, text:String(val), life:0.8, maxLife:0.8, vy:-50 });
}

function dealDmg(p, e, dmg) {
  e.hp -= dmg;
}

function applyHit(p, proj, tgt) {
  const def = DICE_DEFS[proj.diceType], ab = def.ability;
  let dmg = proj.dmg;
  if (ab.type === "bossKiller" && tgt.isBoss) dmg *= ab.mult;
  if (ab.type === "randomDmg") {
    dmg = proj.dmg + Math.random() * proj.dmg; // [1x, 2x] 크리티컬 데미지까지
  } else {
    const critChance = 0.05 + (proj.moonActivated ? 0.05 : 0);
    if (Math.random() < critChance) { dmg *= (proj.critMult || 2); spawnFx(p,"burst",tgt.x,tgt.y,"#FFD700"); }
  }
  // 달 활성화: 공격력 +10%
  if (proj.moonActivated) dmg *= 1.10;
  // 태양 체인 데미지 배율
  if (ab.type === "sun") {
    const sunDice = p.dice[proj.diceKey];
    if (sunDice) {
      if (sunDice.sunLastTarget === tgt.id) sunDice.sunHits = (sunDice.sunHits||0)+1;
      else { sunDice.sunHits=1; sunDice.sunLastTarget=tgt.id; }
      dmg *= Math.ceil(sunDice.sunHits/2);
    }
  }
  dealDmg(p, tgt, dmg);
  // 태양 스플래시 (활성화 시: 3,5,7,9개)
  if (ab.type === "sun" && (proj.sunCount||0) >= 3 && (proj.sunCount%2)===1) {
    const sunDice = p.dice[proj.diceKey];
    const sd = getStat(def.stats.splashDmg, proj.classLv, proj.level);
    const sunHits = sunDice?.sunHits || 1;
    const splashR = Math.min(CELL * 0.5 + (sunHits - 1) * CELL * 0.2, CELL * 2.5);
    for (const e of p.enemies) if (e.id!==tgt.id&&e.hp>0&&Math.hypot(e.x-tgt.x,e.y-tgt.y)<=splashR) dealDmg(p,e,sd);
    spawnFx(p,"burst",tgt.x,tgt.y,def.border);
  }
  if (ab.type === "splash") {
    const sd = getStat(def.stats.splashDmg, proj.classLv, proj.level);
    for (const e of p.enemies) if (e.id!==tgt.id && e.hp>0 && Math.hypot(e.x-tgt.x,e.y-tgt.y)<=ab.radius) dealDmg(p,e,sd);
    spawnFx(p,"burst",tgt.x,tgt.y,def.border==="rainbow"?"#FF8800":def.border);
  }
  if (ab.type === "chain") {
    const cd = getStat(def.stats.chainDmg, proj.classLv, proj.level);
    let last = tgt;
    for (let ci=0;ci<ab.count;ci++) {
      const nx = p.enemies.filter(e=>e.id!==tgt.id&&e.id!==last.id&&e.hp>0)
        .sort((a,b)=>Math.hypot(a.x-last.x,a.y-last.y)-Math.hypot(b.x-last.x,b.y-last.y))[0];
      if (!nx) break;
      dealDmg(p, nx, cd*ab.ratios[ci]);
      spawnFx(p,"chain",nx.x,nx.y,def.border); last = nx;
    }
  }
  if (ab.type === "poison") {
    tgt.poison = { dps: getStat(def.stats.dotDps, proj.classLv, proj.level), timer:0, tick:ab.tick };
  }
  if (ab.type === "slow") {
    const sp = getStat(def.stats.slowPct, proj.classLv, proj.level);
    tgt.slowStacks = Math.min((tgt.slowStacks||0)+1, ab.maxStacks);
    tgt.slowPctPerStack = Math.max(tgt.slowPctPerStack||0, sp);
    tgt.slowTimer = 3;
  }
  if (ab.type === "lock" && !tgt.everLocked) {
    const prob = getStat(def.stats.lockProb, proj.classLv, proj.level) / 100;
    if (Math.random() < prob) {
      tgt.locked = getStat(def.stats.lockDur, proj.classLv, proj.level);
      tgt.everLocked = true;
      spawnFx(p,"lock",tgt.x,tgt.y,"#8090FF");
    }
  }
  const hitColor = def.border === "#RAINBOW" ? "#FF88DD"
    : (proj.diceType==="sun" && (proj.sunCount||0)>=3 && (proj.sunCount%2)===1) ? "#DD5500"
    : def.border;
  spawnFx(p,"hit",tgt.x,tgt.y,hitColor);
  spawnTxt(p,tgt.x,tgt.y,Math.round(dmg));
}

function tickPlayer(p, dt, onKill) {
  p.gameTime += dt;

  // 보스 라운드 진입
  if (!p.bossRound && p.gameTime >= p.nextBossTime) {
    const bonusHp = p.enemies.reduce((s, e) => s + Math.max(0, e.hp), 0) * 0.5;
    const boss = spawnEnemy("boss", p.wave);
    boss.hp += bonusHp; boss.maxHp = boss.hp;
    p.enemies = [boss];
    p.bossRound = true;
  }

  // 보스 라운드가 아닐 때만 뚱몹 스폰 (20초마다)
  if (!p.bossRound) {
    p.bigTimer -= dt;
    if (p.bigTimer <= 0) {
      p.enemies.push(spawnEnemy("big", p.wave));
      p.bigTimer = 20;
    }
  }

  const toRemove = new Set();
  for (const e of p.enemies) {
    if (e.hp <= 0) {
      const reward = monSPReward(e.monType, p.wave);
      p.sp += reward;
      for (let k=0;k<6;k++) p.effects.push({id:uid(),type:"particle",x:e.x,y:e.y,vx:(Math.random()-.5)*140,vy:(Math.random()-.5)*140,color:e.color,size:3+Math.random()*5,life:0.5,maxLife:0.5});
      onKill && onKill(e);
      toRemove.add(e.id);
      continue;
    }
    if (e.poison) {
      e.poison.timer += dt;
      while (e.poison.timer >= e.poison.tick) { e.poison.timer -= e.poison.tick; dealDmg(p,e,e.poison.dps*dt); }
      if (e.hp <= 0) { const r=monSPReward(e.monType,p.wave); p.sp+=r; onKill&&onKill(e); toRemove.add(e.id); continue; }
    }
    if (e.slowTimer > 0) { e.slowTimer -= dt; if (e.slowTimer <= 0) e.slowStacks = 0; }
    if (e.locked > 0) { e.locked = Math.max(0, e.locked-dt); continue; }
    const sm = 1 - (e.slowStacks||0)*(e.slowPctPerStack||5)/100;
    e.pathD += e.speed * clamp(sm,0.1,1) * dt;
    if (e.pathD >= PATH_SEG.total) {
      p.hearts = Math.max(0, p.hearts - e.heartDmg);
      if (p.hearts <= 0) p.dead = true;
      p.effects.push({id:uid(),type:"heartloss",x:BW/2,y:BH/2,life:1.2,maxLife:1.2});
      toRemove.add(e.id); continue;
    }
    const pos = posOnPath(e.pathD);
    e.x = pos.x; e.y = pos.y;
    e.dist = PATH_SEG.total - e.pathD;
  }
  p.enemies = p.enemies.filter(e => !toRemove.has(e.id));

  // 빛 아우라 버프 맵 계산 (십자 인접 셀)
  const lightBuffMap = {};
  for (const [lk, ld] of Object.entries(p.dice)) {
    if (!ld || ld.type !== "light") continue;
    const llv = p.diceLevels["light"] || 1;
    const lclv = (p.classLevels?.["light"]) || (DICE_DEFS.light.minClass||3);
    const lbPct = ld.dot * (6 + (lclv-1)*0.3) + (llv-1)*1;
    const [lc, lr] = lk.split(",").map(Number);
    for (const [nc, nr] of [[lc-1,lr],[lc+1,lr],[lc,lr-1],[lc,lr+1]]) {
      if (nc<0||nc>=COLS||nr<0||nr>=ROWS) continue;
      const nk = cellKey(nc, nr);
      lightBuffMap[nk] = Math.max(lightBuffMap[nk]||0, lbPct);
    }
  }
  // 태양/달 활성화 계산 (3,5,7,9개일 때)
  const sunCount  = Object.values(p.dice).filter(d=>d?.type==="sun").length;
  const sunActivated  = sunCount  >= 3 && sunCount  % 2 === 1;
  const moonCount = Object.values(p.dice).filter(d=>d?.type==="moon").length;
  const moonActivated = moonCount >= 3 && moonCount % 2 === 1;
  // 달 아우라 버프 맵 (십자 인접, 공격속도)
  const moonBuffMap = {};
  for (const [mk, md] of Object.entries(p.dice)) {
    if (!md || md.type !== "moon") continue;
    const mlv  = p.diceLevels["moon"] || 1;
    const mclv = (p.classLevels?.["moon"]) || (DICE_DEFS.moon.minClass||7);
    const mbPct = md.dot * (7 + (mclv-1)*1) + (mlv-1)*2;
    const [mc, mr] = mk.split(",").map(Number);
    for (const [nc, nr] of [[mc-1,mr],[mc+1,mr],[mc,mr-1],[mc,mr+1]]) {
      if (nc<0||nc>=COLS||nr<0||nr>=ROWS) continue;
      const nk = cellKey(nc, nr);
      moonBuffMap[nk] = Math.max(moonBuffMap[nk]||0, mbPct);
    }
  }

  const newProjs = [];
  const dotSize = CELL - 12;
  for (const [key, d] of Object.entries(p.dice)) {
    if (!d) continue;
    d.cd -= dt; if (d.cd > 0) continue;
    const def = DICE_DEFS[d.type];
    // 빛/달 주사위: 공격 없음, CD만 리셋
    if (def.ability.type === "lightAura" || def.ability.type === "moonAura") { d.cd = 1.0; continue; }
    const {x:cx, y:cy} = cellXY(...key.split(",").map(Number));
    const live = p.enemies.filter(e=>e.hp>0); if (!live.length) continue;

    const lv = p.diceLevels[d.type] || 1;
    const clv = (p.classLevels && p.classLevels[d.type]) || 1;
    d.subIdx = (d.subIdx||0) % d.dot;
    let atkInt = getStat(def.stats.atkInt, clv, lv);
    if (d.type === "sun" && sunActivated) atkInt = 0.4;
    const selfBuff  = getSelfSpeedBuff(d, clv, lv);
    const lightBuff = Math.min((lightBuffMap[key]||0) / 100, 0.95);
    const moonBuff  = Math.min((moonBuffMap[key]||0) / 100, 0.95);
    const totalBuff = Math.min(selfBuff + lightBuff + moonBuff, 0.95);

    const dotPositions = DOT_LAYOUTS[d.dot];
    if (!dotPositions) continue;

    let dmg = getStat(def.stats.dmg, clv, lv);
    // 콤보 주사위: 이차함수 데미지
    if (d.type === "combo") {
      const cpd = getStat(def.stats.comboDmg, clv, lv);
      const cc = p.comboCount || 0;
      dmg += cpd * cc * (cc + 1) / 2;
    }
    let tgt;
    if (def.target === "random") {
      tgt = live[Math.floor(Math.random() * live.length)];
    } else if (def.target === "noPoison") {
      const pool = live.filter(e => !e.poison);
      const candidates = pool.length ? pool : live;
      tgt = candidates[Math.floor(Math.random() * candidates.length)];
    } else if (def.target === "strongest") {
      tgt = live.reduce((a,b) => a.hp > b.hp ? a : b);
    } else {
      tgt = live.reduce((a,b) => a.dist < b.dist ? a : b);
    }
    const projColor = def.border === "#RAINBOW" ? `hsl(${(Date.now()/10)%360},100%,50%)`
      : (d.type==="sun" && sunActivated) ? "#DD5500"
      : def.border;
    const projBase = {diceType:d.type,dot:d.dot,classLv:clv,level:lv,color:projColor,speed:1560,tx:tgt.x,ty:tgt.y,diceKey:key,sunCount,moonActivated,critMult:p.critMult||2};

    d.cd = atkInt * (1 - totalBuff) / d.dot;
    if (moonActivated) d.cd /= 1.03; // 달 활성화 추가 공속 +3%
    let gunX, gunY;
    if (dotPositions === "star") {
      gunX = cx; gunY = cy;
    } else {
      const [px, py] = dotPositions[d.subIdx];
      gunX = cx + (px/100 - 0.5) * dotSize;
      gunY = cy + (py/100 - 0.5) * dotSize;
    }
    newProjs.push({...projBase, id:uid(), x:gunX, y:gunY, targetId:tgt.id, dmg, angleSpread:0});
    d.subIdx = (d.subIdx + 1) % d.dot;
  }

  const hitIds = new Set();
  for (const pr of p.projs) {
    if (hitIds.has(pr.id)) continue;
    const tgt = p.enemies.find(e=>e.id===pr.targetId&&e.hp>0);
    const tx = tgt?tgt.x:pr.tx, ty = tgt?tgt.y:pr.ty;
    if (tgt) { pr.tx=tx; pr.ty=ty; }
    const dx=tx-pr.x, dy=ty-pr.y, dist=Math.hypot(dx,dy), step=pr.speed*dt;
    if (dist <= step+3) { hitIds.add(pr.id); if(tgt&&tgt.hp>0) applyHit(p,pr,tgt); }
    else { const a=Math.atan2(dy,dx)+pr.angleSpread; pr.x+=Math.cos(a)*step; pr.y+=Math.sin(a)*step; }
  }
  // newProjs are NOT moved this tick so they render at the exact gun position first
  p.projs = [...p.projs.filter(pr=>!hitIds.has(pr.id)), ...newProjs];

  // 성장/도박성장 타이머
  for (const [key, d] of Object.entries(p.dice)) {
    if (!d) continue;
    const def = DICE_DEFS[d.type];
    const ab = def.ability.type;
    if (ab !== "gamblegrowth" && ab !== "growth") continue;
    const gcl = (p.classLevels||{})[d.type]||1;
    if (d.growthTimer === undefined) d.growthTimer = getStat(def.stats.growthTime, gcl, p.diceLevels[d.type]||1);
    d.growthTimer -= dt;
    if (d.growthTimer <= 0) {
      if (ab === "gamblegrowth") {
        const newType = rnd(p.deck);
        const newDot = Math.floor(Math.random() * 7) + 1;
        p.dice[key] = makeDice(newType, newDot, p.diceLevels[newType]||1, (p.classLevels||{})[newType]||1);
      } else {
        const newDot = Math.min(d.dot + 1, 7);
        const newType = rnd(p.deck);
        p.dice[key] = makeDice(newType, newDot, p.diceLevels[newType]||1, (p.classLevels||{})[newType]||1);
      }
    }
  }

  p.effects = p.effects
    .map(ef => ({...ef, life:ef.life-dt, x:ef.x+(ef.vx||0)*dt, y:ef.y+(ef.vy||0)*dt}))
    .filter(ef => ef.life > 0);

  if (p.animations?.length) {
    p.animations = p.animations
      .map(a => ({...a, progress: a.progress + dt}))
      .filter(a => a.progress < a.duration);
  }
}

// ═══════════════════════════════════════════════════════════════
//  GAME BOARD
// ═══════════════════════════════════════════════════════════════
function GameBoard({ p, flipped, dragState, onDragStart, onDragMove, onDragEnd, boardRef }) {
  const anti = flipped ? {transform:"scaleY(-1)"} : {};
  const moonCnt = Object.values(p.dice).filter(d=>d?.type==="moon").length;
  const moonOn  = moonCnt >= 3 && moonCnt % 2 === 1;
  const sunCnt  = Object.values(p.dice).filter(d=>d?.type==="sun").length;
  const sunOn   = sunCnt  >= 3 && sunCnt  % 2 === 1;

  const onPD = (e, key) => {
    const d = p.dice[key];
    if (!d) return;
    if (d.dot === 7 && d.type !== "joker") return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    onDragStart(p.id, key, e.clientX, e.clientY);
  };

  const srcKey = dragState?.pid === p.id ? dragState.key : null;
  const srcDice = srcKey ? p.dice[srcKey] : null;

  return (
    <div ref={boardRef}
      onPointerMove={e => onDragMove(e.clientX, e.clientY)}
      onPointerUp={e => onDragEnd(p.id, e.clientX, e.clientY, flipped)}
      style={{position:"relative",width:BW,height:BH,background:"#FFFFFF",borderRadius:12,
        boxShadow:"0 2px 16px rgba(0,0,0,0.11)",overflow:"hidden",
        transform: flipped ? "scaleY(-1)" : "none",
        touchAction:"none",
      }}>
      {/* N자 경로 시각화 */}
      <svg style={{position:"absolute",inset:0,pointerEvents:"none"}} width={BW} height={BH}>
        <polyline points={PATH_WP.map(pt=>`${pt.x},${pt.y}`).join(" ")}
          fill="none" stroke="#E8EEF8" strokeWidth={CELL*0.86} strokeLinejoin="round" strokeLinecap="round"/>
        <polyline points={PATH_WP.map(pt=>`${pt.x},${pt.y}`).join(" ")}
          fill="none" stroke="#CDD8F0" strokeWidth={1.2} strokeLinejoin="round" strokeLinecap="round" strokeDasharray="5 5"/>
      </svg>

      {/* 주사위 셀 */}
      {Array.from({length:ROWS},(_,r) => Array.from({length:COLS},(_,c) => {
        const key = cellKey(c,r), d = p.dice[key];
        const isSrc = key === srcKey;
        const isJokerMerge = !!(srcDice && d && !isSrc && srcDice.dot===d.dot &&
          ((srcDice.type==="joker" && d.type!=="joker") || (srcDice.type!=="joker" && d.type==="joker")));
        const isNormalMerge = !!(srcDice && d && !isSrc && srcDice.dot<7 && d.dot<7 && srcDice.type===d.type && srcDice.dot===d.dot);
        const isAdaptMerge = !!(srcDice && d && !isSrc && srcDice.dot===d.dot && srcDice.dot<7 &&
          (srcDice.type==="adapt" || d.type==="adapt"));
        const canDrop = isJokerMerge || isNormalMerge || isAdaptMerge;
        return (
          <div key={key}
            onPointerDown={d ? e=>onPD(e,key) : undefined}
            style={{
              position:"absolute",
              left:(c+1)*CELL+3, top:(r+1)*CELL+3,
              width:CELL-6, height:CELL-6,
              background: canDrop?"rgba(255,200,50,0.22)":"rgba(220,230,248,0.35)",
              border: isSrc?"2px dashed #AABCCC"
                    : canDrop?"2.5px solid #F5A500"
                    : "1.5px solid rgba(180,200,230,0.4)",
              borderRadius:10,
              cursor: d?(d.dot===7?"default":"grab"):"default",
              display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
              boxShadow: canDrop?"0 0 12px #F5A50088":"none",
              opacity: isSrc ? 0.3 : 1,
              touchAction:"none", userSelect:"none",
              transition:"box-shadow .1s,border .1s",
            }}>
            {d && (
              <div style={{...anti,position:"relative",display:"flex",flexDirection:"column",alignItems:"center",gap:1,pointerEvents:"none"}}>
                {(() => {
                  const anim = p.animations?.find(a => a.key === key);
                  const sc = anim ? Math.min(anim.progress / anim.duration, 1) : 1;
                  return (
                    <div style={{transform:`scale(${sc})`,transition:"none"}}>
                      <DiceSVG type={d.type} dot={d.dot} size={CELL-12}
                        active={(d.type==="moon"&&moonOn)||(d.type==="sun"&&sunOn)}
                        comboCount={d.type==="combo"?(p.comboCount||0):0}
                        moonCount={d.type==="moon"?moonCnt:0}
                      />
                    </div>
                  );
                })()}
                {d.growthTimer !== undefined && (
                  <div style={{position:"absolute",bottom:0,right:0,fontSize:7,fontWeight:"bold",color:"#fff",background:"rgba(0,0,0,0.58)",borderRadius:3,padding:"0 2px",lineHeight:"12px"}}>
                    {Math.ceil(d.growthTimer)}s
                  </div>
                )}
              </div>
            )}
          </div>
        );
      }))}

      {/* 몬스터 */}
      {p.enemies.map(e => {
        const isCircle = e.shape==="circle";
        const sz = Math.max(e.w, e.h);
        const dispHp = e.isBoss ? null : Math.ceil(e.hp);
        return (
          <div key={e.id} style={{
            position:"absolute",
            left:e.x-e.w/2, top:e.y-e.h/2,
            width:e.w, height:e.h,
            background:e.color,
            borderRadius: isCircle ? "50%" : e.isBoss ? "7px" : "3px",
            border: e.isBoss ? "2px solid #FF4444" : "1px solid rgba(255,255,255,0.25)",
            boxShadow: e.isBoss?"0 0 10px #FF4444aa":e.locked>0?"0 0 8px #8888FF":"none",
            display:"flex",alignItems:"center",justifyContent:"center",
            pointerEvents:"none", zIndex:15,
            filter: e.locked>0?"brightness(0.5)":e.slowStacks>0?"hue-rotate(180deg)":e.poison?"hue-rotate(80deg)":"none",
          }}>
            {e.isBoss ? (
              <div style={{
                ...anti,
                position:"absolute", top:-14, left:"50%", transform:`translateX(-50%)${flipped?" scaleY(-1)":""}`,
                width: e.w+20, pointerEvents:"none",
              }}>
                <div style={{background:"rgba(0,0,0,0.55)",borderRadius:6,padding:"2px 4px",textAlign:"center"}}>
                  <div style={{width:"100%",height:5,background:"#333",borderRadius:3,overflow:"hidden",marginBottom:1}}>
                    <div style={{width:`${clamp(e.hp/e.maxHp*100,0,100)}%`,height:"100%",background:e.hp/e.maxHp>0.5?"#44EE44":e.hp/e.maxHp>0.25?"#FFAA00":"#FF2222",borderRadius:3,transition:"width .08s"}}/>
                  </div>
                  <div style={{fontSize:8,color:"#fff",fontWeight:"bold",lineHeight:1}}>{Math.ceil(e.hp).toLocaleString()}</div>
                </div>
              </div>
            ) : (
              <div style={{...anti,fontSize:sz<=22?8:10,fontWeight:"bold",color:"#fff",textShadow:"0 1px 2px rgba(0,0,0,0.8)",lineHeight:1,pointerEvents:"none"}}>
                {dispHp && dispHp > 0 ? dispHp : ""}
              </div>
            )}
          </div>
        );
      })}

      {/* 투사체 */}
      {p.projs.map(pr=>{
        const isLegend = (DICE_DEFS[pr.diceType]?.minClass||1) >= 7;
        return (
          <div key={pr.id} style={{position:"absolute",left:pr.x-4,top:pr.y-4,width:8,height:8,
            background:pr.color,borderRadius:"50%",
            boxShadow:`0 0 6px ${pr.color}${isLegend?", 0 0 0 2px rgba(255,255,255,0.85)":""}`,
            pointerEvents:"none",zIndex:25}}/>
        );
      })}

      {/* 이펙트 */}
      {p.effects.map(ef=>{
        const a = clamp(ef.life/ef.maxLife,0,1);
        const bs = {position:"absolute",pointerEvents:"none"};
        if (ef.type==="hit"||ef.type==="chain") return <div key={ef.id} style={{...bs,left:ef.x-10,top:ef.y-10,width:20,height:20,background:ef.color,borderRadius:"50%",opacity:a*0.65,transform:`scale(${2-a})`,zIndex:22}}/>;
        if (ef.type==="burst") return <div key={ef.id} style={{...bs,left:ef.x-22,top:ef.y-22,width:44,height:44,background:ef.color,borderRadius:"50%",opacity:a*0.4,transform:`scale(${2.5-a*1.5})`,zIndex:22}}/>;
        if (ef.type==="particle") return <div key={ef.id} style={{...bs,left:ef.x-ef.size/2,top:ef.y-ef.size/2,width:ef.size,height:ef.size,background:ef.color,borderRadius:"50%",opacity:a,zIndex:22}}/>;
        if (ef.type==="text") return <div key={ef.id} style={{...bs,...anti,left:ef.x,top:ef.y,color:"#222",fontSize:11,fontWeight:"bold",opacity:a,zIndex:35,textShadow:"0 1px 3px rgba(255,255,255,0.9)",whiteSpace:"nowrap"}}>{ef.text}</div>;
        if (ef.type==="heartloss") return <div key={ef.id} style={{...bs,...anti,left:ef.x-24,top:ef.y-24,fontSize:48,opacity:a,zIndex:40}}>💔</div>;
        if (ef.type==="lock") return <div key={ef.id} style={{...bs,...anti,left:ef.x-10,top:ef.y-24,fontSize:20,opacity:a,zIndex:28}}>🔒</div>;
        if (ef.type==="summonCircle") {
          const rs = (CELL-12) * (0.5 + a * 0.6);
          return <div key={ef.id} style={{...bs,left:ef.x-rs/2,top:ef.y-rs/2,width:rs,height:rs,borderRadius:"50%",border:`${2.5+a*2}px solid ${ef.color}`,boxShadow:`0 0 ${10*a}px ${ef.color}88`,opacity:a*0.85,zIndex:30}}/>;
        }
        return null;
      })}


      {p.dead && (
        <div style={{position:"absolute",inset:0,background:"rgba(255,50,50,0.2)",
          display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
          <div style={{...anti,fontSize:44}}>💀</div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  HUD
// ═══════════════════════════════════════════════════════════════
function HUD({ p, pid, accent, onSummon, onLevelUp }) {
  const isDeath = p.wave>=7, isFury = p.wave>=11;
  const canSummon = p.sp >= p.summonCost;

  const diceList = p.deck.map(type => {
    const def = DICE_DEFS[type];
    const onBoard = Object.values(p.dice).filter(d => d && d.type === type).length;
    const curLevel = p.diceLevels[type] || 1;
    const allMax = curLevel >= 5;
    const cost = allMax ? 0 : LV_COST[curLevel - 1];
    const canUp = onBoard > 0 && !allMax && p.sp >= cost;
    return { type, def, onBoard, curLevel, allMax, cost, canUp };
  });

  return (
    <div style={{
      width:BW, background:"#F4F7FF",
      border:`1.5px solid ${accent}33`, borderRadius:12,
      boxShadow:"0 1px 8px rgba(0,0,0,0.07)", overflow:"hidden",
    }}>
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"5px 12px",
        borderBottom:"1px solid rgba(0,0,0,0.06)"}}>
        <span style={{fontWeight:800,color:accent,fontSize:13}}>{pid===0?"🔵 P1":"🔴 P2"}</span>
        <span style={{fontSize:13}}>{"❤️".repeat(p.hearts)}{"🖤".repeat(Math.max(0,3-p.hearts))}</span>
        {isFury&&<span style={{fontSize:9,color:"#f44",background:"#fff0f0",border:"1px solid #f44",borderRadius:4,padding:"1px 4px",fontWeight:"bold"}}>💀광폭</span>}
        {!isFury&&isDeath&&<span style={{fontSize:9,color:"#f80",background:"#fff8f0",border:"1px solid #f80",borderRadius:4,padding:"1px 4px",fontWeight:"bold"}}>⚡데스</span>}
        <div style={{flex:1}}/>
        <span style={{fontSize:13,fontWeight:800,color:"#334"}}>💰 {Math.floor(p.sp)} SP</span>
      </div>

      <div style={{display:"flex",alignItems:"flex-start",gap:10,padding:"8px 12px"}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,flexShrink:0}}>
          <button onClick={onSummon} disabled={!canSummon}
            style={{
              width:54,height:54,borderRadius:"50%",
              background: canSummon ? "#ffffff" : "#c8cce0",
              border:`2.5px solid ${canSummon ? accent : "#bbb"}`,
              color: canSummon ? accent : "#aaa",
              fontSize:24, cursor: canSummon ? "pointer" : "default",
              boxShadow: canSummon ? `0 3px 14px ${accent}44` : "none",
              display:"flex",alignItems:"center",justifyContent:"center",
              padding:0, transition:"all .15s",
            }}>🎲</button>
          <div style={{fontSize:9,color:"#667",textAlign:"center",lineHeight:1.3,fontWeight:"bold"}}>
            소환<br/>{p.summonCost}SP
          </div>
        </div>

        <div style={{display:"flex",gap:6,flexWrap:"wrap",flex:1,minHeight:74}}>
          {diceList.map(({ type, def, onBoard, curLevel, allMax, cost, canUp }) => (
            <div key={type} onClick={()=>canUp && onLevelUp(type)}
              style={{
                display:"flex",flexDirection:"column",alignItems:"center",gap:2,
                padding:"5px 6px 4px",
                background: canUp ? "#fff" : "#f0f2f8",
                border:`1.5px solid ${canUp ? def.border : onBoard>0 ? "#ccd" : "#e8e8f0"}`,
                borderRadius:10,
                cursor: canUp ? "pointer" : "default",
                boxShadow: canUp ? `0 2px 8px ${def.border}44` : "none",
                opacity: onBoard > 0 ? 1 : 0.45,
                transition:"all .12s",
                minWidth:50,
              }}>
              <DiceSVG type={type} dot={3} size={34}/>
              <div style={{fontSize:9,fontWeight:700,color:"#334",lineHeight:1}}>
                {onBoard > 0 ? `Lv.${curLevel}` : "없음"}
              </div>
              <div style={{fontSize:8,color:canUp?def.border:"#aab",fontWeight:"bold",lineHeight:1}}>
                {onBoard===0 ? "-" : allMax ? "MAX" : `${cost}SP`}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  DECK BUILDER
// ═══════════════════════════════════════════════════════════════
const CLASS_MAX = 15;
function ClassStepper({ value, onChange, color, minClass = 1 }) {
  const v = Math.max(value || minClass, minClass);
  const btnStyle = (disabled) => ({
    width:20, height:20, border:`1px solid ${disabled?"#ddd":color}`, borderRadius:4,
    background: disabled?"#f5f5f5":"#fff", color: disabled?"#bbb":color,
    fontSize:13, fontWeight:900, cursor: disabled?"default":"pointer",
    display:"flex", alignItems:"center", justifyContent:"center", lineHeight:1, padding:0,
  });
  return (
    <div style={{display:"flex",alignItems:"center",gap:3}} onClick={e=>e.stopPropagation()}>
      <button style={btnStyle(v<=minClass)} onClick={()=>onChange(Math.max(minClass,v-1))}>−</button>
      <span style={{fontSize:11,fontWeight:800,color,minWidth:28,textAlign:"center"}}>C{v}</span>
      <button style={btnStyle(v>=CLASS_MAX)} onClick={()=>onChange(Math.min(CLASS_MAX,v+1))}>+</button>
    </div>
  );
}

function CritMultSelector({ value, onChange, accent }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:6,marginTop:8,paddingTop:8,borderTop:"1px solid #eee"}}>
      <span style={{fontSize:11,color:"#667",fontWeight:700,minWidth:68}}>크리티컬 배율</span>
      <div style={{display:"flex",gap:4}}>
        {[2,3,4,5].map(m=>(
          <button key={m} onClick={()=>onChange(m)} style={{
            width:32,height:24,borderRadius:6,border:`1.5px solid ${value===m?accent:"#ddd"}`,
            background:value===m?accent:"#fff",color:value===m?"#fff":"#667",
            fontSize:11,fontWeight:800,cursor:"pointer",padding:0,
          }}>{m}×</button>
        ))}
      </div>
    </div>
  );
}

function DeckPanel({ label, deck, setDeck, accent, classLevels, setClass, critMult, setCritMult }) {
  const toggle = k => {
    if (deck.includes(k)) { if (deck.length > 1) setDeck(deck.filter(x=>x!==k)); }
    else if (deck.length < 5) setDeck([...deck,k]);
  };
  return (
    <div style={{background:"#fff",border:`1.5px solid ${accent}44`,borderRadius:14,padding:16,minWidth:260,boxShadow:`0 4px 20px ${accent}18`}}>
      <div style={{fontWeight:800,color:accent,marginBottom:10,fontSize:14}}>{label} ({deck.length}/5)</div>
      {DICE_KEYS.map(k=>{
        const d=DICE_DEFS[k]; const sel=deck.includes(k);
        return (
          <div key={k} onClick={()=>toggle(k)} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 8px",marginBottom:4,background:sel?`${d.border}14`:"#F8F9FF",border:sel?`1.5px solid ${d.border}`:"1.5px solid #E8ECF8",borderRadius:9,cursor:"pointer",transition:"all .12s"}}>
            <DiceSVG type={k} dot={3} size={42}/>
            <div style={{flex:1}}>
              <div style={{fontSize:12,fontWeight:sel?800:500,color:sel?d.border:"#334"}}>{d.name}</div>
              <div style={{fontSize:10,color:"#999"}}>{d.ability.type}</div>
            </div>
            {sel
              ? <ClassStepper value={classLevels[k]||d.minClass||1} onChange={v=>setClass(k,v)} color={d.border==="#RAINBOW"?"#AA00AA":d.border} minClass={d.minClass||1}/>
              : <span style={{fontSize:10,color:"#ccc"}}>C1</span>
            }
          </div>
        );
      })}
      <CritMultSelector value={critMult} onChange={setCritMult} accent={accent}/>
    </div>
  );
}

function DeckBuilder({ p1Deck,p2Deck,setP1Deck,setP2Deck,p1Class,setP1Class,p2Class,setP2Class,p1CritMult,setP1CritMult,p2CritMult,setP2CritMult,onStart }) {
  const setP1ClassFor = (type, v) => setP1Class(prev=>({...prev,[type]:v}));
  const setP2ClassFor = (type, v) => setP2Class(prev=>({...prev,[type]:v}));
  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#EEF2FF,#F5F0FF)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:28,fontFamily:"'Segoe UI',system-ui,sans-serif",color:"#223",padding:24}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:32,fontWeight:900,letterSpacing:3}}>🎲 RANDOM DICE</div>
        <div style={{fontSize:12,color:"#99a",letterSpacing:2,marginTop:6}}>덱 5개 선택 · C = 클래스 레벨</div>
      </div>
      <div style={{display:"flex",gap:24,flexWrap:"wrap",justifyContent:"center"}}>
        <DeckPanel label="🔵 P1 덱" deck={p1Deck} setDeck={setP1Deck} accent="#3355EE" classLevels={p1Class} setClass={setP1ClassFor} critMult={p1CritMult} setCritMult={setP1CritMult}/>
        <DeckPanel label="🔴 P2 덱" deck={p2Deck} setDeck={setP2Deck} accent="#EE3355" classLevels={p2Class} setClass={setP2ClassFor} critMult={p2CritMult} setCritMult={setP2CritMult}/>
      </div>
      <button onClick={onStart} style={{padding:"14px 56px",background:"linear-gradient(135deg,#3355EE,#1133BB)",border:"none",borderRadius:14,color:"#fff",fontSize:18,fontWeight:800,cursor:"pointer",boxShadow:"0 4px 24px #3355EE55",letterSpacing:2}}>⚔️ 대전 시작</button>
    </div>
  );
}

function GameOver({ winner, gs, onRestart }) {
  const label = winner===-1?"무승부":winner===0?"🔵 P1 승리!":"🔴 P2 승리!";
  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#EEF2FF,#F5F0FF)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:20,fontFamily:"'Segoe UI',system-ui,sans-serif",color:"#223"}}>
      <div style={{fontSize:40,fontWeight:900}}>{label}</div>
      <div style={{display:"flex",gap:28}}>
        {gs?.players.map((p,i)=>(
          <div key={i} style={{textAlign:"center",padding:"16px 24px",background:"#fff",borderRadius:14,boxShadow:"0 2px 12px #0001"}}>
            <div style={{fontWeight:800,color:i===0?"#3355EE":"#EE3355",marginBottom:6}}>P{i+1}</div>
            <div style={{fontSize:18}}>{"❤️".repeat(p.hearts)}{"🖤".repeat(Math.max(0,3-p.hearts))}</div>
            <div style={{fontSize:13,color:"#667",marginTop:6}}>웨이브 {p.wave}</div>
          </div>
        ))}
      </div>
      <button onClick={onRestart} style={{padding:"12px 40px",background:"linear-gradient(135deg,#3355EE,#1133BB)",border:"none",borderRadius:12,color:"#fff",fontSize:16,fontWeight:800,cursor:"pointer"}}>🔄 다시하기</button>
    </div>
  );
}

function formatTime(sec) {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
}

// ═══════════════════════════════════════════════════════════════
//  ROOT APP
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const [phase, setPhase] = useState("deck");
  const [winner, setWinner] = useState(null);
  const [p1Deck, setP1Deck] = useState(["fire","electric","ice","wind","steel"]);
  const [p2Deck, setP2Deck] = useState(["poison","broken","gamble","lock","ice"]);
  const [p1Class, setP1Class] = useState({});
  const [p2Class, setP2Class] = useState({});
  const [p1CritMult, setP1CritMult] = useState(2);
  const [p2CritMult, setP2CritMult] = useState(2);

  const gsRef = useRef(null);
  const rafRef = useRef(null);
  const lastTRef = useRef(0);
  const [, setTick] = useState(0);
  const rerender = useCallback(() => setTick(t=>t+1), []);

  const dragRef = useRef(null); // { pid, key, startX, startY, active }
  const [dragVis, setDragVis] = useState(null); // { pid, key, x, y } for rendering
  const boardRefs = useRef([null, null]);

  const loop = useCallback(ts => {
    if (!gsRef.current) return;
    if (!lastTRef.current) lastTRef.current = ts;
    const dt = Math.min((ts - lastTRef.current) / 1000, 0.05);
    lastTRef.current = ts;
    const [p0, p1] = gsRef.current.players;

    const gs = gsRef.current;

    // 0.5s 구간 PvP 킬 전송
    const spawnToField = (target, monType, fromWave) => {
      if (target.dead) return;
      const m = spawnEnemy(monType, fromWave);
      m.pathD = Math.random() * 60;
      const pos = posOnPath(m.pathD);
      m.x = pos.x; m.y = pos.y;
      target.enemies.push(m);
    };
    const onKill0 = () => {
      p0.killsInInterval = (p0.killsInInterval||0) + 1;
      p0.totalKills = (p0.totalKills||0) + 1;
      if (p0.totalKills % 10 === 0) spawnToField(p1, "speed", p0.wave);
    };
    const onKill1 = () => {
      p1.killsInInterval = (p1.killsInInterval||0) + 1;
      p1.totalKills = (p1.totalKills||0) + 1;
      if (p1.totalKills % 10 === 0) spawnToField(p0, "speed", p1.wave);
    };

    if (!p0.dead) tickPlayer(p0, dt, onKill0);
    if (!p1.dead) tickPlayer(p1, dt, onKill1);

    // 0.5s 구간마다: 상대 킬 수 > 0 이면 내 필드에 normal 1마리
    gs.intervalTimer = (gs.intervalTimer||0) + dt;
    if (gs.intervalTimer >= 0.5) {
      gs.intervalTimer -= 0.5;
      if (!p0.dead && (p1.killsInInterval||0) > 0) spawnToField(p0, "normal", p1.wave);
      if (!p1.dead && (p0.killsInInterval||0) > 0) spawnToField(p1, "normal", p0.wave);
      p0.killsInInterval = 0;
      p1.killsInInterval = 0;
    }

    // 양쪽 보스 처치 시 웨이브 클리어 애니메이션
    const p0BossClear = p0.bossRound && !p0.enemies.some(e=>e.isBoss);
    const p1BossClear = p1.bossRound && !p1.enemies.some(e=>e.isBoss);
    if ((p0BossClear || p0.dead) && (p1BossClear || p1.dead) && (p0.bossRound || p1.bossRound) && !gs.waveClearing) {
      gs.waveClearing = true;
      gs.waveClearTimer = 2.5;
      gs.clearedWave = Math.max(p0.wave, p1.wave);
    }
    if (gs.waveClearing) {
      gs.waveClearTimer -= dt;
      if (gs.waveClearTimer <= 0) {
        gs.waveClearing = false;
        const nextWave = (gs.clearedWave||1) + 1;
        for (const p of [p0, p1]) {
          if (p.dead) continue;
          p.wave = nextWave;
          p.bossRound = false;
          p.bigTimer = 20;
          p.nextBossTime = p.gameTime + 90;
          p.killsInInterval = 0;
          spawnToField(p, "normal", nextWave);
        }
      }
    }

    const alive = gsRef.current.players.filter(p=>!p.dead);
    if (alive.length < 2) { setWinner(alive.length===1?alive[0].id:-1); setPhase("over"); return; }
    rerender();
    rafRef.current = requestAnimationFrame(loop);
  }, [rerender]);

  useEffect(() => {
    if (phase === "game") { lastTRef.current=0; rafRef.current=requestAnimationFrame(loop); }
    return () => rafRef.current && cancelAnimationFrame(rafRef.current);
  }, [phase, loop]);

  const startGame = useCallback(() => {
    const players = [makePlayer(0,p1Deck,p1Class,p1CritMult), makePlayer(1,p2Deck,p2Class,p2CritMult)];
    for (const p of players) {
      const n = spawnEnemy("normal", 1);
      n.pathD = Math.random() * 40;
      const pos = posOnPath(n.pathD);
      n.x = pos.x; n.y = pos.y;
      p.enemies.push(n);
    }
    gsRef.current = { players, intervalTimer: 0, waveClearing: false, waveClearTimer: 0, clearedWave: 0 };
    setPhase("game");
  }, [p1Deck, p2Deck, p1Class, p2Class, p1CritMult, p2CritMult]);

  const summon = useCallback(pid => {
    const p = gsRef.current?.players[pid]; if (!p || p.sp < p.summonCost) return;
    const empties = [];
    for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) { const k=cellKey(c,r); if(!p.dice[k]) empties.push(k); }
    if (!empties.length) return;
    const type = rnd(p.deck);
    const chosenKey = rnd(empties);
    p.dice[chosenKey] = makeDice(type, undefined, p.diceLevels[type]||1, (p.classLevels||{})[type]||1);
    addDiceAnim(p, chosenKey, "spawn");
    p.sp -= p.summonCost; p.summonCost += 10;
    rerender();
  }, [rerender]);

  const doMerge = useCallback((pid, srcKey, targetKey) => {
    if (srcKey === targetKey) return;
    const p = gsRef.current?.players[pid]; if (!p) return;
    const src = p.dice[srcKey], tgt = p.dice[targetKey];
    if (!src || !tgt || src.dot !== tgt.dot) return;

    const srcJoker = src.type === "joker", tgtJoker = tgt.type === "joker";
    const srcAdapt = src.type === "adapt", tgtAdapt = tgt.type === "adapt";
    const cl = p.classLevels || {};
    let merged = false, isJokerCopy = false;

    const spawnSummonDice = (dot) => {
      const empties = [];
      for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) { const k=cellKey(c,r); if(!p.dice[k]) empties.push(k); }
      if (!empties.length) return;
      const sd = dot <= 1 ? 1 : Math.floor(Math.random() * (dot - 1)) + 1;
      const st = rnd(p.deck);
      const sk = rnd(empties);
      p.dice[sk] = makeDice(st, sd, p.diceLevels[st]||1, cl[st]||1);
      addDiceAnim(p, sk, "summonSpawn");
      const [sc, sr] = sk.split(",").map(Number);
      const {x:sx2, y:sy2} = cellXY(sc, sr);
      p.effects.push({ id:uid(), type:"summonCircle", x:sx2, y:sy2, color:"#00BB55", life:1.0, maxLife:1.0 });
    };

    if (srcJoker && tgtAdapt) {
      // 조커→적응: 복사 (조커가 적응 타입으로)
      p.dice[srcKey] = makeDice("adapt", src.dot, p.diceLevels["adapt"]||1, cl["adapt"]||1);
      addDiceAnim(p, srcKey, "merge");
      merged = true; isJokerCopy = true;
    } else if (srcAdapt && tgtJoker && src.dot < 7) {
      // 적응→조커: 실제 합성 (조커 슬롯이 랜덤타입 눈금+1)
      const newType = rnd(p.deck);
      delete p.dice[srcKey];
      p.dice[targetKey] = makeDice(newType, src.dot+1, p.diceLevels[newType]||1, cl[newType]||1);
      addDiceAnim(p, targetKey, "merge");
      merged = true;
      if (src.type === "summon" || tgt.type === "summon") spawnSummonDice(src.dot + 1);
    } else if (srcJoker && !tgtJoker) {
      // 조커(src)가 대상 종류로 복사 변신
      p.dice[srcKey] = makeDice(tgt.type, src.dot, p.diceLevels[tgt.type]||1, cl[tgt.type]||1);
      addDiceAnim(p, srcKey, "merge");
      merged = true; isJokerCopy = true;
    } else if (!srcJoker && tgtJoker) {
      // 조커(tgt)가 src 종류로 복사 변신
      p.dice[targetKey] = makeDice(src.type, tgt.dot, p.diceLevels[src.type]||1, cl[src.type]||1);
      addDiceAnim(p, targetKey, "merge");
      merged = true; isJokerCopy = true;
    } else if ((srcAdapt || tgtAdapt) && src.dot < 7) {
      // 적응 주사위: 같은 눈금 아무 종류와 합성 가능
      const newType = rnd(p.deck);
      delete p.dice[srcKey];
      p.dice[targetKey] = makeDice(newType, src.dot+1, p.diceLevels[newType]||1, cl[newType]||1);
      addDiceAnim(p, targetKey, "merge");
      merged = true;
      if (src.type === "summon" || tgt.type === "summon") spawnSummonDice(src.dot + 1);
    } else if (src.type === tgt.type && src.dot < 7) {
      // 일반 같은 종류 합성
      const newType = rnd(p.deck);
      delete p.dice[srcKey];
      p.dice[targetKey] = makeDice(newType, src.dot+1, p.diceLevels[newType]||1, cl[newType]||1);
      addDiceAnim(p, targetKey, "merge");
      merged = true;
      if (src.type === "summon") spawnSummonDice(src.dot + 1);
    }

    if (merged) {
      if (!isJokerCopy) {
        // 콤보 카운트: 콤보+콤보, 콤보+적응, 적응+콤보
        if ((src.type==="combo" && tgt.type==="combo") ||
            (src.type==="combo" && tgtAdapt) ||
            (srcAdapt && tgt.type==="combo")) {
          p.comboCount = (p.comboCount || 0) + 1;
        }
      }
      rerender();
    }
  }, [rerender]);

  const handleDragStart = useCallback((pid, key, startX, startY) => {
    dragRef.current = { pid, key, startX, startY, active: false };
  }, []);

  const handleDragMove = useCallback((x, y) => {
    const dr = dragRef.current; if (!dr) return;
    if (!dr.active) {
      if (Math.hypot(x - dr.startX, y - dr.startY) > 8) {
        dr.active = true;
        setDragVis({ pid: dr.pid, key: dr.key, x, y });
      }
      return;
    }
    setDragVis(v => v ? { ...v, x, y } : { pid: dr.pid, key: dr.key, x, y });
  }, []);

  const handleDragEnd = useCallback((pid, clientX, clientY, flipped) => {
    const dr = dragRef.current;
    if (!dr || dr.pid !== pid) return;
    const wasActive = dr.active;
    dragRef.current = null;
    setDragVis(null);
    if (!wasActive) return;

    const boardEl = boardRefs.current[pid];
    if (!boardEl) return;
    const rect = boardEl.getBoundingClientRect();
    const bx = clientX - rect.left;
    const by = flipped ? (rect.bottom - clientY) : (clientY - rect.top);

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cx = (c + 1) * CELL + 3;
        const cy = (r + 1) * CELL + 3;
        if (bx >= cx && bx <= cx + CELL - 6 && by >= cy && by <= cy + CELL - 6) {
          doMerge(pid, dr.key, cellKey(c, r));
          return;
        }
      }
    }
  }, [doMerge]);

  const handleLevelUp = useCallback((pid, diceType) => {
    const p = gsRef.current?.players[pid]; if (!p) return;
    const onBoard = Object.values(p.dice).filter(d => d && d.type===diceType).length;
    if (!onBoard) return;
    const curLevel = p.diceLevels[diceType] || 1;
    if (curLevel >= 5) return;
    const cost = LV_COST[curLevel - 1];
    if (p.sp < cost) return;
    p.sp -= cost;
    p.diceLevels[diceType] = curLevel + 1;
    rerender();
  }, [rerender]);

  if (phase==="deck") return <DeckBuilder p1Deck={p1Deck} p2Deck={p2Deck} setP1Deck={setP1Deck} setP2Deck={setP2Deck} p1Class={p1Class} setP1Class={setP1Class} p2Class={p2Class} setP2Class={setP2Class} p1CritMult={p1CritMult} setP1CritMult={setP1CritMult} p2CritMult={p2CritMult} setP2CritMult={setP2CritMult} onStart={startGame}/>;
  if (phase==="over") return <GameOver winner={winner} gs={gsRef.current} onRestart={()=>{setPhase("deck");setWinner(null);setDragVis(null);dragRef.current=null;}}/>;

  const gs = gsRef.current; if (!gs) return null;
  const [p0, p1] = gs.players;
  const bossTimeLeft = Math.max(0, p0.nextBossTime - p0.gameTime);
  const waveNum = p0.wave;
  const inBossRound = p0.bossRound || p1.bossRound;

  return (
    <div style={{
      minHeight:"100vh", background:"#E8ECF8",
      display:"flex",flexDirection:"column",alignItems:"center",
      fontFamily:"'Segoe UI',system-ui,sans-serif",
      padding:"8px 6px",gap:6,
    }}>
      <div style={{fontSize:10,color:"#99a",letterSpacing:3,textTransform:"uppercase"}}>Random Dice — 대전</div>

      {/* P2 상단 (상하반전) */}
      <HUD p={p1} pid={1} accent="#EE3355" flipped
        onSummon={()=>summon(1)}
        onLevelUp={t=>handleLevelUp(1,t)}
      />
      <GameBoard p={p1} flipped
        dragState={dragVis}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        boardRef={el => boardRefs.current[1] = el}
      />

      <div style={{width:"100%",maxWidth:BW,display:"flex",alignItems:"center",justifyContent:"center",padding:"1px 0"}}>
        <div style={{background:"#111",color:"#fff",padding:"4px 20px",borderRadius:10,fontSize:13,fontWeight:800,letterSpacing:1,boxShadow:"0 2px 8px rgba(0,0,0,0.3)"}}>
          {inBossRound
            ? `Wave ${waveNum} · ⚔️ BOSS ROUND`
            : `Wave ${waveNum} · 보스까지 ${formatTime(bossTimeLeft)}`}
        </div>
      </div>

      {/* P1 하단 */}
      <GameBoard p={p0} flipped={false}
        dragState={dragVis}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        boardRef={el => boardRefs.current[0] = el}
      />
      <HUD p={p0} pid={0} accent="#3355EE" flipped={false}
        onSummon={()=>summon(0)}
        onLevelUp={t=>handleLevelUp(0,t)}
      />

      <div style={{fontSize:9,color:"#bbc"}}>
        드래그로 합성 · 파워업 패널 클릭으로 레벨업
      </div>

      {/* 드래그 중 떠다니는 주사위 */}
      {dragVis && (() => {
        const dp = gsRef.current?.players[dragVis.pid];
        const dd = dp?.dice[dragVis.key];
        if (!dd) return null;
        const sz = CELL - 12;
        return (
          <div style={{
            position:"fixed", pointerEvents:"none", zIndex:1000,
            left: dragVis.x - sz/2, top: dragVis.y - sz/2,
            width: sz, height: sz,
            filter:"drop-shadow(0 4px 12px rgba(0,0,0,0.4))",
            transform:"scale(1.15)",
          }}>
            <DiceSVG type={dd.type} dot={dd.dot} size={sz}/>
          </div>
        );
      })()}

      {/* 웨이브 클리어 오버레이 */}
      {gs.waveClearing && (
        <div style={{
          position:"fixed", inset:0, zIndex:2000,
          display:"flex", alignItems:"center", justifyContent:"center",
          pointerEvents:"none",
        }}>
          <div style={{
            background:"rgba(10,10,30,0.78)",
            border:"2px solid #FFD700",
            borderRadius:20,
            padding:"28px 60px",
            textAlign:"center",
            boxShadow:"0 0 60px #FFD70066",
          }}>
            <div style={{fontSize:38,fontWeight:900,color:"#FFD700",letterSpacing:4}}>WAVE {gs.clearedWave} CLEAR!</div>
            <div style={{fontSize:15,color:"#aac",marginTop:8,letterSpacing:2}}>다음 웨이브 준비 중...</div>
          </div>
        </div>
      )}
    </div>
  );
}
