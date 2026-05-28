import React, { useState } from 'react';
import { DICE_REGISTRY, DICE_KEYS } from '../../game/dice/index.js';
import { getStat } from '../../game/engine/utils.js';
import { RARITY_LABEL, RARITY_COLOR, RARITY_ORDER, TARGET_LABEL } from '../../game/constants.js';
import DiceSVG from '../dice/DiceSVG.jsx';

export default function InventoryScreen({ player, deck, setDeck, inventory, onClose }) {
  const [selected, setSelected] = useState(null);
  const [statClass, setStatClass] = useState(1);
  const [statPower, setStatPower] = useState(1);

  const accent = player === 0 ? "#3355EE" : "#EE3355";
  const pLabel = player === 0 ? "P1" : "P2";

  const sortedKeys = [...DICE_KEYS].sort((a, b) =>
    RARITY_ORDER[DICE_REGISTRY[a]?.rarity] - RARITY_ORDER[DICE_REGISTRY[b]?.rarity]);

  const toggleDeck = type => {
    if (deck.includes(type)) setDeck(deck.filter(x => x !== type));
    else if (deck.length < 5) setDeck([...deck, type]);
  };

  const statVal = (statKey, clv, plv) => {
    const def = DICE_REGISTRY[selected];
    if (!def?.stats[statKey]) return '-';
    const v = getStat(def.stats[statKey], clv, plv);
    return Number.isInteger(v) ? String(v) : v.toFixed(1);
  };

  const buildRows = () => {
    if (!selected) return [];
    const def = DICE_REGISTRY[selected];
    const clv = statClass, plv = statPower;
    const atkInt = getStat(def.stats.atkInt, clv, plv);
    const atkSpd = atkInt >= 9999 ? '오라' : (1 / Math.max(atkInt, 0.05)).toFixed(2) + '/s';
    const dmg = def.stats.dmg ? statVal('dmg', clv, plv) : '-';
    const target = TARGET_LABEL[def.target] || def.target;
    const extras = [...(DICE_REGISTRY[selected]?.extraStatDefs || []), null, null, null].slice(0, 3).map(e => {
      if (!e) return { label: '-', value: '-' };
      if (e.fixed) return { label: e.label, value: e.fixed };
      return { label: e.label, value: statVal(e.key, clv, plv) };
    });
    return [
      [{ label: '기본 공격력', value: dmg }, { label: '공격속도', value: atkSpd }],
      [{ label: '타겟', value: target }, extras[0]],
      [extras[1], extras[2]],
    ];
  };

  const def = selected ? DICE_REGISTRY[selected] : null;
  const b = def ? (def.border === '#RAINBOW' ? '#AA00AA' : def.border) : '#888';
  const inDeck = selected ? deck.includes(selected) : false;
  const rows = buildRows();

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#000A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#F5F0FF', width: '94vw', maxWidth: 940, maxHeight: '96vh', borderRadius: 20, boxShadow: '0 8px 48px #0006', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'Segoe UI',system-ui,sans-serif" }}>

        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', background: accent, color: '#fff', gap: 12, flexShrink: 0 }}>
          <span style={{ fontSize: 17, fontWeight: 900 }}>🎲 {pLabel} 인벤토리</span>
          <span style={{ flex: 1 }} />
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>← 닫기</button>
        </div>

        <div style={{ padding: '10px 20px', background: '#fff', borderBottom: '1px solid #E8E0F8', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#667', marginRight: 4 }}>덱 ({deck.length}/5)</span>
          {Array.from({ length: 5 }, (_, i) => {
            const t = deck[i];
            const dd = t ? DICE_REGISTRY[t] : null;
            return (
              <div key={i} onClick={() => t && setSelected(t)}
                style={{ width: 54, height: 54, borderRadius: 10, border: t ? `2px solid ${dd?.border === '#RAINBOW' ? '#AA00AA' : dd?.border || '#ccc'}` : '2px dashed #ccc', background: t ? '#fff' : '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: t ? 'pointer' : 'default', position: 'relative', flexShrink: 0 }}>
                {t ? <>
                  <DiceSVG type={t} dot={3} size={44} />
                  <div style={{ position: 'absolute', top: -8, left: -5, background: accent, color: '#fff', fontSize: 9, fontWeight: 900, borderRadius: 4, padding: '1px 4px' }}>{i + 1}</div>
                  <div onClick={e => { e.stopPropagation(); setDeck(deck.filter(x => x !== t)); }}
                    style={{ position: 'absolute', top: -7, right: -6, background: '#E00', color: '#fff', fontSize: 10, fontWeight: 900, borderRadius: 10, width: 15, height: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', lineHeight: 1 }}>×</div>
                </> : <span style={{ fontSize: 13, color: '#ccc', fontWeight: 700 }}>{i + 1}</span>}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
            {['legendary', 'heroic', 'rare', 'common'].map(rarity => {
              const group = sortedKeys.filter(k => DICE_REGISTRY[k]?.rarity === rarity);
              if (!group.length) return null;
              return (
                <div key={rarity} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: RARITY_COLOR[rarity], marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>
                    {RARITY_LABEL[rarity]}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 7 }}>
                    {group.map(k => {
                      const d = DICE_REGISTRY[k];
                      const isSel = selected === k;
                      const isIn = deck.includes(k);
                      const bc = d.border === '#RAINBOW' ? '#AA00AA' : d.border;
                      return (
                        <div key={k} onClick={() => { setSelected(k === selected ? null : k); setStatClass(d.minClass || 1); setStatPower(1); }}
                          style={{ background: isSel ? bc + '22' : isIn ? bc + '11' : '#fff', border: `2px solid ${isSel ? bc : isIn ? bc + '88' : '#E8E0F8'}`, borderRadius: 10, padding: '8px 6px', textAlign: 'center', cursor: 'pointer', transition: 'all .12s', position: 'relative' }}>
                          <DiceSVG type={k} dot={3} size={48} />
                          <div style={{ fontSize: 10, fontWeight: 700, color: bc, marginTop: 3 }}>{d.name}</div>
                          <div style={{ fontSize: 9, color: '#999' }}>보유 {inventory[k] || 0}개</div>
                          {isIn && <div style={{ position: 'absolute', top: 3, right: 5, fontSize: 9, fontWeight: 900, color: accent }}>덱</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {selected && def && (
            <div style={{ width: 272, borderLeft: '1px solid #E8E0F8', background: '#fff', overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                  <DiceSVG type={selected} dot={4} size={72} />
                  <div style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 5, background: RARITY_COLOR[DICE_REGISTRY[selected]?.rarity] + '22', color: RARITY_COLOR[DICE_REGISTRY[selected]?.rarity] }}>
                    {RARITY_LABEL[DICE_REGISTRY[selected]?.rarity]}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: b }}>{def.name}</div>
                  <div style={{ fontSize: 10, color: '#888' }}>보유 {inventory[selected] || 0}개</div>
                </div>
                <div style={{ flex: 1, fontSize: 11, color: '#445', lineHeight: 1.75, paddingTop: 2 }}>
                  {DICE_REGISTRY[selected]?.description || '-'}
                </div>
              </div>

              <button onClick={() => toggleDeck(selected)}
                style={{ background: inDeck ? '#CC2200' : deck.length < 5 ? b : '#999', border: 'none', color: '#fff', borderRadius: 8, padding: '7px', fontWeight: 800, cursor: inDeck || deck.length < 5 ? 'pointer' : 'default', fontSize: 12 }}>
                {inDeck ? '덱에서 제거' : deck.length < 5 ? '덱에 추가' : '덱이 가득참 (5/5)'}
              </button>

              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#667', marginBottom: 4 }}>클래스 레벨</div>
                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  {[1, 2, 3, 4, 5, 6, 7].map(c => {
                    const minC = def.minClass || 1;
                    const disabled = c < minC;
                    return (
                      <button key={c} onClick={() => !disabled && setStatClass(c)}
                        style={{ padding: '3px 6px', borderRadius: 5, border: `1.5px solid ${statClass === c ? b : '#ddd'}`, background: statClass === c ? b : disabled ? '#f0f0f0' : '#fafafa', color: statClass === c ? '#fff' : disabled ? '#ccc' : '#445', fontSize: 11, fontWeight: 700, cursor: disabled ? 'default' : 'pointer' }}>
                        C{c}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#667', marginBottom: 4 }}>파워업 레벨</div>
                <div style={{ display: 'flex', gap: 3 }}>
                  {[1, 2, 3, 4, 5].map(pv => (
                    <button key={pv} onClick={() => setStatPower(pv)}
                      style={{ padding: '3px 7px', borderRadius: 5, border: `1.5px solid ${statPower === pv ? b : '#ddd'}`, background: statPower === pv ? b : '#fafafa', color: statPower === pv ? '#fff' : '#445', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                      P{pv}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ border: '1px solid #E8E0F8', borderRadius: 8, overflow: 'hidden', fontSize: 11 }}>
                {rows.map((row, ri) => (
                  <div key={ri} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: ri < rows.length - 1 ? '1px solid #E8E0F8' : 'none' }}>
                    {row.map((cell, ci) => (
                      <div key={ci} style={{ padding: '7px 9px', borderRight: ci === 0 ? '1px solid #E8E0F8' : 'none', background: ri % 2 === 0 ? '#F8F4FF' : '#fff' }}>
                        <div style={{ fontSize: 9, color: '#999', fontWeight: 600, marginBottom: 1 }}>{cell.label}</div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: cell.value === '-' ? '#ccc' : b }}>{cell.value}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
