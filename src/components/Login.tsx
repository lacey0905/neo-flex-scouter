import "./Login.scss";

interface LoginProps {
  loading: boolean;
  onGoogleLogin: () => void;
}

export function Login({ loading, onGoogleLogin }: LoginProps) {
  return (
    <div className="login">
      <div className="login__card">
        <div className="login__brand">
          <span className="login__logo">NF</span>
          <div className="login__brandtext">
            <strong className="login__title">Neo Flex Scouter</strong>
            <span className="login__subtitle">네오위즈 Flex 근태 분석</span>
          </div>
        </div>

        <p className="login__desc">
          네오위즈 구글 계정으로 로그인하면
          <br />
          이번 달 근로 현황과 네오닷 분석을 볼 수 있어요.
        </p>

        <button
          className="login__google"
          onClick={onGoogleLogin}
          disabled={loading}
        >
          <span className="login__google-icon">G</span>
          {loading ? "로그인 중..." : "구글로 로그인"}
        </button>

        <p className="login__hint">사내 SSO(Keycloak)로 안전하게 인증됩니다.</p>
      </div>
    </div>
  );
}
