import { useState, useEffect, useCallback } from "react";
import type { DashboardData } from "../types";
import { loadDashboardData, refreshDaily } from "../lib/dashboardApi";
import {
  loadToken,
  saveToken,
  clearToken,
  consumeSsoCallback,
  redirectToGoogleLogin,
} from "../lib/auth";
import { toYearMonth } from "../utils/format";

const POLL_INTERVAL_MS = 10000;

export interface UseDashboard {
  token: string;
  setToken: (token: string) => void;
  loading: boolean;
  error: string | null;
  data: DashboardData | null;
  search: (overrideToken?: string) => Promise<void>;
  loginWithGoogle: () => void;
  logout: () => void;
}

/**
 * 인증(토큰·SSO), 대시보드 데이터 조회, 정밀 추적 폴링을 한곳에서 관리한다.
 */
export function useDashboard(): UseDashboard {
  const [token, setToken] = useState(() => loadToken() ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);

  const search = useCallback(
    async (overrideToken?: string) => {
      const t = (overrideToken ?? token).trim();
      if (!t) return;

      setLoading(true);
      setError(null);
      setData(null);

      const result = await loadDashboardData(t, toYearMonth(new Date()));
      if ("error" in result) {
        setError(result.error);
        clearToken();
        setToken("");
      } else {
        saveToken(t);
        setData(result.data);
      }
      setLoading(false);
    },
    [token]
  );

  const logout = useCallback(() => {
    clearToken();
    setToken("");
    setData(null);
    setError(null);
  }, []);

  // 최초 진입: SSO 콜백 토큰 회수 또는 저장된 토큰으로 자동 조회
  useEffect(() => {
    const { token: ssoToken, error: ssoError } = consumeSsoCallback();
    if (ssoToken) {
      setToken(ssoToken);
      search(ssoToken);
      return;
    }
    if (ssoError) {
      setError(`로그인 실패: ${ssoError}`);
      return;
    }
    const saved = loadToken();
    if (saved) search(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 정밀 추적: 로그인 후 서버 권위값(근무·휴게)을 주기적으로 폴링
  const isLoaded = data !== null;
  useEffect(() => {
    if (!isLoaded) return;
    const id = setInterval(async () => {
      const tk = loadToken();
      if (!tk) return;
      const daily = await refreshDaily(tk);
      if (daily) setData((prev) => (prev ? { ...prev, daily } : prev));
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isLoaded]);

  return {
    token,
    setToken,
    loading,
    error,
    data,
    search,
    loginWithGoogle: redirectToGoogleLogin,
    logout,
  };
}
