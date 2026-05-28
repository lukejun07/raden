import React from 'react';
import { CELL, COLS, ROWS, BW, BH } from '../../game/constants.js';
import { cellKey } from '../../game/engine/utils.js';
import { PATH_WP } from '../../game/engine/paths.js';
import DiceSVG from '../dice/DiceSVG.jsx';
import { clamp } from '../../game/engine/utils.js';

export default function GameBoard({ p, flipped, dragState, onDragStart, onDragMove, onDragEnd, boardRef }) {
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
      <svg style={{position:"absolute",inset:0,pointerEvents:"none"}} width={BW} height={BH}>
        <polyline points={PATH_WP.map(pt=>`${pt.x},${pt.y}`).join(" ")}
          fill="none" stroke="#E8EEF8" strokeWidth={CELL*0.86} strokeLinejoin="round" strokeLinecap="round"/>
        <polyline points={PATH_WP.map(pt=>`${pt.x},${pt.y}`).join(" ")}
          fill="none" stroke="#CDD8F0" strokeWidth={1.2} strokeLinejoin="round" strokeLinecap="round" strokeDasharray="5 5"/>
      </svg>

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

      {p.projs.map(pr=>(
        <div key={pr.id} style={{position:"absolute",left:pr.x-4,top:pr.y-4,width:8,height:8,
          background:pr.color,borderRadius:"50%",
          boxShadow:`0 0 6px ${pr.color}`,
          pointerEvents:"none",zIndex:25}}/>
      ))}

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
          const prog = 1 - a;
          const rs = (CELL-4) * (0.1 + prog * 1.0);
          const bw = Math.max(1.5, 3.5 - prog * 2);
          return <div key={ef.id} style={{...bs,left:ef.x-rs/2,top:ef.y-rs/2,width:rs,height:rs,borderRadius:"50%",border:`${bw}px solid ${ef.color}`,boxShadow:`0 0 ${12*(1-prog*0.5)}px ${ef.color}`,opacity:a*0.9,zIndex:30}}/>;
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
