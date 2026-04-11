import useSWR from "swr";

export interface Signal {
  fixture_id: number | string;
  home: string;
  away: string;
  market: string;
  odds: number;
  model_odds: number;
  edge: number;
  urgency: "HIGH" | "MEDIUM" | "LOW";
  decision: {
    action: "BET" | "SKIP" | "HOLD";
    stake: number;
  };
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useSignals() {
  const { data, error, isLoading, mutate } = useSWR<Signal[]>(
    "/api/live/signals",
    fetcher,
    {
      refreshInterval: 5000,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    signals: data || [],
    isLoading,
    error,
    mutate,
  };
}
