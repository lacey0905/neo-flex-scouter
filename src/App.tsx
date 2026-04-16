import { useState, useEffect, useCallback } from "react";
import {
  fetchUserInfo,
  fetchAttendanceMonthSummary,
  fetchDailyAttendance,
  fetchBusinessDay,
  fetchAttendanceMonth,
  fetchVacationCount,
} from "./api";
import type {
  UserInfo,
  AttendanceMonthSummary,
  DailyAttendance,
  BusinessDay,
  AttendanceMonth,
} from "./types";
import "./App.scss";

const TOKEN_KEY = "neo-flex-token";

function formatSec(s: number): string {
  if (s <= 0) return "0분";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

function formatTime(dt: string): string {
  const d = new Date(dt);
  const hh = d.getHours();
  const mm = d.getMinutes();
  const period = hh < 12 ? "오전" : "오후";
  const h12 = hh <= 12 ? hh : hh - 12;
  return `${period} ${String(h12).padStart(2, "0")}시 ${String(mm).padStart(2, "0")}분`;
}

function pct(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

interface DashboardData {
  user: UserInfo;
  daily: DailyAttendance | null;
  monthSummary: AttendanceMonthSummary;
  businessDay: BusinessDay;
  attendanceMonth: AttendanceMonth;
  vacationCount: number;
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);

  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const clearToken = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
  };

  const handleSearch = useCallback(
    async (searchToken?: string) => {
      const t = (searchToken ?? token).trim();
      if (!t) return;

      setLoading(true);
      setError(null);
      setData(null);

      try {
        const userRes = await fetchUserInfo(t);
        if (userRes.resultCode !== 0) {
          setError(userRes.error?.message ?? "인증 실패");
          clearToken();
          return;
        }

        const user = userRes.value;
        const empNo = user.employee.no;

        const [businessDayRes, attendanceMonthRes, vacationRes, dailyRes] =
          await Promise.all([
            fetchBusinessDay(t, yearMonth),
            fetchAttendanceMonth(t, empNo, yearMonth),
            fetchVacationCount(t, yearMonth),
            fetchDailyAttendance(t),
          ]);

        if (attendanceMonthRes.resultCode !== 0) {
          setError("근태 데이터 조회 실패");
          clearToken();
          return;
        }

        const ccmId = attendanceMonthRes.value.ccmId;
        const monthSummaryRes = await fetchAttendanceMonthSummary(t, ccmId);

        if (monthSummaryRes.resultCode !== 0) {
          setError("근태 데이터 조회 실패");
          clearToken();
          return;
        }

        localStorage.setItem(TOKEN_KEY, t);
        setData({
          user,
          daily: dailyRes.resultCode === 0 ? dailyRes.value : null,
          monthSummary: monthSummaryRes.value,
          businessDay: businessDayRes.value,
          attendanceMonth: attendanceMonthRes.value,
          vacationCount: vacationRes.value,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "API 요청 중 오류가 발생했습니다.");
        clearToken();
      } finally {
        setLoading(false);
      }
    },
    [token, yearMonth]
  );

  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (saved) handleSearch(saved);
  }, []);


  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const monthLabel = `${now.getMonth() + 1}월`;

  const contractHour = data?.attendanceMonth.contractWorkHour ?? 0;
  const settledWorkSec = data?.monthSummary.workTime ?? 0;
  const todayWorkSec = data?.daily?.workTime ?? 0;
  const todayBreakSec = (data?.daily?.statutoryBreakTime ?? 0) + (data?.daily?.selfBreakTime ?? 0);
  const isWorkEnded = data?.daily?.latest?.action === "WORK_END";

  // 근무중 → workTime에 휴게 미차감이므로 빼줘야 함 / 근무종료 → 이미 차감됨
  const todayNetWorkSec = isWorkEnded ? todayWorkSec : todayWorkSec - todayBreakSec;
  // 근무종료 → 월간 정산에 오늘 포함됨 / 근무중 → 미정산이라 실시간 더해야 함
  const actualWorkSec = isWorkEnded ? settledWorkSec : settledWorkSec + todayNetWorkSec;
  const vacationPaySec = data?.monthSummary.vacationPayTime ?? 0;
  const recognizedSec = actualWorkSec + vacationPaySec;
  const contractSec = contractHour * 3600;
  const remainSec = Math.max(contractSec - recognizedSec, 0);

  // 오늘 실시간 근무가 잔여시간에 이미 반영되므로, 잔여일은 내일부터 카운트
  const remainDays = data
    ? data.businessDay.month - data.businessDay.today
    : 0;
  // 네오닷 계산: 오늘 실시간 + 내일부터 네오닷 전까지 8시간 고정
  const NEODOT_DAY_SEC = 8 * 3600;
  // 오늘과 네오닷을 제외한 미래 영업일
  const futureDaysBeforeNeoDot = data
    ? Math.max(data.businessDay.month - data.businessDay.today - 1, 0)
    : 0;
  // 네오닷 전날까지 예상 = 확정분(오늘 포함) + 미래일 * 8시간
  const projectedWithoutNeoDot = actualWorkSec + futureDaysBeforeNeoDot * NEODOT_DAY_SEC;
  const projectedRecognizedWithoutNeoDot = projectedWithoutNeoDot + vacationPaySec;
  const canRestNeoDot = projectedRecognizedWithoutNeoDot >= contractSec;
  // 네오닷 쉴 경우 Flex 수당 시간 (의무 초과분)
  const flexIfRest = Math.max(projectedRecognizedWithoutNeoDot - contractSec, 0);
  // 네오닷 안쉴 경우 Flex 수당 시간
  const projectedWithNeoDot = projectedWithoutNeoDot + NEODOT_DAY_SEC;
  const projectedRecognizedWithNeoDot = projectedWithNeoDot + vacationPaySec;
  const flexIfWork = Math.max(projectedRecognizedWithNeoDot - contractSec, 0);

  return (
    <div className="app">
      <header className="header">
        <div className="header__left">
          <h1 className="header__title">
            Neo <span>Flex</span> Scouter
          </h1>
          {!data && <p className="header__subtitle">토큰을 입력하고 조회 버튼을 눌러주세요</p>}
        </div>
        {data && (
          <div className="header__user">
            <div className="header__user-info">
              <span className="header__user-name">{data.user.employee.name}</span>
              <span className="header__user-duty">{data.user.employee.dutyNm}</span>
            </div>
            <img
              className="header__user-photo"
              src={data.user.googleUser.photo}
              alt={data.user.employee.name}
            />
          </div>
        )}
      </header>

      {!data && (
        <div className="token-form">
          <input
            className="token-form__input"
            type="text"
            placeholder="Bearer Token을 입력하세요..."
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            className="token-form__button"
            onClick={() => handleSearch()}
            disabled={loading || !token.trim()}
          >
            {loading ? "조회 중..." : "조회"}
          </button>
        </div>
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
          {/* 근무 현황 */}
          <section className="work-section">
            <h3 className="section-title">근무 현황</h3>
            <div className="work-stats">
              {data.daily && (
                <div className="stat-card stat-card--accent">
                  <span className="stat-card__label">오늘 시작</span>
                  <span className="stat-card__value">{formatTime(data.daily.workStartDt)}</span>
                </div>
              )}
              {data.daily && (
                <div className="stat-card stat-card--accent">
                  <span className="stat-card__label">오늘 근무</span>
                  <span className="stat-card__value">{formatSec(todayNetWorkSec)}</span>
                </div>
              )}
              <div className="stat-card stat-card--warning">
                <span className="stat-card__label">잔여 시간</span>
                <span className="stat-card__value">{formatSec(remainSec)}</span>
              </div>
              <div className="stat-card">
                <span className="stat-card__label">잔여일</span>
                <span className="stat-card__value">{remainDays}일</span>
              </div>
            </div>

            <div className="progress-section">
              <div className="progress-header">
                <span className="progress-header__label">{monthLabel} 근로</span>
                <span className="progress-header__value">
                  {formatSec(actualWorkSec)} / {contractHour}시간
                  <span className="progress-header__pct">
                    {pct(actualWorkSec, contractSec)}%
                  </span>
                </span>
              </div>
              <div className="progress-bar">
                <div className="progress-bar__track">
                  <div
                    className="progress-bar__fill progress-bar__fill--work"
                    style={{ width: `${Math.min(pct(actualWorkSec, contractSec), 100)}%` }}
                  />
                  {vacationPaySec > 0 && (
                    <div
                      className="progress-bar__fill progress-bar__fill--vacation"
                      style={{
                        width: `${Math.min(pct(vacationPaySec, contractSec), 100)}%`,
                        left: `${Math.min(pct(actualWorkSec, contractSec), 100)}%`,
                      }}
                    />
                  )}
                </div>
              </div>
              <div className="progress-legend">
                <span className="legend-item">
                  <span className="legend-dot legend-dot--work" />
                  근무 {formatSec(actualWorkSec)}
                </span>
                {vacationPaySec > 0 && (
                  <span className="legend-item">
                    <span className="legend-dot legend-dot--vacation" />
                    휴가 {formatSec(vacationPaySec)}
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* 네오닷 분석 */}
          <section className="neodot-section">
            <h3 className="section-title">네오닷 분석</h3>
            <div className={`neodot-verdict ${canRestNeoDot ? "neodot-verdict--yes" : "neodot-verdict--no"}`}>
              <span className="neodot-verdict__icon">{canRestNeoDot ? "O" : "X"}</span>
              <div className="neodot-verdict__text">
                {canRestNeoDot ? (
                  <>
                    <strong>네오닷에 쉴 수 있어요!</strong>
                    <p>의무 시간을 초과 달성할 수 있습니다.</p>
                  </>
                ) : (
                  <>
                    <strong>
                      <span className="neodot-verdict__highlight">{formatSec(contractSec - projectedRecognizedWithoutNeoDot)}</span>
                      만 더 일하면 네오닷에 쉴 수 있어요
                    </strong>
                    <p>네오닷 전날까지 의무 시간 충족이 필요합니다.</p>
                  </>
                )}
              </div>
            </div>

            <div className="neodot-grid">
              <div className="neodot-card neodot-card--rest">
                <div className="neodot-card__header">네오닷 쉴 경우</div>
                <div className="neodot-card__body">
                  <div className="neodot-card__row">
                    <span className="neodot-card__label">예상 총 근무</span>
                    <span className="neodot-card__value">{formatSec(projectedWithoutNeoDot)}</span>
                  </div>
                  <div className="neodot-card__row">
                    <span className="neodot-card__label">인정 근로 (휴가 포함)</span>
                    <span className="neodot-card__value">{formatSec(projectedRecognizedWithoutNeoDot)}</span>
                  </div>
                  <div className="neodot-card__divider" />
                  <div className="neodot-card__row neodot-card__row--highlight">
                    <span className="neodot-card__label">Flex 수당</span>
                    <span className={`neodot-card__value ${flexIfRest > 0 ? "neodot-card__value--rest" : "neodot-card__value--zero"}`}>
                      {flexIfRest > 0 ? formatSec(flexIfRest) : "없음"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="neodot-card neodot-card--work">
                <div className="neodot-card__header">네오닷 출근할 경우</div>
                <div className="neodot-card__body">
                  <div className="neodot-card__row">
                    <span className="neodot-card__label">예상 총 근무</span>
                    <span className="neodot-card__value">{formatSec(projectedWithNeoDot)}</span>
                  </div>
                  <div className="neodot-card__row">
                    <span className="neodot-card__label">인정 근로 (휴가 포함)</span>
                    <span className="neodot-card__value">{formatSec(projectedRecognizedWithNeoDot)}</span>
                  </div>
                  <div className="neodot-card__divider" />
                  <div className="neodot-card__row neodot-card__row--highlight">
                    <span className="neodot-card__label">Flex 수당</span>
                    <span className="neodot-card__value neodot-card__value--work">
                      {formatSec(flexIfWork)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="neodot-note">
              오늘 실시간 기준 · 내일부터 1일 = 8시간 고정 추정
            </div>
          </section>

        </div>
      )}
    </div>
  );
}

export default App;
