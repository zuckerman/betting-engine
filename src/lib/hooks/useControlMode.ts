import useSWR from "swr";

export type ControlMode = "MANUAL" | "SEMI_AUTO" | "FULL_AUTO";

export interface ControlState {
  mode: ControlMode;
  killSwitch: boolean;
  timestamp: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useControlMode() {
  const { data: modeData, mutate: mutateMode } = useSWR<{ mode: ControlMode }>(
    "/api/control/mode",
    fetcher,
    {
      refreshInterval: 5000,
      revalidateOnFocus: false,
    }
  );

  const { data: killData, mutate: mutateKill } = useSWR<{
    killSwitch: boolean;
  }>("/api/control/kill", fetcher, {
    refreshInterval: 5000,
    revalidateOnFocus: false,
  });

  return {
    mode: modeData?.mode || "MANUAL",
    killSwitch: killData?.killSwitch || false,
    setMode: async (newMode: ControlMode) => {
      const res = await fetch("/api/control/mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: newMode }),
      });
      const updated = await res.json();
      mutateMode({ mode: updated.mode });
      return updated;
    },
    setKillSwitch: async (active: boolean) => {
      const res = await fetch("/api/control/kill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      const updated = await res.json();
      mutateKill({ killSwitch: updated.killSwitch });
      return updated;
    },
  };
}
