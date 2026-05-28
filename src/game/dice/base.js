export class DiceBase {
  static type     = null;
  static name     = '';
  static rarity   = 'common';   // 'common'|'rare'|'heroic'|'legendary'
  static border   = '#888888';
  static bg       = '#aaaaaa';
  static target   = 'first';    // 'first'|'strongest'|'random'|'noPoison'|'none'
  static minClass = 1;
  static description  = '';
  static ability      = { type: 'none' };
  static stats        = { atkInt: { base: 1.0, cM: 0, lM: 0 } };
  static extraStatDefs = [];     // [{ label, key? fixed? }, ...]

  static skipCrit = false;                                          // randomDmg 전용 크리티컬 스킵 플래그
  static onModifyDmg(proj, tgt, dmg, p) { return dmg; }           // 데미지 배율 조정 (deal 이전)
  static onHit(proj, tgt, enemies, p, finalDmg) {}                 // 명중 후 특수 효과
  static onTick(d, p, dt, key, ctx) {}                             // 매 프레임 (성장 타이머 등)

  // Phase 2에서 게임 루프가 호출할 훅 (현재는 no-op)
  static onKill(proj, target, player) {}
  static onMerge(dice, player) {}

  // 렌더링 (DiceSVG에서 호출)
  static render(props) { return null; }
}
