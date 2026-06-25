import { useState, useRef, useEffect, type CSSProperties } from "react";
import type { CompanyCalendarDay, DateAttendance } from "../types";
import { pad } from "../utils/format";
import "./Calendar.scss";

interface CalendarProps {
  yearMonth: string; // "YYYY-MM"
  calendarDays: CompanyCalendarDay[];
  attendances: DateAttendance[];
  todayStr: string;
  todayWorkSec: number;
  getSimHours: (dateStr: string) => number;
  onSimChange: (dateStr: string, hours: number) => void;
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

interface SimControlProps {
  hours: number;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onChange: (hours: number) => void;
}

/** 예상 근무시간 입력: 클릭하면 0~24h 게이지(슬라이더)가 열린다. */
function SimControl({ hours, open, onToggle, onClose, onChange }: SimControlProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  const fill = Math.round((hours / 24) * 100);

  return (
    <div className="sim" ref={ref}>
      <button
        type="button"
        className={`sim__chip ${open ? "is-open" : ""}`}
        onClick={onToggle}
      >
        {fmtHours(hours)}
      </button>
      {open && (
        <div className="sim__pop">
          <div className="sim__value">{fmtHours(hours)}</div>
          <input
            className="sim__range"
            type="range"
            min={0}
            max={24}
            step={0.5}
            value={hours}
            style={{ "--fill": `${fill}%` } as CSSProperties}
            onChange={(e) => onChange(Number(e.target.value))}
          />
          <div className="sim__scale">
            <span>0</span>
            <span>12</span>
            <span>24</span>
          </div>
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
  getSimHours,
  onSimChange,
  onResetSim,
  isSimDirty,
}: CalendarProps) {
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
            const isEditable = isFuture && !isHoliday && !isWeekend;
            const workSec = isToday ? todayWorkSec : att?.workTime ?? 0;
            const pace = paceMap.get(dateStr);

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
                  ) : isEditable ? (
                    <SimControl
                      hours={getSimHours(dateStr)}
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
                      {fmtHm(workSec) || "0분"}
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
