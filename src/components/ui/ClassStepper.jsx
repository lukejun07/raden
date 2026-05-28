import React from 'react';

const CLASS_MAX = 15;

export function ClassStepper({ value, onChange, color, minClass = 1 }) {
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

export function CritMultSelector({ value, onChange, accent }) {
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
