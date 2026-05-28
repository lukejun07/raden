import { FireDice, ElectricDice, PoisonDice, IceDice, SteelDice, BrokenDice, GambleDice, LockDice, WindDice } from './common.jsx';
import { GambleGrowthDice, LightDice } from './rare.jsx';
import { AdaptDice } from './heroic.jsx';
import { JokerDice, GrowthDice, SunDice, ComboDice, MoonDice, SummonDice } from './legendary.jsx';

export const DICE_CLASSES = [
  FireDice, ElectricDice, PoisonDice, IceDice, SteelDice, BrokenDice,
  GambleDice, LockDice, WindDice,
  GambleGrowthDice, LightDice,
  AdaptDice,
  JokerDice, GrowthDice, SunDice, ComboDice, MoonDice, SummonDice,
];
export const DICE_REGISTRY = Object.fromEntries(DICE_CLASSES.map(C => [C.type, C]));
export const DICE_KEYS = Object.keys(DICE_REGISTRY);
