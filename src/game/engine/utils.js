import { CELL, COLS, ROWS } from '../constants.js';

export const G = [null,[27.5,27.5],[50,27.5],[72.5,27.5],[27.5,50],[50,50],[72.5,50],[27.5,72.5],[50,72.5],[72.5,72.5]];
export const DOT_LAYOUTS = {
  1:[G[5]],
  2:[G[3],G[7]],
  3:[G[3],G[5],G[7]],
  4:[G[1],G[3],G[7],G[9]],
  5:[G[1],G[3],G[5],G[7],G[9]],
  6:[G[1],G[3],G[4],G[6],G[7],G[9]],
  7:"star",
};

let _uid = 1;
export const uid = () => _uid++;
export const rnd = arr => arr[Math.floor(Math.random() * arr.length)];
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const cellKey = (c, r) => `${c},${r}`;
export const cellXY = (c, r) => ({ x: (c+1)*CELL + CELL/2, y: (r+1)*CELL + CELL/2 });

// stat = { base, cP?, cM?, lP?, lM? }
export function getStat(s, classLv, ingameLv) {
  return s.base + (classLv-1)*(s.cP||0) - (classLv-1)*(s.cM||0)
               + (ingameLv-1)*(s.lP||0) - (ingameLv-1)*(s.lM||0);
}
