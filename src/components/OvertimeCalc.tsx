import { useState, useEffect, useRef } from "react";
import type { Metrics } from "../lib/metrics";
import "./OvertimeCalc.scss";

interface OvertimeCalcProps {
  metrics: Metrics;
}

// 월 의무 초과분은 통상시급 1배로 정산 (가산 없음)
const OVERTIME_MULTIPLIER = 1;

const won = (v: number) =>
  `${new Intl.NumberFormat("ko-KR").format(Math.round(v))}원`;
const hoursText = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
};

/** 우하단 고정 버튼 → 네오닷 쉼/출근 시 연장근로 수당 계산기 (시급은 저장하지 않음). */
export function OvertimeCalc({ metrics }: OvertimeCalcProps) {
  const [open, setOpen] = useState(false);
  const [wage, setWage] = useState(""); // 숫자만 보관
  const ref = useRef<HTMLDivElement>(null);

  // 민감 정보(시급)는 닫으면 즉시 초기화
  useEffect(() => {
    if (!open) setWage("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const wageNum = Number(wage) || 0;
  const wageDisplay = wage ? Number(wage).toLocaleString("ko-KR") : "";
  const restHours = metrics.flexIfRest / 3600;
  const workHours = metrics.flexIfWork / 3600;
  const restPay = restHours * wageNum * OVERTIME_MULTIPLIER;
  const workPay = workHours * wageNum * OVERTIME_MULTIPLIER;
  const extra = workPay - restPay;

  return (
    <div className="otc no-shot" ref={ref}>
      {open && (
        <div
          className="otc-panel"
          role="dialog"
          aria-label="연장근로 수당 계산기"
        >
          <div className="otc-panel__head">
            <h3 className="otc-panel__title">연장근로 수당 계산기</h3>
            <button
              type="button"
              className="otc-panel__close"
              onClick={() => setOpen(false)}
              aria-label="닫기"
            >
              ✕
            </button>
          </div>

          <label className="otc-field">
            <span className="otc-field__label">내 시급 (통상시급)</span>
            <span className="otc-field__input">
              <input
                type="text"
                inputMode="numeric"
                placeholder="예: 20,000"
                value={wageDisplay}
                onChange={(e) =>
                  setWage(e.target.value.replace(/[^0-9]/g, ""))
                }
                autoFocus
              />
              <em>원</em>
            </span>
          </label>

          <div className="otc-results">
            <div className="otc-card otc-card--rest">
              <span className="otc-card__label">네오닷 쉬면</span>
              <span className="otc-card__hours">
                {hoursText(metrics.flexIfRest)}
              </span>
              <span className="otc-card__pay">{won(restPay)}</span>
            </div>
            <div className="otc-card otc-card--work">
              <span className="otc-card__label">네오닷 출근하면</span>
              <span className="otc-card__hours">
                {hoursText(metrics.flexIfWork)}
              </span>
              <span className="otc-card__pay">{won(workPay)}</span>
            </div>
          </div>

          {metrics.neoDotDaysAhead > 0 && extra > 0 && (
            <div className="otc-extra">
              네오닷 출근 시 <strong>{won(extra)}</strong> 더 받아요
            </div>
          )}

          <p className="otc-note">
            월 의무 초과분 × 시급 (가산 없이 1배, 휴가 인정분 제외)
            <br />
            시급은 저장되지 않아요.
          </p>
        </div>
      )}

      <button
        type="button"
        className={`otc-fab ${open ? "is-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="연장근로 수당 계산기"
      >
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="2.5" width="16" height="19" rx="2.5" stroke="#fff" strokeWidth="1.6" />
          <rect x="7" y="5" width="10" height="4" rx="1" fill="#fff" />
          <g fill="#fff">
            <circle cx="8.5" cy="13" r="1.1" />
            <circle cx="12" cy="13" r="1.1" />
            <circle cx="15.5" cy="13" r="1.1" />
            <circle cx="8.5" cy="17" r="1.1" />
            <circle cx="12" cy="17" r="1.1" />
            <circle cx="15.5" cy="17" r="1.1" />
          </g>
        </svg>
      </button>
    </div>
  );
}
