import { runBreakout } from "./strategies/Breakout";
import { runMeanReversion } from "./strategies/MeanReversion";
import { runMomentum } from "./strategies/Momentum";


export const StrategyRegistry: Record<string, (context: any) => Promise<any>> = {
  meanReversion: runMeanReversion,
  momentum: runMomentum,
  breakout: runBreakout
}