import "./TokenForm.scss";

interface TokenFormProps {
  token: string;
  loading: boolean;
  onTokenChange: (value: string) => void;
  onSearch: () => void;
  onGoogleLogin: () => void;
}

export function TokenForm({
  token,
  loading,
  onTokenChange,
  onSearch,
  onGoogleLogin,
}: TokenFormProps) {
  return (
    <div className="token-form">
      <input
        className="token-form__input"
        type="password"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        placeholder="Bearer Token을 입력하세요..."
        value={token}
        onChange={(e) => onTokenChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSearch();
        }}
      />
      <button
        className="token-form__button"
        onClick={onSearch}
        disabled={loading || !token.trim()}
      >
        {loading ? "조회 중..." : "조회"}
      </button>
      <div className="token-form__divider">또는</div>
      <button
        className="token-form__google"
        onClick={onGoogleLogin}
        disabled={loading}
      >
        <span className="token-form__google-icon">G</span>
        구글로 로그인
      </button>
    </div>
  );
}
