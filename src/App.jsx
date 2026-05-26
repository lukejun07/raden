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
const DICE_DEFS = {
  fire:     { name:"불",     border:"#E02020", bg:"#F87070", baseDmg:20,  atkSpeed:0.8,  target:"first",    ability:{ type:"splash",      dmg:20, radius:CELL*1.8 } },
  electric: { name:"전기",   border:"#C89000", bg:"#F5CF50", baseDmg:30,  atkSpeed:0.7,  target:"first",    ability:{ type:"chain",       dmg:30, count:3, ratios:[1.0,0.7,0.3] } },
  poison:   { name:"독",     border:"#44AA00", bg:"#88DD44", baseDmg:20,  atkSpeed:1.3,  target:"noPoison", ability:{ type:"poison",      dps:50, tick:1.0 } },
  ice:      { name:"얼음",   border:"#0088EE", bg:"#55CCFF", baseDmg:30,  atkSpeed:1.5,  target:"first",    ability:{ type:"slow",        slowPct:5, maxStacks:3 } },
  steel:    { name:"쇠",     border:"#666666", bg:"#AAAAAA", baseDmg:100, atkSpeed:1.0,  target:"strongest",ability:{ type:"bossKiller",  mult:2.0 } },
  broken:   { name:"고장난", border:"#AA44CC", bg:"#CC88EE", baseDmg:50,  atkSpeed:0.9,  target:"random",   ability:{ type:"none" } },
  gamble:   { name:"도박",   border:"#4422CC", bg:"#8866EE", baseDmg:7,   atkSpeed:1.0,  target:"first",    ability:{ type:"randomDmg",   critMult:5.0 } },
  lock:     { name:"잠금",   border:"#334488", bg:"#667799", baseDmg:30,  atkSpeed:0.8,  target:"first",    ability:{ type:"lock",        prob:0.04, duration:3.0 } },
  wind:     { name:"바람",   border:"#00AA88", bg:"#44DDBB", baseDmg:20,  atkSpeed:0.45, target:"first",    ability:{ type:"atkSpeedBuff",reductionPct:10 } },
};
const DICE_KEYS = Object.keys(DICE_DEFS);
const LV_COST = [100, 200, 400, 700];

// ═══════════════════════════════════════════════════════════════
//  SVG DICE
// ═══════════════════════════════════════════════════════════════
const DOT_LAYOUTS = {
  1:[[50,50]],
  2:[[30,30],[70,70]],
  3:[[30,30],[50,50],[70,70]],
  4:[[30,30],[70,30],[30,70],[70,70]],
  5:[[30,30],[70,30],[50,50],[30,70],[70,70]],
  6:[[28,25],[72,25],[28,50],[72,50],[28,75],[72,75]],
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
          fill={color}
          style={{ filter: `drop-shadow(0 ${size*0.012}px ${size*0.02}px rgba(0,0,0,0.4))` }}
        />
      ))}
    </>
  );
}

function DiceCard({ size, border, children }) {
  const S = size;
  const rx = S * 0.2;
  const pad = S * 0.1;
  const uid_b = border.replace("#","");
  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{ display:"block" }}>
      <defs>
        <linearGradient id={`inner_${uid_b}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F0F2F8" />
        </linearGradient>
        <linearGradient id={`glim_${uid_b}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="white" stopOpacity="0.0" />
          <stop offset="35%"  stopColor="white" stopOpacity="0.7" />
          <stop offset="52%"  stopColor="white" stopOpacity="0.7" />
          <stop offset="100%" stopColor="white" stopOpacity="0.0" />
        </linearGradient>
        <filter id={`sh_${uid_b}`} x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy={S*0.025} stdDeviation={S*0.04} floodColor="rgba(0,0,0,0.28)" />
        </filter>
        <clipPath id={`clip_${uid_b}`}>
          <rect x={pad} y={pad} width={S-pad*2} height={S-pad*2} rx={rx*0.65}/>
        </clipPath>
      </defs>
      <rect x="1" y="1" width={S-2} height={S-2} rx={rx}
        fill={border} filter={`url(#sh_${uid_b})`}/>
      <rect x={pad} y={pad} width={S-pad*2} height={S-pad*2} rx={rx*0.65}
        fill={`url(#inner_${uid_b})`}/>
      <g clipPath={`url(#clip_${uid_b})`}>
        {children}
      </g>
      <rect x={pad} y={pad} width={S-pad*2} height={S-pad*2} rx={rx*0.65}
        fill={`url(#glim_${uid_b})`}/>
    </svg>
  );
}

