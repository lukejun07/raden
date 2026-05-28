import React, { useRef } from 'react';
import { DOT_LAYOUTS } from '../../game/engine/utils.js';

let _dcCtr = 0;
export function nextDcId() { return _dcCtr++; }

export function StarDot({ size, color, legend=false }) {
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
      stroke={legend ? "rgba(255,255,255,0.7)" : "none"}
      strokeWidth={legend ? S*0.025 : 0}
      style={{ filter: `drop-shadow(0 0 ${S*0.04}px rgba(0,0,0,0.4))` }} />
  );
}

export function DotLayer({ dot, color, size, legend=false }) {
  if (dot === 7) return <StarDot size={size} color={color} legend={legend}/>;
  const pos = DOT_LAYOUTS[dot] || DOT_LAYOUTS[1];
  const r = size * (dot <= 2 ? 0.075 : dot <= 4 ? 0.068 : 0.06);
  return (
    <>
      {pos.map(([px, py], i) => (
        <circle key={i}
          cx={(px / 100) * size} cy={(py / 100) * size} r={r}
          fill={color}
          stroke={legend ? "rgba(255,255,255,0.72)" : "none"}
          strokeWidth={legend ? r * 0.5 : 0}
          style={{ filter: `drop-shadow(0 ${size*0.012}px ${size*0.02}px rgba(0,0,0,0.25))` }}
        />
      ))}
    </>
  );
}

export function DiceCard({ size, border, children }) {
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

export function GakNakBorder({ S, color="#C8A000" }) {
  const arm = S * 0.44, sw = S * 0.078, h = sw / 2;
  const gPath = `M${S - arm},${h} L${S - h},${h} L${S - h},${arm}`;
  const nPath = `M${h},${S - arm} L${h},${S - h} L${arm},${S - h}`;
  return (
    <>
      <path d={gPath} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="square" strokeLinejoin="miter" opacity="0.95"/>
      <path d={nPath} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="square" strokeLinejoin="miter" opacity="0.95"/>
    </>
  );
}

export function DiceCardLegend({ size, borderColor="#C8A000", children }) {
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
      <GakNakBorder S={S} color={borderColor}/>
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

export function DiceImgBase({ size, img, dotColor, dot, scale=1.1, imgDy=0 }) {
  const S = size;
  const sc = scale, off = -(S * (sc - 1) / 2);
  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{display:"block"}}>
      <image href={img} x={off} y={off + imgDy} width={S*sc} height={S*sc}/>
      <DotLayer dot={dot} color={dotColor} size={S}/>
    </svg>
  );
}
