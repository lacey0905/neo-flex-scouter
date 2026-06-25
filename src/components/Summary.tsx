import type { Metrics } from "../lib/metrics";
import { useCaptureImage } from "../hooks/useCaptureImage";
import { CaptureButton } from "./CaptureButton";
import { WorkStatus } from "./WorkStatus";
import { NeoDotAnalysis } from "./NeoDotAnalysis";
import "./Summary.scss";

interface SummaryProps {
  metrics: Metrics;
}

export function Summary({ metrics }: SummaryProps) {
  const { ref, copy, canCopy } = useCaptureImage<HTMLDivElement>();

  return (
    <section className="summary" ref={ref}>
      <CaptureButton copy={copy} canCopy={canCopy} />
      <NeoDotAnalysis metrics={metrics} />
      <WorkStatus metrics={metrics} />
    </section>
  );
}
