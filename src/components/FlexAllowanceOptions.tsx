import { formatSec } from "../utils/format";

interface FlexAllowanceOptionsProps {
  flexIfRest: number;
  flexIfWork: number;
}

export function FlexAllowanceOptions({
  flexIfRest,
  flexIfWork,
}: FlexAllowanceOptionsProps) {
  return (
    <div className="neodot__flex">
      <span className="neodot__flex-title">Flex 수당 기준 시간</span>
      <div className="neodot__choices">
        <div className="choice choice--rest">
          <span className="choice__label">네오닷 쉬면</span>
          <strong className="choice__value">
            {flexIfRest > 0 ? formatSec(flexIfRest) : "수당 없음"}
          </strong>
        </div>
        <div className="choice choice--work">
          <span className="choice__label">출근하면</span>
          <strong className="choice__value">{formatSec(flexIfWork)}</strong>
        </div>
      </div>
    </div>
  );
}
