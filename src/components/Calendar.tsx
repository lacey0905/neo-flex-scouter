import { useState, useRef, useEffect, type CSSProperties, type ReactNode } from "react";
import type { CompanyCalendarDay, DateAttendance } from "../types";
import { pad } from "../utils/format";
import "./Calendar.scss";

interface CalendarProps {
  yearMonth: string; // "YYYY-MM"
  calendarDays: CompanyCalendarDay[];
  attendances: DateAttendance[];
  todayStr: string;
  todayWorkSec: number;
  /** 오늘 출근 시각(ISO). 없으면 기본 09:00 가정 */
  todayWorkStartDt: string | null;
  /** 오늘 근무외 시간(초, 고정). 법정 휴게는 체류시간으로 별도 산정 */
  todaySelfBreakSec: number;
  getSimHours: (dateStr: string) => number;
  hasSim: (dateStr: string) => boolean;
  onSimChange: (dateStr: string, hours: number) => void;
  onClearSim: (dateStr: string) => void;
  onResetSim: () => void;
  isSimDirty: boolean;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const DAILY_TARGET_SEC = 8 * 3600;

function fmtHm(sec: number): string {
  if (!sec || sec <= 0) return "";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}:${pad(m)}`;
}

/** 8시간 기준 ± 를 "+1:30" / "-0:45" 형태의 짧은 문자열로. */
function fmtDelta(sec: number): string {
  const sign = sec >= 0 ? "+" : "-";
  const mins = Math.round(Math.abs(sec) / 60);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${sign}${h}:${pad(m)}`;
}

/** 누적 잔고 크기에 비례한 배경 틴트 농도(0~0.2). 0이면 틴트 없음. */
function heatAlpha(cumSec: number): number {
  if (cumSec === 0) return 0;
  const hours = Math.abs(cumSec) / 3600;
  return Math.min(0.05 + (hours / 24) * 0.16, 0.2);
}

function paceDir(sec: number): "up" | "down" | "flat" {
  if (sec > 0) return "up";
  if (sec < 0) return "down";
  return "flat";
}

interface PaceInfo {
  delta: number; // 그날 8시간 대비 ± (초)
  cum: number; // 영업일 누적 ± (초)
}

function fmtHours(h: number): string {
  return `${h}h`;
}

