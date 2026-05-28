import React from 'react';

export function formatTime(sec) {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
}

export default function GameOver({ winner, gs, onRestart }) {
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
