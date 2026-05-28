import React from 'react';
import { DICE_REGISTRY, DICE_KEYS } from '../../game/dice/index.js';
import { ClassStepper, CritMultSelector } from './ClassStepper.jsx';
import DiceSVG from '../dice/DiceSVG.jsx';

function DeckPanel({ label, deck, setDeck, accent, classLevels, setClass, critMult, setCritMult, onInvOpen }) {
  const toggle = k => {
    if (deck.includes(k)) { if (deck.length > 1) setDeck(deck.filter(x=>x!==k)); }
    else if (deck.length < 5) setDeck([...deck,k]);
  };
  return (
    <div style={{background:"#fff",border:`1.5px solid ${accent}44`,borderRadius:14,padding:16,minWidth:260,boxShadow:`0 4px 20px ${accent}18`}}>
      <div style={{fontWeight:800,color:accent,marginBottom:10,fontSize:14}}>{label} ({deck.length}/5)</div>
      <button onClick={onInvOpen} style={{fontSize:11,padding:'3px 10px',background:accent,border:'none',color:'#fff',borderRadius:6,cursor:'pointer',fontWeight:700,marginLeft:'auto',display:'block',marginBottom:8}}>📦 인벤토리</button>
      {DICE_KEYS.map(k=>{
        const d=DICE_REGISTRY[k]; const sel=deck.includes(k);
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

export default function DeckBuilder({ p1Deck,p2Deck,setP1Deck,setP2Deck,p1Class,setP1Class,p2Class,setP2Class,p1CritMult,setP1CritMult,p2CritMult,setP2CritMult,onStart,setInvOpen,setInvPlayer }) {
  const setP1ClassFor = (type, v) => setP1Class(prev=>({...prev,[type]:v}));
  const setP2ClassFor = (type, v) => setP2Class(prev=>({...prev,[type]:v}));
  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#EEF2FF,#F5F0FF)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:28,fontFamily:"'Segoe UI',system-ui,sans-serif",color:"#223",padding:24}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:32,fontWeight:900,letterSpacing:3}}>🎲 RANDOM DICE</div>
        <div style={{fontSize:12,color:"#99a",letterSpacing:2,marginTop:6}}>덱 5개 선택 · C = 클래스 레벨</div>
      </div>
      <div style={{display:"flex",gap:24,flexWrap:"wrap",justifyContent:"center"}}>
        <DeckPanel label="🔵 P1 덱" deck={p1Deck} setDeck={setP1Deck} accent="#3355EE" classLevels={p1Class} setClass={setP1ClassFor} critMult={p1CritMult} setCritMult={setP1CritMult} onInvOpen={() => { setInvPlayer(0); setInvOpen(true); }}/>
        <DeckPanel label="🔴 P2 덱" deck={p2Deck} setDeck={setP2Deck} accent="#EE3355" classLevels={p2Class} setClass={setP2ClassFor} critMult={p2CritMult} setCritMult={setP2CritMult} onInvOpen={() => { setInvPlayer(1); setInvOpen(true); }}/>
      </div>
      <button onClick={onStart} style={{padding:"14px 56px",background:"linear-gradient(135deg,#3355EE,#1133BB)",border:"none",borderRadius:14,color:"#fff",fontSize:18,fontWeight:800,cursor:"pointer",boxShadow:"0 4px 24px #3355EE55",letterSpacing:2}}>⚔️ 대전 시작</button>
    </div>
  );
}
