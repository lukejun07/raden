import React from 'react';
import { BW, LV_COST } from '../../game/constants.js';
import { DICE_REGISTRY } from '../../game/dice/index.js';
import DiceSVG from '../dice/DiceSVG.jsx';

export default function HUD({ p, pid, accent, onSummon, onLevelUp }) {
  const isDeath = p.wave>=7, isFury = p.wave>=11;
  const canSummon = p.sp >= p.summonCost;

  const diceList = p.deck.map(type => {
    const def = DICE_REGISTRY[type];
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
