import { getGoogleLoginUrl } from "../api";

const TOKEN_KEY = "neo-flex-token";

export function loadToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export interface SsoCallback {
  token?: string;
  error?: string;
}

/**
 * 구글 SSO 로그인 후 돌아온 URL 의 ?token / ?error 를 회수하고 주소창을 정리한다.
 */
export function consumeSsoCallback(): SsoCallback {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") ?? undefined;
  const error = params.get("error") ?? undefined;
  if (token || error) {
    window.history.replaceState({}, "", window.location.pathname);
  }
  return { token, error };
}

export function redirectToGoogleLogin(): void {
  window.location.href = getGoogleLoginUrl();
}
