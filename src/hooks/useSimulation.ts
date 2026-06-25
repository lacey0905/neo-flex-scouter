import { useState } from "react";

export interface Simulation {
  getSimHours: (dateStr: string) => number;
  setSim: (dateStr: string, hours: number) => void;
  resetSim: () => void;
  isSimDirty: boolean;
}

/** 미래 일자별 근무시간 시뮬레이션 상태 (단위: 시간, 미설정 시 기본값). */
export function useSimulation(defaultHours = 8): Simulation {
  const [simHours, setSimHours] = useState<Record<string, number>>({});

  const getSimHours = (dateStr: string) => simHours[dateStr] ?? defaultHours;
  const setSim = (dateStr: string, hours: number) =>
    setSimHours((prev) => ({ ...prev, [dateStr]: hours }));
  const resetSim = () => setSimHours({});
  const isSimDirty = Object.keys(simHours).length > 0;

  return { getSimHours, setSim, resetSim, isSimDirty };
}
