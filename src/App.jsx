import React, { useState, useEffect, useRef, useCallback } from "react";
import { CELL, COLS, ROWS, BW } from "./game/constants.js";
import { DICE_KEYS, DICE_REGISTRY } from "./game/dice/index.js";
import { cellKey, rnd, getStat } from "./game/engine/utils.js";
import { makePlayer, makeDice, addDiceAnim } from "./game/engine/player.js";
import { spawnEnemy } from "./game/engine/enemy.js";
import { posOnPath } from "./game/engine/paths.js";
import { tickPlayer } from "./game/engine/loop.js";
import { uid } from "./game/engine/utils.js";
import { LV_COST } from "./game/constants.js";
import { formatTime } from "./components/ui/GameOver.jsx";
import DeckBuilder from "./components/ui/DeckSelector.jsx";
import InventoryScreen from "./components/ui/InventoryScreen.jsx";
import GameOver from "./components/ui/GameOver.jsx";
import GameBoard from "./components/game/GameBoard.jsx";
import HUD from "./components/game/GameUI.jsx";
import DiceSVG from "./components/dice/DiceSVG.jsx";

export default function App() {
  const [phase, setPhase] = useState("deck");
  const [winner, setWinner] = useState(null);
  const [p1Deck, setP1Deck] = useState(["fire","electric","ice","wind","steel"]);
  const [p2Deck, setP2Deck] = useState(["poison","broken","gamble","lock","ice"]);
  const [p1Class, setP1Class] = useState({});
  const [p2Class, setP2Class] = useState({});
  const [p1CritMult, setP1CritMult] = useState(2);
  const [p2CritMult, setP2CritMult] = useState(2);
  const [inventory] = useState(() => Object.fromEntries(DICE_KEYS.map(k => [k, 3])));
  const [invOpen, setInvOpen] = useState(false);
  const [invPlayer, setInvPlayer] = useState(0);

  const gsRef = useRef(null);
  const rafRef = useRef(null);
  const lastTRef = useRef(0);
  const [, setTick] = useState(0);
  const rerender = useCallback(() => setTick(t=>t+1), []);

  const dragRef = useRef(null);
  const [dragVis, setDragVis] = useState(null);
  const boardRefs = useRef([null, null]);

  const loop = useCallback(ts => {
    if (!gsRef.current) return;
    if (!lastTRef.current) lastTRef.current = ts;
    const dt = Math.min((ts - lastTRef.current) / 1000, 0.05);
    lastTRef.current = ts;
    const [p0, p1] = gsRef.current.players;
    const gs = gsRef.current;

    const onKill0 = () => {
      if (p0.bossRound || p1.dead) return;
      p0.totalKills = (p0.totalKills||0) + 1;
      if (p0.totalKills % 10 === 0) p1.spawnQueue.push({monType:"speed", wave:p0.wave});
      p1.spawnQueue.push({monType:"normal", wave:p0.wave});
    };
    const onKill1 = () => {
      if (p1.bossRound || p0.dead) return;
      p1.totalKills = (p1.totalKills||0) + 1;
      if (p1.totalKills % 10 === 0) p0.spawnQueue.push({monType:"speed", wave:p1.wave});
      p0.spawnQueue.push({monType:"normal", wave:p1.wave});
    };

    if (!p0.dead) tickPlayer(p0, dt, onKill0);
    if (!p1.dead) tickPlayer(p1, dt, onKill1);

    gs.spawnTimer = (gs.spawnTimer||0) + dt;
    if (gs.spawnTimer >= 0.1) {
      gs.spawnTimer -= 0.1;
      for (const p of [p0, p1]) {
        if (p.bossRound || p.dead || !p.spawnQueue.length) continue;
        const item = p.spawnQueue.shift();
        const tiw = Math.max(0, p.gameTime - (p.nextBossTime - 90));
        const m = spawnEnemy(item.monType, item.wave, tiw);
        m.pathD = Math.random() * 60;
        const pos = posOnPath(m.pathD);
        m.x = pos.x; m.y = pos.y;
        p.enemies.push(m);
      }
    }

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
          p.spawnQueue = [];
          const n = spawnEnemy("normal", nextWave, 0);
          n.pathD = Math.random() * 40;
          const pos = posOnPath(n.pathD);
          n.x = pos.x; n.y = pos.y;
          p.enemies.push(n);
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
      const n = spawnEnemy("normal", 1, 0);
      n.pathD = Math.random() * 40;
      const pos = posOnPath(n.pathD);
      n.x = pos.x; n.y = pos.y;
      p.enemies.push(n);
    }
    gsRef.current = { players, spawnTimer: 0, waveClearing: false, waveClearTimer: 0, clearedWave: 0 };
    setPhase("game");
  }, [p1Deck, p2Deck, p1Class, p2Class, p1CritMult, p2CritMult]);

  const summon = useCallback(pid => {
    const p = gsRef.current?.players[pid]; if (!p || p.sp < p.summonCost) return;
    const reserved = (p.summonPending||[]).map(ps=>ps.key);
    const empties = [];
    for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) { const k=cellKey(c,r); if(!p.dice[k]&&!reserved.includes(k)) empties.push(k); }
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
      const reserved = (p.summonPending||[]).map(ps=>ps.key);
      const empties = [];
      for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) { const k=cellKey(c,r); if(!p.dice[k]&&!reserved.includes(k)) empties.push(k); }
      if (!empties.length) return;
      const sd = dot <= 1 ? 1 : Math.floor(Math.random() * (dot - 1)) + 1;
      const st = rnd(p.deck);
      const sk = rnd(empties);
      p.summonPending = (p.summonPending||[]).concat([{
        delay:0.2, type:st, dot:sd, key:sk, lv:p.diceLevels[st]||1, clv:cl[st]||1
      }]);
      const [sc2, sr2] = sk.split(",").map(Number);
      const cx = (sc2+1)*CELL + CELL/2, cy = (sr2+1)*CELL + CELL/2;
      p.effects.push({ id:uid(), type:"summonCircle", x:cx, y:cy, color:"#00BB55", life:0.25, maxLife:0.25 });
    };

    if (srcJoker && tgtAdapt) {
      p.dice[srcKey] = makeDice("adapt", src.dot, p.diceLevels["adapt"]||1, cl["adapt"]||1);
      addDiceAnim(p, srcKey, "merge"); merged = true; isJokerCopy = true;
    } else if (srcAdapt && tgtJoker && src.dot < 7) {
      const newType = rnd(p.deck);
      delete p.dice[srcKey];
      p.dice[targetKey] = makeDice(newType, src.dot+1, p.diceLevels[newType]||1, cl[newType]||1);
      addDiceAnim(p, targetKey, "merge"); merged = true;
      if (src.type === "summon" || tgt.type === "summon") spawnSummonDice(src.dot + 1);
    } else if (srcJoker && !tgtJoker) {
      p.dice[srcKey] = makeDice(tgt.type, src.dot, p.diceLevels[tgt.type]||1, cl[tgt.type]||1);
      addDiceAnim(p, srcKey, "merge"); merged = true; isJokerCopy = true;
    } else if (!srcJoker && tgtJoker) {
      p.dice[targetKey] = makeDice(src.type, tgt.dot, p.diceLevels[src.type]||1, cl[src.type]||1);
      addDiceAnim(p, targetKey, "merge"); merged = true; isJokerCopy = true;
    } else if ((srcAdapt || tgtAdapt) && src.dot < 7) {
      const newType = rnd(p.deck);
      delete p.dice[srcKey];
      p.dice[targetKey] = makeDice(newType, src.dot+1, p.diceLevels[newType]||1, cl[newType]||1);
      addDiceAnim(p, targetKey, "merge"); merged = true;
      if (src.type === "summon" || tgt.type === "summon") spawnSummonDice(src.dot + 1);
    } else if (src.type === tgt.type && src.dot < 7) {
      const newType = rnd(p.deck);
      delete p.dice[srcKey];
      p.dice[targetKey] = makeDice(newType, src.dot+1, p.diceLevels[newType]||1, cl[newType]||1);
      addDiceAnim(p, targetKey, "merge"); merged = true;
      if (src.type === "summon") spawnSummonDice(src.dot + 1);
    }

    if (merged) {
      if (!isJokerCopy) {
        if ((src.type==="combo" && tgt.type==="combo") ||
            (src.type==="combo" && tgtAdapt) ||
            (srcAdapt && tgt.type==="combo")) {
          p.comboCount = (p.comboCount || 0) + 1;
        }
        const sacCount = (src.type==="sacrifice" ? 1 : 0) + (tgt.type==="sacrifice" ? 1 : 0);
        if (sacCount > 0) {
          const sacClv = cl["sacrifice"] || (DICE_REGISTRY["sacrifice"]?.minClass||3);
          const sacLv  = p.diceLevels["sacrifice"] || 1;
          p.sp += getStat(DICE_REGISTRY["sacrifice"].stats.spReward, sacClv, sacLv) * src.dot * sacCount;
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
          doMerge(pid, dr.key, cellKey(c, r)); return;
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

  if (phase==="deck") return <>
    <DeckBuilder p1Deck={p1Deck} p2Deck={p2Deck} setP1Deck={setP1Deck} setP2Deck={setP2Deck} p1Class={p1Class} setP1Class={setP1Class} p2Class={p2Class} setP2Class={setP2Class} p1CritMult={p1CritMult} setP1CritMult={setP1CritMult} p2CritMult={p2CritMult} setP2CritMult={setP2CritMult} onStart={startGame} setInvOpen={setInvOpen} setInvPlayer={setInvPlayer}/>
    {invOpen && (
      <InventoryScreen
        player={invPlayer}
        deck={invPlayer === 0 ? p1Deck : p2Deck}
        setDeck={invPlayer === 0 ? setP1Deck : setP2Deck}
        inventory={inventory}
        onClose={() => setInvOpen(false)}
      />
    )}
  </>;
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
