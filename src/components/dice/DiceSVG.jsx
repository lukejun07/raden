import React from 'react';
import { DICE_REGISTRY } from '../../game/dice/index.js';

export default function DiceSVG({ type, dot=1, size=56, active=false, comboCount=0, moonCount=0 }) {
  const DC = DICE_REGISTRY[type];
  return DC ? DC.render({ size, dot, active, comboCount, moonCount }) : null;
}
