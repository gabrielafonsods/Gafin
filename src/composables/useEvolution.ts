import { monthRange } from "@/utils/date";
import {
  getBalanceHistory,
  getInvestedHistory,
  getMonthlyFlow,
  getWealthHistory,
} from "@/services/evolution";
import { useBalance } from "./useBalance";
import { useInvestments } from "./useInvestments";

/**
 * Séries para os gráficos de evolução. Cada função recebe o mês final e a
 * quantidade de meses e devolve os dados já na ordem (antigo -> novo).
 */
export function useEvolution() {
  const { snapshot } = useBalance();
  const { assets, operations } = useInvestments();

  return {
    flow: (endMonth: string, count = 6) => getMonthlyFlow(snapshot.value, monthRange(endMonth, count)),
    balance: (endMonth: string, count = 12) =>
      getBalanceHistory(snapshot.value, monthRange(endMonth, count)),
    invested: (endMonth: string, count = 12) =>
      getInvestedHistory(assets.value, operations.value, monthRange(endMonth, count)),
    wealth: (endMonth: string, count = 12) =>
      getWealthHistory(snapshot.value, assets.value, operations.value, monthRange(endMonth, count)),
  };
}
