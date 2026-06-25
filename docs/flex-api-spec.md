# Neo-Flex API 명세서

> 출처: `https://neo-flex.neowiz.com` 프론트엔드 번들의 공개 소스맵(`sourcesContent`)에서 추출한
> `src/services/api/*` 및 `src/schemas/*` 원본 정의 기준. (백엔드 Swagger:
> `https://neo-flex.corp-dq.nwz.cloud/swagger-ui/index.html` 가 코드 주석에 언급됨)

## 공통 사항

| 항목 | 값 |
|---|---|
| Base URL | `https://neo-flex-api.neowiz.com/flex/` (`VITE_API_ENDPOINT` + `/flex/`) |
| 인증 헤더 | `Authorization: Bearer <JWT>` |
| Content-Type | `application/json` |
| HTTP 클라이언트 | `ky` (retry 2회, timeout 15초, `throwHttpErrors:false`) |
| 토큰 자동 갱신 | 모든 응답의 `authorization` 헤더에 새 토큰이 오면 교체 |
| 신원 판단 | 대부분의 "내 데이터" 조회는 **쿼리 파라미터가 아니라 토큰의 sub로 식별** |

### 응답 공통 구조

```jsonc
{
  "resultCode": 0,
  "value": { /* 성공 시 데이터 (스키마 검증 대상) */ },
  "error": { "name": "string", "message": "string", "host": "string", "timestamp": 0 }
}
```

- `value`가 있으면 Zod 스키마로 검증 후 반환
- `value`/`error` 없이 `resultCode === 0` 이면 성공(반환값 없음)
- `error` 존재 또는 status >= 500 이면 예외(`ApiFlexError`)

### 인증 (앱 외부, root 경로)

| 동작 | URL |
|---|---|
| 로그인(구글 SSO via Keycloak) | `GET https://neo-flex-api.neowiz.com/oauth2/authorization/keycloak?redirect_uri=<앱>/login` |
| 로그아웃 | `GET https://neo-flex-api.neowiz.com/logout?redirect_uri=<앱>/login` |
| 콜백 | 로그인 성공 시 `redirect_uri` 에 `?token=<JWT>` 를 붙여 리다이렉트 |

> Keycloak: `iam.neowiz.com/realms/neowiz`, `client_id=neo-flex`, `scope=openid profile email google`

---

## 1. User API (`user-api.ts`)

| 메서드 | 경로 | 쿼리/바디 | 응답 | 설명 |
|---|---|---|---|---|
| GET | `user/me` | - | `FlexUser` | 로그인 유저 정보 |

## 2. 근태 활동 API (`attendance-activity-api.ts`)

| 메서드 | 경로 | 쿼리/바디 | 응답 | 설명 |
|---|---|---|---|---|
| PUT | `attendance/activity` | body: ActivityModify | `AttendanceActivityDto` | 근태 활동 수정 |
| POST | `attendance/activity/WORK_START` | `location` | `AttendanceActivityDto` | 출근 |
| POST | `attendance/activity` | body: ActivityAdd | `AttendanceActivityDto` | 활동 추가(쉬러가기/복귀/재시작/퇴근) |
| GET | `attendance/{attendanceId}/activities` | - | `AttendanceActivityDto[]` | 활동 목록 |
| DELETE | `attendance/activity/{activityId}` | - | `boolean` | 활동 삭제 |

- 활동 추가 시 `action`: `WORK_START` / `WORK_END` / `AWAY_START`(쉬러가기) / `AWAY_END`(복귀)
- `location`: `INSIDE` / `OUTSIDE` / `HOME`

## 3. 근태 월별 API (`attendance-month-api.ts`)

| 메서드 | 경로 | 쿼리/바디 | 응답 | 설명 |
|---|---|---|---|---|
| GET | `attendance/month/summary` | `ccmId` | `AttendancePaidWorkSum` | 월 누적 근태 요약 |
| GET | `attendance/month` | `emoNo`, `yearMonth` | `AttendanceMonthDto` | 월별 근태 (※ `emoNo` 오타, 토큰 신원으로 동작) |
| GET | `attendance/month/deadline` | `yearMonth` | `boolean` | 마감 여부 |
| POST | `attendance/month/deadline` | `yearMonth` | `AttendanceMonthDto` | 월 마감 |
| POST | `attendance/month/deadline/cancel` | `yearMonth` | `boolean` | 마감 취소 |
| GET | `attendance/month/deadline/cancelable` | `yearMonth` | `boolean` | 마감 취소 가능 여부 |

## 4. 근태 일별 API (`attendance-day-api.ts`)

