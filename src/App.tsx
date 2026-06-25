import { computeMetrics } from "./lib/metrics";
import { useNow } from "./hooks/useNow";
import { useDashboard } from "./hooks/useDashboard";
import { useSimulation } from "./hooks/useSimulation";
import { Header } from "./components/Header";
import { TokenForm } from "./components/TokenForm";
import { Calendar } from "./components/Calendar";
import { Summary } from "./components/Summary";
import "./App.scss";

function App() {
  const now = useNow();
  const { token, setToken, loading, error, data, search, loginWithGoogle, logout } =
    useDashboard();
  const { getSimHours, setSim, resetSim, isSimDirty } = useSimulation();

  const metrics = computeMetrics(data, now, getSimHours);

  return (
    <div className="app">
      <Header user={data?.user} onLogout={logout} />

      {!data && (
        <TokenForm
          token={token}
          loading={loading}
          onTokenChange={setToken}
          onSearch={() => search()}
          onGoogleLogin={loginWithGoogle}
        />
      )}

      {error && <div className="error-banner">{error}</div>}

      {loading && (
        <div className="loading">
          <div className="loading__spinner" />
          API 응답 대기 중...
        </div>
      )}

      {data && (
        <div className="dashboard">
          <Calendar
            yearMonth={metrics.yearMonth}
            calendarDays={data.calendarDays}
            attendances={data.attendances}
            todayStr={metrics.todayStr}
            todayWorkSec={metrics.todayNetWorkSec}
            getSimHours={getSimHours}
            onSimChange={setSim}
            onResetSim={resetSim}
            isSimDirty={isSimDirty}
          />

          <Summary metrics={metrics} />
        </div>
      )}
    </div>
  );
}

export default App;
