import type { Metrics } from "../lib/metrics";
import { FlexAllowanceOptions } from "./FlexAllowanceOptions";
import { NeoDotVerdict } from "./NeoDotVerdict";
import "./NeoDotAnalysis.scss";

interface NeoDotAnalysisProps {
  metrics: Metrics;
}

export function NeoDotAnalysis({ metrics }: NeoDotAnalysisProps) {
  const {
    contractSec,
    canRestNeoDot,
    projectedRecognizedWithoutNeoDot,
    flexIfRest,
    flexIfWork,
    neoDotDate,
  } = metrics;
  const needSec = Math.max(contractSec - projectedRecognizedWithoutNeoDot, 0);

  return (
    <div className="neodot">
      <NeoDotVerdict
        canRestNeoDot={canRestNeoDot}
        needSec={needSec}
        neoDotDate={neoDotDate}
      />
      <FlexAllowanceOptions flexIfRest={flexIfRest} flexIfWork={flexIfWork} />
    </div>
  );
}