| 메서드 | 경로 | 쿼리/바디 | 응답 | 설명 |
|---|---|---|---|---|
| GET | `attendance/summary` | - | `AttendanceSummaryDto?` | 최근(오늘) 근태 요약 |
| GET | `attendance` | `empNo`, `date` | `AttendanceDto?` | 특정일 근태 |
| POST | `attendance` | `date` | `AttendanceDto?` | 특정일 근태 생성 |
| GET | `attendance/approvals` | `date`, `empNo?` | `AttendanceWithApprovalsDto?` | 결재 포함 일별 근태 |
| GET | `attendance/{attendanceId}/approvals` | - | `AttendanceWithApprovalsDto` | 결재 포함 일별 근태(ID) |
| GET | `attendances` | `yearMonth` | `AttendanceDto[]` | 월 일별 근태 목록 |
| GET | `attendances/missing/attendance` | `yearMonth` | `AttendanceMissingDto[]` | 근태 누락 목록 |
| GET | `attendances/missing/application` | `yearMonth` | `AttendanceMissingDto[]` | 신청 누락 목록 |
| GET | `attendances/vacation/count` | `yearMonth` | `number?` | **오늘 이후** 휴가 일수 |

## 5. 결재 API (`approval-api.ts`)

| 메서드 | 경로 | 쿼리/바디 | 응답 | 설명 |
|---|---|---|---|---|
| GET | `approval/applications` | `startDate`, `endDate` | `ApprovalApplicationWithDocumentDto[]` | 내 신청 목록 |
| GET | `approval/application/{id}` | - | `...WithManagerDocumentLineDto` | 신청 상세 |
| POST | `approval/application/{applyType}` | body | `boolean` | 결재 신청 |
| DELETE | `approval/application/{id}` | `comment` | `boolean` | 신청 취소 |
| GET | `approval/applications/pending` | - | `...WithEmployeeDocumentLineDto[]` | 결재 대기함 |
| GET | `approval/applications/confirmed` | `startDate`, `endDate` | `...WithEmployeeDocumentLineDto[]` | 결재 완료함 |
| POST | `approval/application/line/{lineId}/agree` | `comment` | `boolean` | 승인 |
| POST | `approval/application/line/{lineId}/disagree` | `comment` | `boolean` | 반려 |

## 6. 사원 API (`employee-api.ts`)

| 메서드 | 경로 | 쿼리/바디 | 응답 | 설명 |
|---|---|---|---|---|
| GET | `company/employee/{empNo}` | - | `EmployeeWithOrganizationDto` | 사원 조회 |
| GET | `company/employee/settings` | - | `EmployeeWithDetailDto` | 내 설정 조회 |
| POST | `company/employee/settings` | body | `EmployeeWithDetailDto` | 내 설정 변경 |
| GET | `company/employees/search` | `keyword` | `EmployeeWithOrganizationDto[]` | 사원 검색 |

## 7. 회사 API (`company-api.ts`)

| 메서드 | 경로 | 쿼리/바디 | 응답 | 설명 |
|---|---|---|---|---|
| GET | `company/{companyCd}/change` | - | `string` | 회사 전환(새 토큰 반환) |
| GET | `companies/managed/me` | - | `CompanyDto[]` | 내가 관리하는 회사 목록 |

## 8. 캘린더 API (`calendar-day-api.ts`)

| 메서드 | 경로 | 쿼리/바디 | 응답 | 설명 |
|---|---|---|---|---|
| GET | `company/calendar/month/{yearMonth}/day` | - | `CompanyCalendarDayDto[]` | 월 일별 캘린더 |
| GET | `company/calendar/month/{yearMonth}/businessDay` | - | `CompanyCalendarBusinessDayDto` | 월 영업일 수 |

## 9. 세콤 태깅 API (`secom-api.ts`)

| 메서드 | 경로 | 쿼리/바디 | 응답 | 설명 |
|---|---|---|---|---|
| GET | `secom/tagging/date/summary` | `date`, `empNo?` | `SecomTaggingSummaryDto` | 일자별 출입 태깅 요약 |
| GET | `secom/tagging/date` | `date`, `empNo?` | `SecomTaggingWithGateDto[]` | 일자별 출입 태깅 목록 |

---

## 데이터 모델 (DTO)

### FlexUser (`user/me`)
| 필드 | 타입 | 설명 |
|---|---|---|
| googleUser.id | string | Google User Id |
| googleUser.email | string | 이메일 |
| googleUser.name | string | 이름 |
| googleUser.photo | string? | 프로필 사진 |
| googleUser.chatSpace | string? | 구글 챗 스페이스 |
| googleUser.role | `USER`\|`ADMIN` | Flex 역할 |
| company.cd / name / targetYn | string / string / `Y`\|`N` | 회사 코드 / 이름 / 적용 대상 |
| employee | `EmployeeWithOrganization`? | 사원 정보(조직 포함) |
| manager | boolean | 조직장 여부 |
| roles | (`ADMIN`\|`MAINTAINER`\|`USER`)[] | 역할 |

