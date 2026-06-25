import { formatSec } from "../utils/format";

interface WorkMetricChipsProps {
  remainSec: number;
  remainDays: number;
  vacationPaySec: number;
}

export function WorkMetricChips({
  remainSec,
  remainDays,
  vacationPaySec,
}: WorkMetricChipsProps) {
  const remainText = remainSec > 0 ? formatSec(remainSec) : "의무 충족";

  return (
    <div className="work__chips">
      <div className={`work__chip ${remainSec > 0 ? "work__chip--warn" : "work__chip--good"}`}>
        <span className="work__meta-label">남은 의무</span>
        <span className="work__meta-value">{remainText}</span>
      </div>
      <div className="work__chip">
        <span className="work__meta-label">남은 근무일</span>
        <span className="work__meta-value">{remainDays}일</span>
      </div>
      {vacationPaySec > 0 && (
        <div className="work__chip work__chip--vacation">
          <span className="work__meta-label">휴가 인정</span>
          <span className="work__meta-value">{formatSec(vacationPaySec)}</span>
        </div>
      )}
    </div>
  );
}
