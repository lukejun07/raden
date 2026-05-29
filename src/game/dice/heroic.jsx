import React from 'react';
import { DiceBase } from './base.js';
import { DiceImgBase } from '../../components/dice/Primitives.jsx';
import adaptImg from '../../assets/dice/adapt.webp';

export class AdaptDice extends DiceBase {
  static type     = 'adapt';
  static name     = '적응';
  static rarity   = 'heroic';
  static border   = '#RAINBOW';
  static bg       = '#FFFFFF';
  static target   = 'first';
  static minClass = 5;
  static description = '같은 눈금이라면 종류에 상관없이 아무 주사위와도 합성할 수 있습니다.';
  static ability = { type: 'adapt' };
  static stats   = { dmg: { base: 20, cP: 5, lP: 10 }, atkInt: { base: 1.0, cM: 0, lM: 0 } };
  static extraStatDefs = [{ label: '효과', fixed: '주변 타입 복사' }];
  static render(p) { return <DiceImgBase {...p} img={adaptImg} dotColor="#FF8800"/>; }
}
