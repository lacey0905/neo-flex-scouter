import { useState, useEffect } from "react";

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

const STORAGE_KEY = "nfs.simHours";

/** localStorage 에서 시뮬레이션 값을 읽어온다. 실패 시 빈 객체. */
function loadSimHours(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      // 숫자 값만 통과시켜 오염된 데이터를 방어
      const clean: Record<string, number> = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === "number" && Number.isFinite(v)) clean[k] = v;
      }
      return clean;
    }
  } catch {
    // 파싱 실패는 무시
  }
  return {};
}

/** 일자별 근무시간 시뮬레이션 상태 (단위: 시간, 미설정 시 기본값). localStorage 영속. */
export function useSimulation(defaultHours = 8): Simulation {
  const [simHours, setSimHours] = useState<Record<string, number>>(loadSimHours);

  // 변경 시 localStorage 동기화
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (Object.keys(simHours).length === 0) {
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(simHours));
      }
    } catch {
      // 저장 실패는 무시
    }
  }, [simHours]);

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
