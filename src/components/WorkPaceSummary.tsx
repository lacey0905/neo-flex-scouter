import { formatSignedSec } from "../utils/format";

interface WorkPaceSummaryProps {
  savedSec: number;
  elapsedWorkdays: number;
}

export function WorkPaceSummary({
  savedSec,
  elapsedWorkdays,
}: WorkPaceSummaryProps) {
  const statusText = savedSec >= 0 ? "여유 있어요" : "부족해요";

  return (
    <div className="work__hero">
      <span className="work__hero-label">이번 달 페이스</span>
      <p className="work__headline">
        <strong>{formatSignedSec(savedSec)}</strong>
        <span>{statusText}</span>
      </p>
      <p className="work__subcopy">
        {elapsedWorkdays}일 근무 기준, 하루 8시간 대비 누적이에요.
      </p>
    </div>
  );
}