function DiceFire({ size=60, dot=1 }) {
  const S=size, b=DICE_DEFS.fire.border;
  return (
    <DiceCard size={S} border={b}>
      <path d={`M${S*.5},${S*.12} C${S*.5},${S*.12} ${S*.68},${S*.28} ${S*.66},${S*.42} C${S*.74},${S*.34} ${S*.76},${S*.22} ${S*.72},${S*.14} C${S*.82},${S*.26} ${S*.84},${S*.42} ${S*.78},${S*.54} C${S*.84},${S*.5} ${S*.86},${S*.4} ${S*.84},${S*.32} C${S*.9},${S*.44} ${S*.88},${S*.62} ${S*.78},${S*.7} C${S*.84},${S*.68} ${S*.86},${S*.6} ${S*.85},${S*.52} C${S*.9},${S*.64} ${S*.87},${S*.78} ${S*.76},${S*.84} C${S*.66},${S*.9} ${S*.58},${S*.88} ${S*.5},${S*.88} C${S*.42},${S*.88} ${S*.34},${S*.9} ${S*.24},${S*.84} C${S*.13},${S*.78} ${S*.1},${S*.64} ${S*.15},${S*.52} C${S*.14},${S*.6} ${S*.16},${S*.68} ${S*.22},${S*.7} C${S*.12},${S*.62} ${S*.1},${S*.44} ${S*.16},${S*.32} C${S*.15},${S*.4} ${S*.16},${S*.5} ${S*.22},${S*.54} C${S*.16},${S*.42} ${S*.18},${S*.26} ${S*.28},${S*.14} C${S*.24},${S*.22} ${S*.26},${S*.34} ${S*.34},${S*.42} C${S*.32},${S*.28} ${S*.5},${S*.12} Z`}
        fill={b} opacity="0.62"/>
      <path d={`M${S*.5},${S*.18} C${S*.5},${S*.18} ${S*.62},${S*.3} ${S*.6},${S*.4} C${S*.66},${S*.34} ${S*.67},${S*.25} ${S*.65},${S*.2} C${S*.72},${S*.3} ${S*.72},${S*.42} ${S*.66},${S*.5} C${S*.7},${S*.48} ${S*.71},${S*.4} ${S*.7},${S*.34} C${S*.74},${S*.44} ${S*.72},${S*.58} ${S*.64},${S*.66} C${S*.68},${S*.64} ${S*.69},${S*.56} ${S*.68},${S*.5} C${S*.72},${S*.6} ${S*.69},${S*.72} ${S*.6},${S*.78} C${S*.54},${S*.82} ${S*.5},${S*.82} ${S*.46},${S*.82} C${S*.4},${S*.82} ${S*.36},${S*.82} ${S*.32},${S*.77} C${S*.26},${S*.7} ${S*.26},${S*.6} ${S*.3},${S*.5} C${S*.29},${S*.56} ${S*.3},${S*.64} ${S*.34},${S*.66} C${S*.26},${S*.58} ${S*.24},${S*.44} ${S*.28},${S*.34} C${S*.27},${S*.4} ${S*.28},${S*.48} ${S*.32},${S*.5} C${S*.26},${S*.42} ${S*.26},${S*.3} ${S*.34},${S*.2} C${S*.32},${S*.25} ${S*.32},${S*.34} ${S*.38},${S*.4} C${S*.36},${S*.3} ${S*.5},${S*.18} Z`}
        fill={b} opacity="0.72"/>
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

const DICE_SVG = { fire:DiceFire, electric:DiceElectric, poison:DicePoison, ice:DiceIce, steel:DiceSteel, broken:DiceBroken, gamble:DiceGamble, lock:DiceLock, wind:DiceWind };
function DiceSVG({ type, dot=1, size=56 }) {
  const C = DICE_SVG[type]; return C ? <C size={size} dot={dot}/> : null;
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

function monSPReward(monType, wave) {
  if (monType === "boss") return wave * 100;
  if (monType === "big")  return wave * 50;
  return wave * 10;
}

function buildWave(wave) {
  const isDeath = wave >= 7, isFury = wave >= 11;
  const count = 6 + wave * 2;
  const sm = (isDeath ? 1.35 : 1) * (isFury ? 1.3 : 1);
  return Array.from({length: count}, (_, i) => {
    const isBoss = i === count - 1;
    const t = isBoss ? "boss" : Math.random() < 0.15 ? "big" : Math.random() < 0.3 ? "speed" : "normal";
    const hpMult = (1 + wave * 0.25) * (isFury && isBoss ? 2 : 1);
    return { monType: t, hpMult, sm, delay: i * 1.4 };
  });
}

function spawnEnemy(spec, wave) {
  const ms = MON_SPECS[spec.monType];
  // 보스 HP: 25000 * wave (잔여 몬스터 HP는 스폰 시점에 계산 불가하여 기본값)
  const hp = spec.monType === "boss"
    ? ms.hpBase * wave
    : ms.hpBase * spec.hpMult;
  return {
    id: uid(), monType: spec.monType,
    w: ms.w, h: ms.h, shape: ms.shape, color: ms.color,
    heartDmg: ms.heartDmg, isBoss: ms.isBoss,
    hp, maxHp: hp,
    speed: ms.speed * (spec.sm || 1),
    pathD: 0, x: PATH_WP[0].x, y: PATH_WP[0].y,
    dist: PATH_SEG.total,
    slowStacks: 0, slowTimer: 0, locked: 0, poison: null,
  };
}

function makePlayer(id, deck) {
  return {
    id, deck, sp: 100, summonCost: 10, hearts: 3,
    dice: {}, enemies: [], projs: [], effects: [],
    wave: 0, waveActive: false,
    spawnQueue: [], spawnTimer: 0, waveTimer: 5,
    dead: false, score: 0,
  };
}

function makeDice(type, dot = 1) {
  const def = DICE_DEFS[type], ab = def.ability;
  const cdBase = (1/def.atkSpeed) * (ab.type==="atkSpeedBuff" ? (1-ab.reductionPct/100) : 1);
  return { id: uid(), type, dot, level: 1, cd: 0, cdBase };
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
  const lm = 1 + (proj.level-1)*0.5, dm = 1 + (proj.dot-1)*0.3;
  let dmg = proj.dmg;
  if (ab.type === "bossKiller" && tgt.isBoss) dmg *= ab.mult;
  if (ab.type === "randomDmg") { const lo = def.baseDmg*dm*lm; dmg = lo + Math.random()*(lo*4); }
  dealDmg(p, tgt, dmg);
  if (ab.type === "splash") {
    for (const e of p.enemies) if (e.id!==tgt.id && e.hp>0 && Math.hypot(e.x-tgt.x,e.y-tgt.y)<=ab.radius) dealDmg(p,e,ab.dmg*dm*lm);
    spawnFx(p,"burst",tgt.x,tgt.y,def.border);
  }
  if (ab.type === "chain") {
    let last = tgt;
    for (let ci=0;ci<ab.count;ci++) {
      const nx = p.enemies.filter(e=>e.id!==tgt.id&&e.id!==last.id&&e.hp>0)
        .sort((a,b)=>Math.hypot(a.x-last.x,a.y-last.y)-Math.hypot(b.x-last.x,b.y-last.y))[0];
      if (!nx) break;
      dealDmg(p, nx, ab.dmg*dm*lm*ab.ratios[ci]);
      spawnFx(p,"chain",nx.x,nx.y,def.border); last = nx;
    }
  }
  if (ab.type === "poison") tgt.poison = { dps: ab.dps*dm*lm, timer:0, tick:ab.tick };
  if (ab.type === "slow") { tgt.slowStacks = Math.min((tgt.slowStacks||0)+1, ab.maxStacks); tgt.slowTimer = 3; }
  if (ab.type === "lock" && !tgt.locked && Math.random() < ab.prob) { tgt.locked = ab.duration; spawnFx(p,"lock",tgt.x,tgt.y,"#8090FF"); }
  spawnFx(p,"hit",tgt.x,tgt.y,def.border);
  spawnTxt(p,tgt.x,tgt.y,Math.round(dmg));
}

function tickPlayer(p, dt, onKill) {
  if (!p.waveActive) {
    p.waveTimer -= dt;
    if (p.waveTimer <= 0) {
      p.wave++;
      p.spawnQueue = buildWave(p.wave);
      p.waveActive = true;
      p.spawnTimer = 0;
    }
  }
  if (p.waveActive && p.spawnQueue.length) {
    p.spawnTimer += dt;
    while (p.spawnQueue.length && p.spawnTimer >= p.spawnQueue[0].delay) {
      p.enemies.push(spawnEnemy(p.spawnQueue.shift(), p.wave));
    }
  }

  const toRemove = new Set();
  for (const e of p.enemies) {
    if (e.hp <= 0) {
      const reward = monSPReward(e.monType, p.wave);
      p.sp += reward;
      p.score += reward * 10;
      for (let k=0;k<6;k++) p.effects.push({id:uid(),type:"particle",x:e.x,y:e.y,vx:(Math.random()-.5)*140,vy:(Math.random()-.5)*140,color:e.color,size:3+Math.random()*5,life:0.5,maxLife:0.5});
      onKill && onKill(e);
      toRemove.add(e.id);
      continue;
    }
    if (e.poison) {
      e.poison.timer += dt;
      while (e.poison.timer >= e.poison.tick) { e.poison.timer -= e.poison.tick; dealDmg(p,e,e.poison.dps*dt); }
      if (e.hp <= 0) { const r=monSPReward(e.monType,p.wave); p.sp+=r; p.score+=r*10; onKill&&onKill(e); toRemove.add(e.id); continue; }
    }
    if (e.slowTimer > 0) { e.slowTimer -= dt; if (e.slowTimer <= 0) e.slowStacks = 0; }
    if (e.locked > 0) { e.locked = Math.max(0, e.locked-dt); continue; }
    const sm = 1 - (e.slowStacks||0)*0.05;
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

  if (p.waveActive && !p.spawnQueue.length && !p.enemies.length) {
    p.waveActive = false;
    p.waveTimer = 60;
  }

  const newProjs = [];
  for (const [key, d] of Object.entries(p.dice)) {
    if (!d) continue;
    d.cd -= dt; if (d.cd > 0) continue;
    const def = DICE_DEFS[d.type];
    const {x:cx, y:cy} = cellXY(...key.split(",").map(Number));
    const live = p.enemies.filter(e=>e.hp>0); if (!live.length) continue;
    const tgt = pickTarget(live, def.target); if (!tgt) continue;
    d.cd = d.cdBase / (1+(d.dot-1)*0.03);
    const dmg = def.baseDmg * (1+(d.dot-1)*0.3) * (1+(d.level-1)*0.5);
    const pc = d.dot;
    for (let pi=0;pi<pc;pi++) {
      const spread = pc>1 ? (pi/(pc-1)-0.5)*0.25 : 0;
      newProjs.push({id:uid(),x:cx,y:cy,targetId:tgt.id,dmg,diceType:d.type,dot:d.dot,level:d.level,color:def.border,speed:520,angleSpread:spread,tx:tgt.x,ty:tgt.y});
    }
  }

  const hitIds = new Set();
  const all = [...p.projs, ...newProjs];
  for (const pr of all) {
    if (hitIds.has(pr.id)) continue;
    const tgt = p.enemies.find(e=>e.id===pr.targetId&&e.hp>0);
    const tx = tgt?tgt.x:pr.tx, ty = tgt?tgt.y:pr.ty;
    if (tgt) { pr.tx=tx; pr.ty=ty; }
    const dx=tx-pr.x, dy=ty-pr.y, dist=Math.hypot(dx,dy), step=pr.speed*dt;
    if (dist <= step+3) { hitIds.add(pr.id); if(tgt&&tgt.hp>0) applyHit(p,pr,tgt); }
    else { const a=Math.atan2(dy,dx)+pr.angleSpread; pr.x+=Math.cos(a)*step; pr.y+=Math.sin(a)*step; }
  }
  p.projs = all.filter(pr=>!hitIds.has(pr.id));

  p.effects = p.effects
    .map(ef => ({...ef, life:ef.life-dt, x:ef.x+(ef.vx||0)*dt, y:ef.y+(ef.vy||0)*dt}))
    .filter(ef => ef.life > 0);
}

// ═══════════════════════════════════════════════════════════════
//  GAME BOARD
// ═══════════════════════════════════════════════════════════════
function GameBoard({ p, flipped, dragState, onDragStart, onDrop, onCellTap }) {
  const anti = flipped ? {transform:"scaleY(-1)"} : {};
  const ptrRef = useRef(null);

  const onPD = (e, key) => {
    const d = p.dice[key];
    if (!d || d.dot === 7) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    ptrRef.current = { key, sx: e.clientX, sy: e.clientY, moved: false };
    e.stopPropagation();
  };

  const onPM = (e, key) => {
    const pd = ptrRef.current;
    if (!pd || pd.key !== key) return;
    if (!pd.moved && Math.hypot(e.clientX-pd.sx, e.clientY-pd.sy) > 8) {
      pd.moved = true;
      onDragStart(p.id, key);
    }
    e.stopPropagation();
  };

  const onPU = (e, key) => {
    const pd = ptrRef.current;
    if (!pd) return;
    if (pd.moved) {
      onDrop(p.id, key);
    } else {
      onCellTap(p.id, key);
    }
    ptrRef.current = null;
    e.stopPropagation();
  };

  const srcKey = dragState?.pid === p.id ? dragState.key : null;
  const srcDice = srcKey ? p.dice[srcKey] : null;

  return (
    <div style={{position:"relative",width:BW,height:BH,background:"#FFFFFF",borderRadius:12,
      boxShadow:"0 2px 16px rgba(0,0,0,0.11)",overflow:"hidden",
      transform: flipped ? "scaleY(-1)" : "none",
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
        const canDrop = !!(srcDice && d && !isSrc && d.dot<7 && srcDice.type===d.type && srcDice.dot===d.dot);
        return (
          <div key={key}
            onPointerDown={d ? e=>onPD(e,key) : undefined}
            onPointerMove={d ? e=>onPM(e,key) : undefined}
            onPointerUp={e=>onPU(e,key)}
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
              <div style={{...anti,display:"flex",flexDirection:"column",alignItems:"center",gap:1,pointerEvents:"none"}}>
                <DiceSVG type={d.type} dot={d.dot} size={CELL-12}/>
                {d.level>1 && <div style={{fontSize:8,fontWeight:"bold",color:"#fff",background:"rgba(0,0,0,0.45)",borderRadius:3,padding:"0 3px",lineHeight:"13px"}}>Lv{d.level}</div>}
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
              <div style={{
                ...anti,
                fontSize: sz<=22?8:10, fontWeight:"bold",
                color:"#fff", textShadow:"0 1px 2px rgba(0,0,0,0.8)",
                lineHeight:1, pointerEvents:"none",
              }}>{dispHp && dispHp > 0 ? dispHp : ""}</div>
            )}
          </div>
        );
      })}

      {/* 투사체 */}
      {p.projs.map(pr=>(
        <div key={pr.id} style={{position:"absolute",left:pr.x-4,top:pr.y-4,width:8,height:8,
          background:pr.color,borderRadius:"50%",boxShadow:`0 0 6px ${pr.color}`,
          pointerEvents:"none",zIndex:25}}/>
      ))}

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
        return null;
      })}

      {/* 다음 웨이브 카운트다운 */}
      {!p.waveActive && p.waveTimer>0 && (
        <div style={{...anti,position:"absolute",bottom:6,left:"50%",
          transform:`translateX(-50%)${flipped?" scaleY(-1)":""}`,
          fontSize:11,color:"#667",background:"rgba(240,244,255,0.93)",
          padding:"2px 10px",borderRadius:8,whiteSpace:"nowrap",border:"1px solid #DDE",pointerEvents:"none"}}>
          웨이브 {p.wave+1} · {p.waveTimer.toFixed(1)}s
        </div>
      )}

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

  const typeMap = {};
  for (const d of Object.values(p.dice)) {
    if (!d) continue;
    if (!typeMap[d.type] || d.level < typeMap[d.type].level) typeMap[d.type] = d;
  }
  const diceList = Object.values(typeMap);

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
        <span style={{fontSize:10,color:"#99a",fontWeight:"bold"}}>W{p.wave}</span>
        <div style={{flex:1}}/>
        <span style={{fontSize:13,fontWeight:800,color:"#334"}}>💰 {Math.floor(p.sp)} SP</span>
        <span style={{fontSize:10,color:"#99a"}}>🏆{p.score.toLocaleString()}</span>
      </div>

      <div style={{display:"flex",alignItems:"flex-start",gap:10,padding:"8px 12px"}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,flexShrink:0}}>
          <button onClick={onSummon} disabled={p.sp<p.summonCost}
            style={{
              width:54,height:54,borderRadius:"50%",
              background: p.sp>=p.summonCost
                ? `radial-gradient(circle at 35% 35%, ${accent}bb, ${accent})`
                : "#c8cce0",
              border:`2.5px solid ${p.sp>=p.summonCost?accent+"88":"#bbb"}`,
              color:"#fff",fontSize:24,cursor:p.sp>=p.summonCost?"pointer":"default",
              boxShadow:p.sp>=p.summonCost?`0 3px 14px ${accent}66`:"none",
              display:"flex",alignItems:"center",justifyContent:"center",
              padding:0,transition:"all .15s",
            }}>🎲</button>
          <div style={{fontSize:9,color:"#667",textAlign:"center",lineHeight:1.3,fontWeight:"bold"}}>
            소환<br/>{p.summonCost}SP
          </div>
        </div>

        <div style={{display:"flex",gap:6,flexWrap:"wrap",flex:1,minHeight:74}}>
          {diceList.length===0 && (
            <div style={{fontSize:10,color:"#bbc",alignSelf:"center",padding:"0 4px"}}>주사위를 소환하세요</div>
          )}
          {diceList.map(d => {
            const def = DICE_DEFS[d.type];
            const cost = d.level < 5 ? LV_COST[d.level-1] : null;
            const canUp = !!(cost && p.sp >= cost);
            return (
              <div key={d.type} onClick={()=>canUp && onLevelUp(d.type)}
                style={{
                  display:"flex",flexDirection:"column",alignItems:"center",gap:2,
                  padding:"5px 6px 4px",
                  background: canUp ? "#fff" : "#f0f2f8",
                  border:`1.5px solid ${canUp ? def.border : "#dde"}`,
                  borderRadius:10,
                  cursor: canUp ? "pointer" : "default",
                  boxShadow: canUp ? `0 2px 8px ${def.border}44` : "none",
                  transition:"all .12s",
                  minWidth:50,
                }}>
                <DiceSVG type={d.type} dot={d.dot} size={34}/>
                <div style={{fontSize:9,fontWeight:700,color:"#334",lineHeight:1}}>Lv.{d.level}</div>
                <div style={{fontSize:8,color:canUp?def.border:"#aab",fontWeight:"bold",lineHeight:1}}>
                  {cost ? `${cost}SP` : "MAX"}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  DECK BUILDER
// ═══════════════════════════════════════════════════════════════
function DeckPanel({ label, deck, setDeck, accent }) {
  const toggle = k => {
    if (deck.includes(k)) { if (deck.length > 1) setDeck(deck.filter(x=>x!==k)); }
    else if (deck.length < 5) setDeck([...deck,k]);
  };
  return (
    <div style={{background:"#fff",border:`1.5px solid ${accent}44`,borderRadius:14,padding:16,minWidth:240,boxShadow:`0 4px 20px ${accent}18`}}>
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
            {sel && <span style={{color:d.border,fontSize:15}}>✓</span>}
          </div>
        );
      })}
    </div>
  );
}

