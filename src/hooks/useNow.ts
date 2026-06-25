import { useState, useEffect } from "react";

/** 현재 시각을 일정 주기로 갱신해 반환한다 (기본 1초). */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
