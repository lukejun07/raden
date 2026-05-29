import { DICE_REGISTRY } from '../dice/index.js';
import { CELL, COLS, ROWS } from '../constants.js';
import { uid, getStat, cellKey, cellXY, clamp, DOT_LAYOUTS } from './utils.js';
import { dealDmg } from './helpers.js';
import { spawnEnemy, monSPReward } from './enemy.js';
import { posOnPath, PATH_SEG } from './paths.js';
import { applyHit } from './combat.js';
import { makeDice, addDiceAnim, getSelfSpeedBuff } from './player.js';
import { rnd } from './utils.js';

export function tickPlayer(p, dt, onKill) {
  p.gameTime += dt;
  const timeInWave = Math.max(0, p.gameTime - (p.nextBossTime - 90));

  if (!p.bossRound && p.gameTime >= p.nextBossTime) {
    const bonusHp = p.enemies.reduce((s, e) => s + Math.max(0, e.hp), 0) * 0.5;
    const boss = spawnEnemy("boss", p.wave, 0);
    boss.hp += bonusHp; boss.maxHp = boss.hp;
    p.enemies = [boss];
    p.bossRound = true;
    p.spawnQueue = [];
  }

  if (!p.bossRound) {
    p.bigTimer -= dt;
    if (p.bigTimer <= 0) {
      p.enemies.push(spawnEnemy("big", p.wave, timeInWave));
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
      toRemove.add(e.id); continue;
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
      p.effects.push({id:uid(),type:"heartloss",x:476/2,y:340/2,life:1.2,maxLife:1.2});
      toRemove.add(e.id); continue;
    }
    const pos = posOnPath(e.pathD);
    e.x = pos.x; e.y = pos.y;
    e.dist = PATH_SEG.total - e.pathD;
  }
  p.enemies = p.enemies.filter(e => !toRemove.has(e.id));

  const lightBuffMap = {};
  for (const [lk, ld] of Object.entries(p.dice)) {
    if (!ld || ld.type !== "light") continue;
    const llv = p.diceLevels["light"] || 1;
    const lclv = (p.classLevels?.["light"]) || (DICE_REGISTRY["light"].minClass||3);
    const lbPct = ld.dot * (6 + (lclv-1)*0.3) + (llv-1)*1;
    const [lc, lr] = lk.split(",").map(Number);
    for (const [nc, nr] of [[lc-1,lr],[lc+1,lr],[lc,lr-1],[lc,lr+1]]) {
      if (nc<0||nc>=COLS||nr<0||nr>=ROWS) continue;
      lightBuffMap[cellKey(nc,nr)] = Math.max(lightBuffMap[cellKey(nc,nr)]||0, lbPct);
    }
  }
  const sunCount  = Object.values(p.dice).filter(d=>d?.type==="sun").length;
  const sunActivated  = sunCount  >= 3 && sunCount  % 2 === 1;
  const moonCount = Object.values(p.dice).filter(d=>d?.type==="moon").length;
  const moonActivated = moonCount >= 3 && moonCount % 2 === 1;
  const moonBuffMap = {};
  for (const [mk, md] of Object.entries(p.dice)) {
    if (!md || md.type !== "moon") continue;
    const [mc, mr] = mk.split(",").map(Number);
    for (const [nc, nr] of [[mc-1,mr],[mc+1,mr],[mc,mr-1],[mc,mr+1]]) {
      if (nc<0||nc>=COLS||nr<0||nr>=ROWS) continue;
      const ck = cellKey(nc, nr);
      const prev = moonBuffMap[ck] || { crit: 0, dmg: 0 };
      moonBuffMap[ck] = {
        crit: Math.max(prev.crit, md.dot * 5),
        dmg:  Math.max(prev.dmg,  md.dot * 10),
      };
    }
  }

  const newProjs = [];
  const dotSize = CELL - 12;
  for (const [key, d] of Object.entries(p.dice)) {
    if (!d) continue;
    d.cd -= dt; if (d.cd > 0) continue;
    const def = DICE_REGISTRY[d.type];
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
    const baseBuff  = Math.min(selfBuff + lightBuff, 0.95);
    const totalBuff = moonBuffMap[key] ? Math.min(baseBuff * 1.03, 0.99) : baseBuff;

    const dotPositions = DOT_LAYOUTS[d.dot];
    if (!dotPositions) continue;

    let dmg = getStat(def.stats.dmg, clv, lv);
    if (d.type === "combo") {
      const cpd = getStat(def.stats.comboDmg, clv, lv);
      const cc = p.comboCount || 0;
      dmg += cpd * cc * (cc + 1) / 2;
    }

    const projColor = def.border === "#RAINBOW" ? `hsl(${(Date.now()/10)%360},100%,50%)`
      : (d.type==="sun" && sunActivated) ? "#DD5500"
      : def.border;

    let interval = atkInt * (1 - totalBuff) / d.dot;
    interval = Math.max(interval, 0.001);

    let shots = 0;
    while (d.cd <= 0 && shots < 20) {
      const liveSub = p.enemies.filter(e=>e.hp>0);
      if (!liveSub.length) { d.cd = interval; break; }
      let tgt;
      if (def.target === "random") { tgt = liveSub[Math.floor(Math.random() * liveSub.length)]; }
      else if (def.target === "noPoison") { const pool = liveSub.filter(e => !e.poison); tgt = (pool.length ? pool : liveSub)[Math.floor(Math.random() * (pool.length||liveSub.length))]; }
      else if (def.target === "strongest") { tgt = liveSub.reduce((a,b) => a.hp > b.hp ? a : b); }
      else { tgt = liveSub.reduce((a,b) => a.dist < b.dist ? a : b); }

      const mb = moonBuffMap[key];
      const projBase = {diceType:d.type,dot:d.dot,classLv:clv,level:lv,color:projColor,speed:1560,tx:tgt.x,ty:tgt.y,diceKey:key,sunCount,moonActivated,moonCritBonus:mb?.crit||0,moonDmgBonus:mb?.dmg||0,critMult:p.critMult||2};

      let gunX, gunY;
      if (dotPositions === "star") {
        gunX = cx; gunY = cy;
      } else {
        const [px, py] = dotPositions[d.subIdx];
        gunX = cx + (px/100 - 0.5) * dotSize;
        gunY = cy + (py/100 - 0.5) * dotSize;
      }
      newProjs.push({...projBase, id:uid(), x:gunX, y:gunY, targetId:tgt.id, dmg, angleSpread:0});
      d.cd += interval;
      d.subIdx = (d.subIdx + 1) % d.dot;
      shots++;
    }
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
  p.projs = [...p.projs.filter(pr=>!hitIds.has(pr.id)), ...newProjs];

  const ctx = { makeDice, rnd };
  for (const [key, d] of Object.entries(p.dice)) {
    if (d) DICE_REGISTRY[d.type].onTick(d, p, dt, key, ctx);
  }

  p.effects = p.effects
    .map(ef => ({...ef, life:ef.life-dt, x:ef.x+(ef.vx||0)*dt, y:ef.y+(ef.vy||0)*dt}))
    .filter(ef => ef.life > 0);

  if (p.animations?.length) {
    p.animations = p.animations
      .map(a => ({...a, progress: a.progress + dt}))
      .filter(a => a.progress < a.duration);
  }

  if (p.summonPending?.length) {
    const stillPending = [];
    for (const ps of p.summonPending) {
      ps.delay -= dt;
      if (ps.delay <= 0) {
        if (!p.dice[ps.key]) {
          p.dice[ps.key] = makeDice(ps.type, ps.dot, ps.lv, ps.clv);
          addDiceAnim(p, ps.key, "spawn");
        }
      } else { stillPending.push(ps); }
    }
    p.summonPending = stillPending;
  }
}