function DeckBuilder({ p1Deck,p2Deck,setP1Deck,setP2Deck,onStart }) {
  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#EEF2FF,#F5F0FF)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:28,fontFamily:"'Segoe UI',system-ui,sans-serif",color:"#223",padding:24}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:32,fontWeight:900,letterSpacing:3}}>🎲 RANDOM DICE</div>
        <div style={{fontSize:12,color:"#99a",letterSpacing:2,marginTop:6}}>덱 5개 선택</div>
      </div>
      <div style={{display:"flex",gap:24,flexWrap:"wrap",justifyContent:"center"}}>
        <DeckPanel label="🔵 P1 덱" deck={p1Deck} setDeck={setP1Deck} accent="#3355EE"/>
        <DeckPanel label="🔴 P2 덱" deck={p2Deck} setDeck={setP2Deck} accent="#EE3355"/>
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
            <div style={{fontSize:13,color:"#667"}}>점수 {p.score.toLocaleString()}</div>
          </div>
        ))}
      </div>
      <button onClick={onRestart} style={{padding:"12px 40px",background:"linear-gradient(135deg,#3355EE,#1133BB)",border:"none",borderRadius:12,color:"#fff",fontSize:16,fontWeight:800,cursor:"pointer"}}>🔄 다시하기</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  ROOT APP
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const [phase, setPhase] = useState("deck");
  const [winner, setWinner] = useState(null);
  const [p1Deck, setP1Deck] = useState(["fire","electric","ice","wind","steel"]);
  const [p2Deck, setP2Deck] = useState(["poison","broken","gamble","lock","ice"]);

  const gsRef = useRef(null);
  const rafRef = useRef(null);
  const lastTRef = useRef(0);
  const [, setTick] = useState(0);
  const rerender = useCallback(() => setTick(t=>t+1), []);

  const [drag, setDrag] = useState(null);
  const [tapKey, setTapKey] = useState([null, null]);

  const loop = useCallback(ts => {
    if (!gsRef.current) return;
    if (!lastTRef.current) lastTRef.current = ts;
    const dt = Math.min((ts - lastTRef.current) / 1000, 0.05);
    lastTRef.current = ts;
    const [p0, p1] = gsRef.current.players;

    const onKill0 = (e) => {
      if (p1.dead) return;
      const t = Math.random()<0.15?"big":Math.random()<0.3?"speed":"normal";
      const bonus = spawnEnemy({monType:t, hpMult:1+p0.wave*0.2, sm:1}, p0.wave);
      bonus.pathD = Math.random()*60;
      const pos = posOnPath(bonus.pathD);
      bonus.x = pos.x; bonus.y = pos.y;
      p1.enemies.push(bonus);
    };
    const onKill1 = (e) => {
      if (p0.dead) return;
      const t = Math.random()<0.15?"big":Math.random()<0.3?"speed":"normal";
      const bonus = spawnEnemy({monType:t, hpMult:1+p1.wave*0.2, sm:1}, p1.wave);
      bonus.pathD = Math.random()*60;
      const pos = posOnPath(bonus.pathD);
      bonus.x = pos.x; bonus.y = pos.y;
      p0.enemies.push(bonus);
    };

    if (!p0.dead) tickPlayer(p0, dt, onKill0);
    if (!p1.dead) tickPlayer(p1, dt, onKill1);

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
    gsRef.current = { players: [makePlayer(0,p1Deck), makePlayer(1,p2Deck)] };
    setPhase("game");
  }, [p1Deck, p2Deck]);

  const summon = useCallback(pid => {
    const p = gsRef.current?.players[pid]; if (!p || p.sp < p.summonCost) return;
    const empties = [];
    for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) { const k=cellKey(c,r); if(!p.dice[k]) empties.push(k); }
    if (!empties.length) return;
    p.dice[rnd(empties)] = makeDice(rnd(p.deck));
    p.sp -= p.summonCost; p.summonCost += 10;
    rerender();
  }, [rerender]);

  const handleDragStart = useCallback((pid, key) => {
    setDrag({ pid, key });
  }, []);

  const handleDrop = useCallback((pid, targetKey) => {
    const p = gsRef.current?.players[pid];
    if (!p || !drag || drag.pid !== pid) { setDrag(null); return; }
    const srcKey = drag.key;
    setDrag(null);
    if (srcKey === targetKey) return;
    const src = p.dice[srcKey], tgt = p.dice[targetKey];
    if (!src || !tgt) return;
    if (src.type === tgt.type && src.dot === tgt.dot && src.dot < 7) {
      const newDot = src.dot + 1;
      const newType = rnd(p.deck);
      delete p.dice[srcKey];
      p.dice[targetKey] = makeDice(newType, newDot);
      rerender();
    }
  }, [drag, rerender]);

  const handleCellTap = useCallback((pid, key) => {
    setTapKey(tk => { const n=[...tk]; n[pid] = n[pid]===key ? null : key; return n; });
  }, []);

  const handleLevelUp = useCallback((pid, diceType) => {
    const p = gsRef.current?.players[pid]; if (!p) return;
    const entries = Object.entries(p.dice)
      .filter(([,d])=>d && d.type===diceType)
      .sort(([,a],[,b])=>a.level-b.level);
    if (!entries.length) return;
    const [, d] = entries[0];
    if (d.level >= 5) return;
    const cost = LV_COST[d.level-1];
    if (p.sp < cost) return;
    p.sp -= cost; d.level++;
    const def=DICE_DEFS[d.type], ab=def.ability;
    d.cdBase = (1/def.atkSpeed)*(ab.type==="atkSpeedBuff"?(1-ab.reductionPct/100):1);
    rerender();
  }, [rerender]);

  if (phase==="deck") return <DeckBuilder p1Deck={p1Deck} p2Deck={p2Deck} setP1Deck={setP1Deck} setP2Deck={setP2Deck} onStart={startGame}/>;
  if (phase==="over") return <GameOver winner={winner} gs={gsRef.current} onRestart={()=>{setPhase("deck");setWinner(null);setDrag(null);setTapKey([null,null]);}}/>;

  const gs = gsRef.current; if (!gs) return null;
  const [p0, p1] = gs.players;

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
        dragState={drag}
        onDragStart={handleDragStart}
        onDrop={handleDrop}
        onCellTap={handleCellTap}
      />

      <div style={{width:"100%",maxWidth:BW,height:1,background:"rgba(0,0,0,0.08)"}}/>

      {/* P1 하단 */}
      <GameBoard p={p0} flipped={false}
        dragState={drag}
        onDragStart={handleDragStart}
        onDrop={handleDrop}
        onCellTap={handleCellTap}
      />
      <HUD p={p0} pid={0} accent="#3355EE" flipped={false}
        onSummon={()=>summon(0)}
        onLevelUp={t=>handleLevelUp(0,t)}
      />

      <div style={{fontSize:9,color:"#bbc"}}>
        드래그로 합성 · 파워업 패널 클릭으로 레벨업
      </div>
    </div>
  );
}
