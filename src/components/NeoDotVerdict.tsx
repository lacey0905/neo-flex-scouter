import { formatSec } from "../utils/format";

interface NeoDotVerdictProps {
  canRestNeoDot: boolean;
  needSec: number;
  neoDotDate: string | null;
}

export function NeoDotVerdict({ canRestNeoDot, needSec, neoDotDate }: NeoDotVerdictProps) {
  const neoLabel = neoDotDate ? formatNeoLabel(neoDotDate) : null;

  return (
    <div className={`verdict verdict--${canRestNeoDot ? "yes" : "no"}`}>
      <div className="verdict__body">
        <span className="verdict__label">네오닷 판단</span>
        {canRestNeoDot ? (
          <strong className="verdict__title">네오닷은 쉴 수 있어요</strong>
        ) : (
          <strong className="verdict__title">
            <span className="verdict__amount">{formatSec(needSec)}</span> 더 채워야 해요
          </strong>
        )}
        <p className="verdict__desc">
          {neoLabel ? `네오닷(${neoLabel}) ` : "네오닷 "}
          {canRestNeoDot
            ? "전날 기준으로 의무 시간을 넘길 수 있어요."
            : "전날까지 이만큼 더 채우면 쉴 수 있어요."}
        </p>
      </div>
    </div>
  );
}

function formatNeoLabel(date: string): string {
  const [, m, d] = date.split("-");
  return `${Number(m)}/${Number(d)}`;
}
