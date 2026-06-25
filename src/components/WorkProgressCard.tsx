import { formatSec } from "../utils/format";

interface WorkProgressCardProps {
  actualWorkSec: number;
  contractHour: number;
  vacationPaySec: number;
  workPct: number;
  workFill: number;
  vacFill: number;
  isDone: boolean;
}

export function WorkProgressCard({
  actualWorkSec,
  contractHour,
  vacationPaySec,
  workPct,
  workFill,
  vacFill,
  isDone,
}: WorkProgressCardProps) {
  return (
    <div className="work__progress-card">
      <div className="work__amount">
        <span className="work__label">월 의무 진행률</span>
        <div className="work__numbers">
          <strong className="work__actual">{formatSec(actualWorkSec)}</strong>
          <span className="work__target">/ {contractHour}시간</span>
          <span className={`work__pct ${isDone ? "work__pct--done" : ""}`}>
            {workPct}%
          </span>
        </div>
      </div>

      <div className="progress-bar">
        <div className="progress-bar__track">
          <div
            className="progress-bar__fill progress-bar__fill--work"
            style={{ width: `${workFill}%` }}
          />
          {vacationPaySec > 0 && (
            <div
              className="progress-bar__fill progress-bar__fill--vacation"
              style={{ width: `${vacFill}%`, left: `${workFill}%` }}
            />
          )}
        </div>
        <div className="progress-bar__scale">
          <span>0</span>
          <span>의무 {contractHour}h</span>
        </div>
      </div>
    </div>
  );
}
