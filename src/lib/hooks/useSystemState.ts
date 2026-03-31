import useSWR from "swr";

export interface SystemState {
  status: "🟢" | "🟡" | "🔴" | "⚫";
  state: string;
  bankroll: number;
  roi: number;
  roi7d: number;
  avgEdge: number;
  drawdown: number;
  recentWinRate: number;
  calibrationError: number;
  totalBetsPlaced: number;
  timestamp: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useSystemState() {
  const { data, error, isLoading, mutate } = useSWR<SystemState>(
    "/api/analytics/report",
    fetcher,
    {
      refreshInterval: 5000,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    state: data || {
      status: "⚫",
      state: "UNKNOWN",
      bankroll: 0,
      roi: 0,
      roi7d: 0,
      avgEdge: 0,
      drawdown: 0,
      recentWinRate: 0,
      calibrationError: 0,
      totalBetsPlaced: 0,
      timestamp: 0,
    },
    isLoading,
    error,
    mutate,
  };
}
