import type { DashboardData } from "../types";
import { pad } from "../utils/format";

const NEODOT_DAY_SEC = 8 * 3600;
// 하루 기준 근로시간 (8시간)
const DAILY_TARGET_SEC = 8 * 3600;

export interface Metrics {
  yearMonth: string;
  monthLabel: string;
  todayStr: string;

  contractHour: number;
  contractSec: number;
  settledWorkSec: number;
  todayBreakSec: number;
  isWorkEnded: boolean;
  isActivelyWorking: boolean;
  todayNetWorkSec: number;
  actualWorkSec: number;
  vacationPaySec: number;
  recognizedSec: number;
  remainSec: number;
  remainDays: number;

  // 하루 8시간 기준 페이스
  elapsedWorkdays: number;
  expectedToTodaySec: number;
  savedSec: number; // +: 앞서 있음(세이브), -: 뒤처짐

  hasCalendar: boolean;
  futureDaysBeforeNeoDot: number;
  neoDotDaysAhead: number;
  neoDotDate: string | null;

  projectedWithoutNeoDot: number;
  projectedRecognizedWithoutNeoDot: number;
  canRestNeoDot: boolean;
  flexIfRest: number;
  projectedWithNeoDot: number;
  projectedRecognizedWithNeoDot: number;
  flexIfWork: number;
}

/**
 * 대시보드 파생 지표 계산 (순수 함수).
 * - now: 현재 시각(실시간 동기화)
 * - getSimHours: 일자별 시뮬레이션 근무시간(시간 단위, 기본 8)
 * - hasSimHours: 해당 일자에 시뮬레이션 값이 직접 지정됐는지 (오늘 포함)
 */
