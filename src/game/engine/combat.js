import { DICE_REGISTRY } from '../dice/index.js';
import { dealDmg, spawnFx, spawnTxt } from './helpers.js';

export function applyHit(p, proj, tgt) {
  const DC = DICE_REGISTRY[proj.diceType];
  let dmg = proj.dmg;

  proj.critApplied = 1;
  if (!DC.skipCrit) {
    const critChance = 0.05 + Math.max(proj.moonCritBonus||0, proj.critBonus||0) / 100;
    if (Math.random() < critChance) {
      proj.critApplied = proj.critMult || 2;
      dmg *= proj.critApplied;
      spawnFx(p, "burst", tgt.x, tgt.y, "#FFD700");
    }
  }
  if (proj.moonDmgBonus) dmg *= 1 + proj.moonDmgBonus / 100;

  dmg = DC.onModifyDmg(proj, tgt, dmg, p);
  dealDmg(p, tgt, dmg);
  DC.onHit(proj, tgt, p.enemies, p, dmg);

  const hitColor = DC.border === "#RAINBOW" ? "#FF88DD"
    : (proj.diceType === "sun" && (proj.sunCount||0) >= 3 && (proj.sunCount%2) === 1) ? "#DD5500"
    : DC.border;
  spawnFx(p, "hit", tgt.x, tgt.y, hitColor);
  spawnTxt(p, tgt.x, tgt.y, Math.round(dmg));
}