/** 자정 기준 분 → "HH:MM" (1440 → 24:00) */
function fmtClock(min: number): string {
  const total = Math.round(min);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${pad(h)}:${pad(m)}`;
}

interface SimControlProps {
  /** 슬라이더 현재 값 */
  value: number;
  min?: number; // 기본 0
  max?: number; // 기본 24
  step?: number; // 기본 0.5
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onChange: (value: number) => void;
  /** 팝업 상단 큰 라벨. 기본 "Nh" */
  valueLabel?: (value: number) => string;
  /** 큰 라벨 아래 보조 설명 (예: 근무 N:NN) */
  subLabel?: (value: number) => string;
  /** 슬라이더 양끝/중앙 스케일 라벨. 기본 ["0","12","24"] */
  scaleLabels?: [string, string, string];
  /** 트리거(칩) 내용 커스텀. 미지정 시 "Nh" 표기 */
  trigger?: ReactNode;
  /** 지정 시 팝업에 "실시간으로" 해제 버튼 노출 (현재 시뮬레이션 적용 상태) */
  onClear?: () => void;
}

/** 클릭하면 게이지(슬라이더) 팝업이 열린다. 값/범위/라벨은 용도별로 주입. */
function SimControl({
  value,
  min = 0,
  max = 24,
  step = 0.5,
  open,
  onToggle,
  onClose,
  onChange,
  valueLabel = fmtHours,
  subLabel,
  scaleLabels = ["0", "12", "24"],
  trigger,
  onClear,
}: SimControlProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  const fill = Math.round(((value - min) / (max - min)) * 100);

  return (
    <div className="sim" ref={ref}>
      <button
        type="button"
        className={`sim__chip ${open ? "is-open" : ""}`}
        onClick={onToggle}
      >
        {trigger ?? fmtHours(value)}
      </button>
      {open && (
        <div className="sim__pop">
          <div className="sim__value">{valueLabel(value)}</div>
          {subLabel && <div className="sim__sub">{subLabel(value)}</div>}
          <input
            className="sim__range"
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            style={{ "--fill": `${fill}%` } as CSSProperties}
            onChange={(e) => onChange(Number(e.target.value))}
          />
          <div className="sim__scale">
            <span>{scaleLabels[0]}</span>
            <span>{scaleLabels[1]}</span>
            <span>{scaleLabels[2]}</span>
          </div>
          {onClear && (
            <button
              type="button"
              className="sim__live-btn"
              onClick={() => {
                onClear();
                onClose();
              }}
            >
              실시간으로
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface DayCell {
  day: number;
  dateStr: string;
  cal?: CompanyCalendarDay;
  att?: DateAttendance;
}

export function Calendar({
  yearMonth,
  calendarDays,
  attendances,
  todayStr,
  todayWorkSec,
  todayWorkStartDt,
  todaySelfBreakSec,
  getSimHours,
  hasSim,
  onSimChange,
  onClearSim,
  onResetSim,
  isSimDirty,
}: CalendarProps) {
  // 오늘 출근 시각(자정 기준 초). 출근 기록이 없으면 09:00 가정.
  const todayClockInSec = (() => {
    if (todayWorkStartDt) {
      const d = new Date(todayWorkStartDt);
      return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
    }
    return 9 * 3600;
  })();

  // 시뮬레이션 휴게: 최소 1시간 고정 + 근무외 시간
  const SIM_BREAK_SEC = 3600 + todaySelfBreakSec;
  // 퇴근시각(자정기준 분) → 순근무(초): 체류 − 휴게
  const netFromOutMin = (outMin: number) => {
    const gross = Math.max(outMin * 60 - todayClockInSec, 0);
    return Math.max(gross - SIM_BREAK_SEC, 0);
  };
  // 순근무(초) → 퇴근시각(분): netFromOutMin 의 역함수
  const outMinFromNet = (netSec: number) =>
    (todayClockInSec + netSec + SIM_BREAK_SEC) / 60;
  // 퇴근시각(분) → 총 휴게(초)
  const breakFromOutMin = (_outMin: number) => SIM_BREAK_SEC;
  const [editing, setEditing] = useState<string | null>(null);

  const [y, m] = yearMonth.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const firstWeekday = new Date(y, m - 1, 1).getDay();

  const calMap = new Map(calendarDays.map((d) => [d.date, d]));
  const attMap = new Map(attendances.map((a) => [a.date, a]));

  const cells: (DayCell | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${yearMonth}-${pad(day)}`;
    cells.push({
      day,
      dateStr,
      cal: calMap.get(dateStr),
      att: attMap.get(dateStr),
    });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  // 영업일별 8시간 기준 ± 와 누적 잔고(주식 수익률처럼) 계산
  const paceMap = new Map<string, PaceInfo>();
  let cum = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${yearMonth}-${pad(day)}`;
    const cal = calMap.get(dateStr);
    const att = attMap.get(dateStr);
    const dow = (firstWeekday + day - 1) % 7;
    const isHoliday = cal?.holiday ?? false;
    const isWeekend = cal?.weekend ?? (dow === 0 || dow === 6);
    if (isHoliday || isWeekend) continue; // 영업일만 누적 대상
    if (att?.vacationType) continue; // 휴가일은 수익 0 → 누적/표기 제외

    const isToday = dateStr === todayStr;
    const isFuture = dateStr > todayStr;
    const workSec = isToday
      ? todayWorkSec
      : isFuture
      ? getSimHours(dateStr) * 3600
      : att?.workTime ?? 0;
    const credited = workSec + (att?.vacationPayTime ?? 0);
    const delta = credited - DAILY_TARGET_SEC;
    cum += delta;
    paceMap.set(dateStr, { delta, cum });
  }

  return (
    <section className="calendar-section">
      <div className="calendar">
        <div className="calendar__titlebar">
          <h3 className="section-title">{m}월 근태 달력</h3>
          {isSimDirty && (
            <button className="calendar__reset" onClick={onResetSim}>
              시뮬레이션 초기화
            </button>
          )}
        </div>
        <div className="calendar__head">
          {WEEKDAYS.map((w, i) => (
            <div
              key={w}
              className={`calendar__dow ${
                i === 0 ? "calendar__dow--sun" : i === 6 ? "calendar__dow--sat" : ""
              }`}
            >
              {w}
            </div>
          ))}
        </div>
        <div className="calendar__grid">
          {cells.map((cell, idx) => {
            if (!cell) return <div key={idx} className="cal-cell cal-cell--empty" />;
            const { day, dateStr, cal, att } = cell;
            const dow = (firstWeekday + day - 1) % 7;
            const isHoliday = cal?.holiday;
            const isWeekend = cal?.weekend;
            const isToday = dateStr === todayStr;
            const isFuture = dateStr > todayStr;
            const hasVacation = !!att?.vacationType;
            // 오늘도 미래일처럼 게이지로 시뮬레이션 가능 (실시간 대체)
            const isEditable = (isFuture || isToday) && !isHoliday && !isWeekend;
            const workSec = isToday ? todayWorkSec : att?.workTime ?? 0;
            const todaySimSet = isToday && hasSim(dateStr);
            const pace = paceMap.get(dateStr);

            // 오늘 전용: 퇴근시각 게이지 ↔ 근무시간 환산 (법정 휴게 자동 차감)
            const clockInMin = todayClockInSec / 60;
            const todayOutMin = outMinFromNet(workSec);

            const classes = [
              "cal-cell",
              isToday ? "cal-cell--today" : "",
              isHoliday ? "cal-cell--holiday" : "",
              hasVacation ? "cal-cell--vacation" : "",
              isWeekend && !isHoliday ? "cal-cell--weekend" : "",
              cal?.neoDot ? "cal-cell--neodot" : "",
              isFuture && !isEditable ? "cal-cell--future" : "",
              editing === dateStr ? "cal-cell--editing" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <div key={idx} className={classes}>
                {pace && pace.cum !== 0 && (
                  <span
                    className="cal-cell__heat"
                    data-dir={paceDir(pace.cum)}
                    style={{ opacity: heatAlpha(pace.cum) }}
                  />
                )}
                <div className="cal-cell__top">
                  <span className="cal-cell__daygroup">
                    <span
                      className={`cal-cell__day ${
                        dow === 0 ? "cal-cell__day--sun" : dow === 6 ? "cal-cell__day--sat" : ""
                      }`}
                    >
                      {day}
                    </span>
                    {cal?.neoDot && <span className="cal-badge cal-badge--neodot">N</span>}
                    {cal?.familyDay && <span className="cal-badge cal-badge--family">F</span>}
                  </span>
                  {pace && (
                    <span className="cal-cell__pace">
                      <span
                        className="cal-cell__delta"
                        data-dir={paceDir(pace.delta)}
                      >
                        {fmtDelta(pace.delta)}
                      </span>
                      <span
                        className="cal-cell__cum"
                        data-dir={paceDir(pace.cum)}
                      >
                        {fmtDelta(pace.cum)}
                      </span>
                    </span>
                  )}
                </div>

                <div className="cal-cell__body">
                  {hasVacation ? (
                    <span className="cal-cell__vacation">
                      {att?.vacationName ?? "휴가"}
                    </span>
                  ) : isEditable && isToday ? (
                    // 오늘: 퇴근시각을 고르면 근무시간이 자동 계산됨 (출근시각부터 시작)
                    <SimControl
                      value={todayOutMin}
                      min={clockInMin}
                      max={24 * 60}
                      step={1}
                      open={editing === dateStr}
                      onToggle={() => {
                        const opening = editing !== dateStr;
                        // 실시간 → 게이지 전환: 현재 퇴근시각(now)을 10분 단위로 스냅해 고정
                        if (opening && !todaySimSet) {
                          const snappedOut = Math.round(todayOutMin);
                          onSimChange(dateStr, netFromOutMin(snappedOut) / 3600);
                        }
                        setEditing((cur) => (cur === dateStr ? null : dateStr));
                      }}
                      onClose={() =>
                        setEditing((cur) => (cur === dateStr ? null : cur))
                      }
                      onChange={(out) =>
                        onSimChange(dateStr, netFromOutMin(out) / 3600)
                      }
                      valueLabel={(out) => `퇴근 ${fmtClock(out)}`}
                      subLabel={(out) =>
                        `근무 ${fmtHm(netFromOutMin(out)) || "0:00"} · 휴게 ${
                          fmtHm(breakFromOutMin(out)) || "0:00"
                        }`
                      }
                      scaleLabels={[fmtClock(clockInMin), "", "24:00"]}
                      trigger={
                        <span className="sim__today">
                          {!todaySimSet && <span className="cal-cell__live-dot" />}
                          {fmtHm(workSec) || "0:00"}
                        </span>
                      }
                      onClear={
                        todaySimSet ? () => onClearSim(dateStr) : undefined
                      }
                    />
                  ) : isEditable ? (
                    // 미래일: 예상 근무시간(0~24h) 게이지
                    <SimControl
                      value={getSimHours(dateStr)}
                      open={editing === dateStr}
                      onToggle={() =>
                        setEditing((cur) => (cur === dateStr ? null : dateStr))
                      }
                      onClose={() =>
                        setEditing((cur) => (cur === dateStr ? null : cur))
                      }
                      onChange={(h) => onSimChange(dateStr, h)}
                    />
                  ) : isToday ? (
                    <span className="cal-cell__work cal-cell__work--live">
                      <span className="cal-cell__live-dot" />
                      {fmtHm(workSec) || "0:00"}
                    </span>
                  ) : workSec > 0 ? (
                    <span className="cal-cell__work">{fmtHm(workSec)}</span>
                  ) : isHoliday ? (
                    <span className="cal-cell__rest">휴일</span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <div className="calendar__legend">
          <span className="legend-item"><span className="cal-badge cal-badge--neodot">N</span> 네오닷</span>
          <span className="legend-item"><span className="cal-badge cal-badge--family">F</span> 패밀리데이</span>
          <span className="legend-item"><span className="legend-swatch legend-swatch--holiday" /> 휴일</span>
          <span className="legend-item"><span className="legend-swatch legend-swatch--vacation" /> 휴가</span>
          <span className="legend-item">우측 상단: 위=그날 ±, 아래=누적 · 0=보합(무채색)</span>
          <span className="legend-item">미래 일자 입력 = 시뮬레이션(기본 8h)</span>
        </div>
      </div>
    </section>
  );
}