export function computeMetrics(
  data: DashboardData | null,
  now: Date,
  getSimHours: (dateStr: string) => number,
  hasSimHours: (dateStr: string) => boolean = () => false
): Metrics {
  const yearMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const monthLabel = `${now.getMonth() + 1}월`;
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  const contractHour = data?.attendanceMonth.contractWorkHour ?? 0;
  const contractSec = contractHour * 3600;
  const settledWorkSec = data?.monthSummary.workTime ?? 0;
  const todayBreakSec =
    (data?.daily?.statutoryBreakTime ?? 0) + (data?.daily?.selfBreakTime ?? 0);
  const latestAction = data?.daily?.latest?.action;
  const isWorkEnded = latestAction === "WORK_END";
  // 근무중(WORK_START) 또는 휴게 복귀(AWAY_END) 상태면 현재 시각에 동기화
  const isActivelyWorking =
    (latestAction === "WORK_START" || latestAction === "AWAY_END") &&
    !!data?.daily?.workStartDt;
  // 오늘 총경과(gross): 근무중이면 출근~현재, 아니면 서버 정산값
  const todayGrossSec =
    isActivelyWorking && data?.daily?.workStartDt
      ? Math.max(
          (now.getTime() - new Date(data.daily.workStartDt).getTime()) / 1000,
          0
        )
      : data?.daily?.workTime ?? 0;
  // 오늘 셀 게이지로 시각/근무를 직접 지정했으면 그 값을 오늘 근무로 사용(실시간 대체)
  const todaySimSet = hasSimHours(todayStr);
  // 근무종료 → 휴게 이미 차감됨 / 그 외 → gross에서 휴게 차감
  const todayNetWorkSec = todaySimSet
    ? getSimHours(todayStr) * 3600
    : isWorkEnded
    ? data?.daily?.workTime ?? 0
    : Math.max(todayGrossSec - todayBreakSec, 0);
  // 월간 정산값에서 오늘 몫을 분리해 항상 "정산(오늘 제외) + 오늘 근무"로 합산.
  // 근무종료 시 settled에 오늘이 포함돼 있으므로 빼주고, 시뮬레이션이든 실시간이든
  // 오늘 값을 한 번만 더하도록 통일한다.
  const settledExcludingToday = isWorkEnded
    ? Math.max(settledWorkSec - (data?.daily?.workTime ?? 0), 0)
    : settledWorkSec;
  const actualWorkSec = settledExcludingToday + todayNetWorkSec;
  const vacationPaySec = data?.monthSummary.vacationPayTime ?? 0;
  const recognizedSec = actualWorkSec + vacationPaySec;
  const remainSec = Math.max(contractSec - recognizedSec, 0);

  // 오늘 실시간 근무가 잔여시간에 이미 반영되므로, 잔여일은 내일부터 카운트
  const remainDays = data ? data.businessDay.month - data.businessDay.today : 0;

  // 일자별 근태(휴가/근무) 조회용 맵
  const attMap = new Map((data?.attendances ?? []).map((a) => [a.date, a]));

  // 캘린더 실데이터로 오늘 이후 영업일(=휴일·주말 아님, 휴가 아님)을 분류.
  // 휴가일은 유급으로 의무를 채워줄 뿐 추가 근무 수익(세이브)이 0이므로
  // 미래 근무 시뮬레이션 합산 대상에서 제외한다. (인정시간은 vacationPaySec로 반영)
  const hasCalendar = (data?.calendarDays.length ?? 0) > 0;
  const futureWorkdays = (data?.calendarDays ?? []).filter(
    (d) =>
      d.date > todayStr &&
      !d.holiday &&
      !d.weekend &&
      !attMap.get(d.date)?.vacationType
  );
  // 오늘 이후 네오닷 제외 영업일 수 (캘린더 없으면 기존 추정으로 폴백)
  const futureDaysBeforeNeoDot = hasCalendar
    ? futureWorkdays.filter((d) => !d.neoDot).length
    : data
    ? Math.max(data.businessDay.month - data.businessDay.today - 1, 0)
    : 0;
  // 오늘 이후 네오닷 영업일 수 / 다가오는 네오닷 날짜
  const neoDotDaysAhead = hasCalendar
    ? futureWorkdays.filter((d) => d.neoDot).length
    : data && data.businessDay.month - data.businessDay.today > 0
    ? 1
    : 0;
  const neoDotDate = hasCalendar
    ? futureWorkdays.find((d) => d.neoDot)?.date ?? null
    : null;

  // 하루 8시간 기준 누적 페이스: 오늘까지 경과한 영업일마다 8시간을 기대치로 두고,
  // (실제 근로 + 휴가 인정) - 8시간 의 일단위 합산 = 세이브한(앞선) 시간.
  let elapsedWorkdays = 0;
  let creditedToTodaySec = 0;
  if (hasCalendar) {
    for (const d of data!.calendarDays) {
      if (d.date > todayStr || d.holiday || d.weekend) continue;
      elapsedWorkdays += 1;
      const att = attMap.get(d.date);
      // 오늘은 서버 미정산일 수 있어 실시간 값 사용
      const workSec = d.date === todayStr ? todayNetWorkSec : att?.workTime ?? 0;
      creditedToTodaySec += workSec + (att?.vacationPayTime ?? 0);
    }
  } else if (data) {
    elapsedWorkdays = data.businessDay.today;
    creditedToTodaySec = recognizedSec;
  }
  const expectedToTodaySec = elapsedWorkdays * DAILY_TARGET_SEC;
  const savedSec = creditedToTodaySec - expectedToTodaySec;

  // 미래 일자별 시뮬레이션 근무시간. 네오닷 제외/포함 합계(초)
  const simBeforeNeoDotSec = hasCalendar
    ? futureWorkdays
        .filter((d) => !d.neoDot)
        .reduce((s, d) => s + getSimHours(d.date) * 3600, 0)
    : futureDaysBeforeNeoDot * NEODOT_DAY_SEC;
  const simNeoDotSec = hasCalendar
    ? futureWorkdays
        .filter((d) => d.neoDot)
        .reduce((s, d) => s + getSimHours(d.date) * 3600, 0)
    : neoDotDaysAhead * NEODOT_DAY_SEC;

  // 네오닷 전날까지 예상 = 확정분(오늘 포함) + 네오닷 제외 미래 영업일 시뮬레이션
  const projectedWithoutNeoDot = actualWorkSec + simBeforeNeoDotSec;
  const projectedRecognizedWithoutNeoDot = projectedWithoutNeoDot + vacationPaySec;
  const canRestNeoDot = projectedRecognizedWithoutNeoDot >= contractSec;
  const flexIfRest = Math.max(projectedRecognizedWithoutNeoDot - contractSec, 0);
  // 네오닷 모두 출근할 경우
  const projectedWithNeoDot = projectedWithoutNeoDot + simNeoDotSec;
  const projectedRecognizedWithNeoDot = projectedWithNeoDot + vacationPaySec;
  const flexIfWork = Math.max(projectedRecognizedWithNeoDot - contractSec, 0);

  return {
    yearMonth,
    monthLabel,
    todayStr,
    contractHour,
    contractSec,
    settledWorkSec,
    todayBreakSec,
    isWorkEnded,
    isActivelyWorking,
    todayNetWorkSec,
    actualWorkSec,
    vacationPaySec,
    recognizedSec,
    remainSec,
    remainDays,
    elapsedWorkdays,
    expectedToTodaySec,
    savedSec,
    hasCalendar,
    futureDaysBeforeNeoDot,
    neoDotDaysAhead,
    neoDotDate,
    projectedWithoutNeoDot,
    projectedRecognizedWithoutNeoDot,
    canRestNeoDot,
    flexIfRest,
    projectedWithNeoDot,
    projectedRecognizedWithNeoDot,
    flexIfWork,
  };
}
