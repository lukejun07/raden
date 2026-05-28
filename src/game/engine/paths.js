import { CELL, BW, BH } from '../constants.js';

export const PATH_WP = [
  { x: CELL * 0.5,      y: BH - CELL * 0.5 }, // 하단좌 (스폰)
  { x: CELL * 0.5,      y: CELL * 0.5 },       // 상단좌
  { x: BW - CELL * 0.5, y: CELL * 0.5 },       // 상단우
  { x: BW - CELL * 0.5, y: BH - CELL * 0.5 }, // 하단우 (기지)
];
export const PATH_SEG = (() => {
  const segs = []; let cum = 0;
  for (let i = 0; i < PATH_WP.length - 1; i++) {
    const dx = PATH_WP[i+1].x - PATH_WP[i].x;
    const dy = PATH_WP[i+1].y - PATH_WP[i].y;
    const len = Math.hypot(dx, dy);
    segs.push({ sx: PATH_WP[i].x, sy: PATH_WP[i].y, dx, dy, len, cum });
    cum += len;
  }
  return { segs, total: cum };
})();
export function posOnPath(d) {
  d = Math.max(0, Math.min(d, PATH_SEG.total));
  for (const seg of PATH_SEG.segs) {
    if (d <= seg.cum + seg.len) {
      const t = (d - seg.cum) / seg.len;
      return { x: seg.sx + seg.dx * t, y: seg.sy + seg.dy * t };
    }
  }
  return { ...PATH_WP[PATH_WP.length - 1] };
}
