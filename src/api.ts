import type {
  ApiResponse,
  UserInfo,
  AttendanceMonthSummary,
  DailyAttendance,
  DateAttendance,
  BusinessDay,
  AttendanceMonth,
} from "./types";

const BASE_URL = "https://neo-flex-api.neowiz.com/flex";

function headers(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function fetchUserInfo(
  token: string
): Promise<ApiResponse<UserInfo>> {
  const res = await fetch(`${BASE_URL}/user/me`, {
    method: "GET",
    headers: headers(token),
  });
  return res.json();
}

export async function fetchAttendanceMonthSummary(
  token: string,
  ccmId: number
): Promise<ApiResponse<AttendanceMonthSummary>> {
  const res = await fetch(
    `${BASE_URL}/attendance/month/summary?ccmId=${ccmId}`,
    { method: "GET", headers: headers(token) }
  );
  return res.json();
}

export async function fetchBusinessDay(
  token: string,
  yearMonth: string
): Promise<ApiResponse<BusinessDay>> {
  const res = await fetch(
    `${BASE_URL}/company/calendar/month/${yearMonth}/businessDay`,
    { method: "GET", headers: headers(token) }
  );
  return res.json();
}

export async function fetchVacationCount(
  token: string,
  yearMonth: string
): Promise<ApiResponse<number>> {
  const res = await fetch(
    `${BASE_URL}/attendances/vacation/count?yearMonth=${yearMonth}`,
    { method: "GET", headers: headers(token) }
  );
  return res.json();
}

export async function fetchAttendanceMonth(
  token: string,
  empNo: number,
  yearMonth: string
): Promise<ApiResponse<AttendanceMonth>> {
  const res = await fetch(
    `${BASE_URL}/attendance/month?empNo=${empNo}&yearMonth=${yearMonth}`,
    { method: "GET", headers: headers(token) }
  );
  return res.json();
}

export async function fetchDailyAttendance(
  token: string
): Promise<ApiResponse<DailyAttendance>> {
  const res = await fetch(`${BASE_URL}/attendance/summary`, {
    method: "GET",
    headers: headers(token),
  });
  return res.json();
}

export async function fetchDateAttendance(
  token: string,
  empNo: number,
  date: string
): Promise<ApiResponse<DateAttendance>> {
  const res = await fetch(
    `${BASE_URL}/attendance?empNo=${empNo}&date=${date}`,
    { method: "GET", headers: headers(token) }
  );
  return res.json();
}
