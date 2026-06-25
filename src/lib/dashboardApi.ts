import {
  fetchUserInfo,
  fetchAttendanceMonthSummary,
  fetchDailyAttendance,
  fetchBusinessDay,
  fetchAttendanceMonth,
  fetchVacationCount,
  fetchCalendarDays,
  fetchAttendances,
} from "../api";
import type { DashboardData, DailyAttendance } from "../types";

export type DashboardResult = { data: DashboardData } | { error: string };

/**
 * 대시보드에 필요한 모든 API 를 호출해 DashboardData 를 구성한다.
 * 인증/조회 실패 시 사용자에게 보여줄 에러 메시지를 담아 반환한다.
 */
export async function loadDashboardData(
  token: string,
  yearMonth: string
): Promise<DashboardResult> {
  try {
    const userRes = await fetchUserInfo(token);
    if (userRes.resultCode !== 0) {
      return { error: "인증에 실패했습니다. 토큰을 확인해주세요." };
    }

    const user = userRes.value;
    const empNo = user.employee.no;

    const [
      businessDayRes,
      attendanceMonthRes,
      vacationRes,
      dailyRes,
      calendarRes,
      attendancesRes,
    ] = await Promise.all([
      fetchBusinessDay(token, yearMonth),
      fetchAttendanceMonth(token, empNo, yearMonth),
      fetchVacationCount(token, yearMonth),
      fetchDailyAttendance(token),
      fetchCalendarDays(token, yearMonth),
      fetchAttendances(token, yearMonth),
    ]);

    if (attendanceMonthRes.resultCode !== 0) {
      return { error: "근태 데이터 조회 실패" };
    }

    const ccmId = attendanceMonthRes.value.ccmId;
    const monthSummaryRes = await fetchAttendanceMonthSummary(token, ccmId);

    if (monthSummaryRes.resultCode !== 0) {
      return { error: "근태 데이터 조회 실패" };
    }

    return {
      data: {
        user,
        daily: dailyRes.resultCode === 0 ? dailyRes.value : null,
        monthSummary: monthSummaryRes.value,
        businessDay: businessDayRes.value,
        calendarDays: calendarRes.resultCode === 0 ? calendarRes.value : [],
        attendances: attendancesRes.resultCode === 0 ? attendancesRes.value : [],
        attendanceMonth: attendanceMonthRes.value,
        vacationCount: vacationRes.value,
      },
    };
  } catch {
    return {
      error: "API 요청 중 오류가 발생했습니다.",
    };
  }
}

/**
 * 정밀 추적용: 오늘 근태(근무·휴게)만 다시 조회한다. 실패는 null 로 흡수.
 */
export async function refreshDaily(token: string): Promise<DailyAttendance | null> {
  try {
    const res = await fetchDailyAttendance(token);
    return res.resultCode === 0 ? res.value : null;
  } catch {
    return null;
  }
}
