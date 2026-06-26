import { useState } from "react";

export interface Simulation {
  getSimHours: (dateStr: string) => number;
  /** 해당 일자에 사용자가 직접 시뮬레이션 값을 지정했는지 여부 */
  hasSim: (dateStr: string) => boolean;
  setSim: (dateStr: string, hours: number) => void;
  /** 특정 일자만 시뮬레이션 해제 (오늘이면 실시간으로 복귀) */
  clearSim: (dateStr: string) => void;
  resetSim: () => void;
  isSimDirty: boolean;
}

/** 일자별 근무시간 시뮬레이션 상태 (단위: 시간, 미설정 시 기본값). */
export function useSimulation(defaultHours = 8): Simulation {
  const [simHours, setSimHours] = useState<Record<string, number>>({});

  const getSimHours = (dateStr: string) => simHours[dateStr] ?? defaultHours;
  const hasSim = (dateStr: string) => dateStr in simHours;
  const setSim = (dateStr: string, hours: number) =>
    setSimHours((prev) => ({ ...prev, [dateStr]: hours }));
  const clearSim = (dateStr: string) =>
    setSimHours((prev) => {
      if (!(dateStr in prev)) return prev;
      const next = { ...prev };
      delete next[dateStr];
      return next;
    });
  const resetSim = () => setSimHours({});
  const isSimDirty = Object.keys(simHours).length > 0;

  return { getSimHours, hasSim, setSim, clearSim, resetSim, isSimDirty };
}