### EmployeeWithOrganization
| 필드 | 타입 | 설명 |
|---|---|---|
| no | int | 사원 번호 |
| name / email / companyCd | string | 사원명 / 이메일 / 회사 코드 |
| status | `EMPLOYED`\|`ON_LEAVE`\|`RETIRED` | 상태 |
| role | `MAINTAINER`\|`USER`\|`NONE` | 권한 |
| originYn / orgOriginYn | `Y`\|`N` | 본소속 / 본조직 여부 |
| delegateEmpNo | int? | 대리자 사원 ID |
| hireDate / retireDate | string / string? | 입사일 / 퇴직일 |
| dutyCd / dutyNm | string | 직책 코드 / 명 |
| organization.cd/name/fullName | string | 조직 코드/단축명/전체명 |
| organization.parentOrgCd | string? | 상위 조직 코드 |
| organization.managerEmpNo | int? | 조직장 사원 ID |
| organization.useYn | `Y`\|`N` | 사용 여부 |

### EmployeeWithDetail (`company/employee/settings`)
EmployeeWithOrganization 의 organization 대신 알림 설정 포함:
`chatbotTaggingAlarmYn`, `chatbotApprovalAlarmYn`, `attendanceMailAlarmYn`, `memberMailAlarmYn` (모두 `Y`\|`N`)

### AttendanceMonthDto (`attendance/month`)
| 필드 | 타입 | 설명 |
|---|---|---|
| id / ccmId / empNo | int | 월별 ID / 회사 월별 캘린더 ID / 사원 번호 |
| yearMonth | string | 근무 년월 |
| contractWorkHour | int | 소정 근로 시간 |
| statutoryWorkHour | int | 법정 근로 시간 |
| maxExtraWorkHour | int | 최대 연장 근로 시간 |
| workTime | int | 근무 시간 |
| workDayTime / workNightTime | int | 주간 / 야간 근무 시간 |
| workContractExtraDayTime / NightTime | int | 유급 소정 연장 주간/야간 |
| workStatutoryExtraDayTime / NightTime | int | 유급 법정 연장 주간/야간 |
| holidayWorkDayInEightTime / NightInEight | int | 휴일 8시간 이내 주간/야간 |
| holidayWorkDayOverEightTime / NightOverEight | int | 휴일 8시간 초과 주간/야간 |
| selfBreakTime | int | 근무외 시간 |
| vacationPayTime | int | 유급 휴가 시간 |
| deadlineEmpNo / deadlineDate | int? / string? | 마감한 사람 / 마감 일자 |
| rewardTime | int? | 보상시간 |

### AttendancePaidWorkSum (`attendance/month/summary`)
| 필드 | 타입 | 설명 |
|---|---|---|
| workTime | int | 누적 실제 근무 시간 |
| paidWorkTime | int | 누적 승인 근무 시간 |
| paidWorkDayTime / NightTime | int | 누적 주간 / 야간 |
| paidWorkContractExtraDayTime / NightTime | int | 누적 소정 연장 주간/야간 |
| paidWorkStatutoryExtraDayTime / NightTime | int | 누적 법정 연장 주간/야간 |
| paidWorkHolidayTime / DayTime / NightTime | int | 누적 휴일 / 휴일 주간 / 휴일 야간 |
| vacationPayTime | int | 유급 휴가 시간 |

### AttendanceSummaryDto (`attendance/summary`)
| 필드 | 타입 | 설명 |
|---|---|---|
| id | int | 일별 ID |
| workStartDt / workEndDt | string? | 근무 시작 / 종료 일시 |
| workTime | int? | 총 근무 시간 |
| selfBreakTime | int? | 근무 외 시간 |
| statutoryBreakTime | int? | 휴게 시간(법정) |
| vacationType | `MORNING`\|`AFTERNOON`\|`ALL`? | 휴가 구분 |
| location | `INSIDE`\|`OUTSIDE`\|`HOME`? | 근무 위치 |
| latest | `AttendanceActivity`? | 최근 근태 활동 |

