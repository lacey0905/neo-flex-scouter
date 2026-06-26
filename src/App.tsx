import { computeMetrics } from "./lib/metrics";
import { useNow } from "./hooks/useNow";
import { useDashboard } from "./hooks/useDashboard";
import { useSimulation } from "./hooks/useSimulation";
import { Header } from "./components/Header";
import { Login } from "./components/Login";
import { Calendar } from "./components/Calendar";
import { Summary } from "./components/Summary";
import { OvertimeCalc } from "./components/OvertimeCalc";
import "./App.scss";

function App() {
  const now = useNow();
  const { loading, error, data, loginWithGoogle, logout } = useDashboard();
  const { getSimHours, setSim, clearSim, resetSim, isSimDirty, hasSim } =
    useSimulation();

  const metrics = computeMetrics(data, now, getSimHours, hasSim);

  const showLogin = !data && !loading;

  return (
    <div className={`app ${showLogin ? "app--login" : ""}`}>
      {data && <Header user={data.user} onLogout={logout} />}

      {showLogin && <Login loading={loading} onGoogleLogin={loginWithGoogle} />}

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
            todayWorkStartDt={data.daily?.workStartDt ?? null}
            todaySelfBreakSec={data.daily?.selfBreakTime ?? 0}
            getSimHours={getSimHours}
            hasSim={hasSim}
            onSimChange={setSim}
            onClearSim={clearSim}
            onResetSim={resetSim}
            isSimDirty={isSimDirty}
          />

          <Summary metrics={metrics} />
        </div>
      )}

      {data && <OvertimeCalc metrics={metrics} />}
    </div>
  );
}

export default App;
