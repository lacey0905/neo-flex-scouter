export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  photo: string;
  chatSpace: string;
  role: string;
}

export interface Company {
  cd: string;
  name: string;
  targetYn: string;
}

export interface Organization {
  cd: string;
  name: string;
  fullName: string;
  companyCd: string;
  parentOrgCd: string;
  managerEmpNo: number;
  useYn: string;
}

export interface Employee {
  no: number;
  name: string;
  email: string;
  companyCd: string;
  status: string;
  originYn: string;
  role: string;
  hireDate: string;
  orgOriginYn: string;
  dutyCd: string;
  dutyNm: string;
  organization: Organization;
}

export interface UserInfo {
  googleUser: GoogleUser;
  company: Company;
  employee: Employee;
  manager: boolean;
  roles: string[];
}

export interface AttendanceMonthSummary {
  workTime: number;
  paidWorkTime: number;
  paidWorkDayTime: number;
  paidWorkNightTime: number;
  paidWorkContractExtraDayTime: number;
  paidWorkContractExtraNightTime: number;
  paidWorkStatutoryExtraDayTime: number;
  paidWorkStatutoryExtraNightTime: number;
  paidWorkHolidayTime: number;
  paidWorkHolidayDayTime: number;
  paidWorkHolidayNightTime: number;
  vacationPayTime: number;
}

export interface BusinessDay {
  month: number;
  today: number;
}

export interface CompanyCalendarDay {
  id: number;
  ccmId: number;
  date: string;
  holidayYn: "Y" | "N";
  familyDayYn: "Y" | "N";
  neoDotYn: "Y" | "N";
  comment?: string;
  holiday: boolean;
  weekend: boolean;
  neoDot: boolean;
  familyDay: boolean;
}

export interface AttendanceMonth {
  id: number;
  ccmId: number;
  empNo: number;
  yearMonth: string;
  contractWorkHour: number;
  statutoryWorkHour: number;
  maxExtraWorkHour: number;
  workTime: number;
  workDayTime: number;
  workNightTime: number;
  workContractExtraDayTime: number;
  workContractExtraNightTime: number;
  workStatutoryExtraDayTime: number;
  workStatutoryExtraNightTime: number;
  holidayWorkDayInEightTime: number;
  holidayWorkNightInEightTime: number;
  holidayWorkDayOverEightTime: number;
  holidayWorkNightOverEightTime: number;
  selfBreakTime: number;
  vacationPayTime: number;
  rewardTime: number;
}

export interface AttendanceLatest {
  id: number;
  attendanceId: number;
  status: string;
  location: string;
  action: string;
  recordDt: string;
  recorder: string;
}

export interface DailyAttendance {
  id: number;
  workStartDt: string;
  workEndDt: string;
  workTime: number;
  selfBreakTime: number;
  statutoryBreakTime: number;
  location: string;
  latest: AttendanceLatest;
}

export interface DateAttendance {
  id: number;
  amId: number;
  ccdId: number;
  date: string;
  holiday: "Y" | "N";
  neoDot: "Y" | "N";
  workStartDt?: string;
  workEndDt?: string;
  workTime: number;
  workDayTime: number;
  workMorningNightTime: number;
  workAfterNightTime: number;
  workExtraDayTime: number;
  workExtraNightTime: number;
  paidWorkTime: number;
  paidWorkHolidayDayTime: number;
  paidWorkHolidayMorningNightTime: number;
  paidWorkHolidayAfterNightTime: number;
  paidWorkDayTime: number;
  paidWorkNightTime: number;
  paidWorkContractExtraDayTime: number;
  paidWorkContractExtraNightTime: number;
  paidWorkStatutoryExtraDayTime: number;
  paidWorkStatutoryExtraNightTime: number;
  breakTime: number;
  selfBreakTime: number;
  statutoryBreakTime: number;
  vacationType?: "MORNING" | "AFTERNOON" | "ALL";
  vacationName?: string;
  vacationPayTime: number;
  comment?: string;
  startCnt: number;
  workNightTime: number;
}

export interface ApiResponse<T> {
  resultCode: number;
  value: T;
  error?: {
    name: string;
    message: string;
  };
}

export interface DashboardData {
  user: UserInfo;
  daily: DailyAttendance | null;
  monthSummary: AttendanceMonthSummary;
  businessDay: BusinessDay;
  calendarDays: CompanyCalendarDay[];
  attendances: DateAttendance[];
  attendanceMonth: AttendanceMonth;
  vacationCount: number;
}