### AttendanceDto (`attendance`, `attendances`)
| 필드 | 타입 | 설명 |
|---|---|---|
| id / amId / ccdId | int | 일별 / 월별 / 회사 일별 캘린더 ID |
| date | string | 근무 일자 |
| holiday / neoDot | `Y`\|`N` | 휴일 / NeoDot 여부 |
| workStartDt / workEndDt | string? | 근무 시작 / 종료 일시 |
| workTime / workDayTime / workNightTime | int | 근무 / 주간 / 야간 시간 |
| workMorningNightTime / workAfterNightTime | int | 오전 / 오후 야간 시간 |
| workExtraDayTime / workExtraNightTime | int | 연장 주간 / 야간 |
| paidWork* | int | 유급 근무/휴일/연장 계열 다수 |
| breakTime / selfBreakTime / statutoryBreakTime | int | 휴게 / 근무외 / 법정 휴게 |
| vacationType / vacationName / vacationPayTime | enum?/string?/int | 휴가 구분 / 이름 / 유급 휴가 시간 |
| startCnt | int | 출근 횟수 |
| comment | string? | 근무 코멘트 |

> `AttendanceWithApprovalsDto` 는 위에 더해 `extraWork`/`nightWork`/`holidayWork` (각 `dayTime`,`nightTime`) 결재 승인 시간 포함

### AttendanceActivityDto
| 필드 | 타입 | 설명 |
|---|---|---|
| id / attendanceId | int | 활동 ID / 근태 ID |
| status | `CREATED`\|`MODIFIED` | 상태 |
| location | `INSIDE`\|`OUTSIDE`\|`HOME`? | 근무 위치 |
| action | `WORK_START`\|`WORK_END`\|`AWAY_START`\|`AWAY_END` | 행동 |
| recordDt | string | 기록 일시 |
| comment | string? | 근무 코멘트 |
| recorder | `EMPLOYEE`\|`BOT` | 기록자 |
| modifiedEmpNo | int? | 수정한 사람 |

### CompanyCalendarBusinessDayDto (`.../businessDay`)
| 필드 | 타입 | 설명 |
|---|---|---|
| month | int | 월 영업일 수 |
| today | int | **오늘 까지 영업일 수 (오늘 포함)** |

### CompanyCalendarDayDto (`.../day`)
| 필드 | 타입 | 설명 |
|---|---|---|
| id / ccmId | int | 일별 / 월별 캘린더 ID |
| date | string | 일자 |
| holidayYn / familyDayYn / neoDotYn | `Y`\|`N` | 선택 휴일 / 패밀리데이 / NeoDot |
| holiday / weekend / neoDot / familyDay | boolean | 휴일(일요일 포함) / 주말 / NeoDot / 패밀리데이 |
| comment | string? | 코멘트 |

### CompanyDto
`cd`(회사 코드), `name`(회사 이름), `targetYn`(`Y`\|`N`, 적용 대상 여부)

### AttendanceMissingDto
`date`(일자), `type`(누락 종류)

### SecomTaggingSummaryDto
`firstDt`, `lastDt`, `firstInDt`(최초 입구), `lastOutDt`(최종 출구) — 모두 string?

### SecomTaggingWithGateDto
`id`(int), `empNo`(int), `recordDt`(string), `gateId`/`gateName`(string), `gateDirection`(`IN`\|`OUT`)

### ApprovalApplicationWithDocumentDto
| 필드 | 타입 | 설명 |
|---|---|---|
| id / adId / empNo | int | 신청서 / 회사별 문서 / 신청자 ID |
| date / createdDt | string | 신청 일자 / 신청 일시 |
| dayTime / nightTime | int? | 주간 / 야간 신청 시간 |
| status | `REQUEST`\|`DONE`\|`REJECT`\|`CANCEL` | 진행 상태 |
| comment | string | 신청 사유 |
| approvalDocument.type | `EXTRA_WORK`\|`NIGHT_WORK`\|`HOLIDAY_WORK`\|`OUTSIDE_WORK`\|`HOME_WORK` | 문서 타입 |
| approvalDocument.id/companyCd/name/step | int/string/string/int | 문서 정보 |

---

## 우리 앱(`src/api.ts`)과의 차이 / 메모

1. **`attendance/month` 의 실제 파라미터는 `emoNo`** (백엔드 오타). 우리는 `empNo` 사용 중이나, 이 엔드포인트는 파라미터를 무시하고 토큰 신원으로 동작하므로 결과는 동일. 파라미터 제거 가능.
2. **`businessDay.today` = "오늘 포함 영업일 수"** → 잔여일 `month - today`(내일부터) 계산이 정확함이 확정됨.
3. **`attendances/vacation/count` 는 "오늘 이후" 휴가 일수** (메서드명 `getCountOfVacationAfterTodayAsync`).
4. 프론트 번들 소스맵(`.js.map`)이 `sourcesContent` 포함으로 공개되어 있어 전체 API 계약이 노출됨.
