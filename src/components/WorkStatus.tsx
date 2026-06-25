import type { Metrics } from "../lib/metrics";
import { pct } from "../utils/format";
import { WorkMetricChips } from "./WorkMetricChips";
import { WorkPaceSummary } from "./WorkPaceSummary";
import { WorkProgressCard } from "./WorkProgressCard";
import "./WorkStatus.scss";

interface WorkStatusProps {
  metrics: Metrics;
}

export function WorkStatus({ metrics }: WorkStatusProps) {
  const {
    savedSec,
    elapsedWorkdays,
    actualWorkSec,
    contractHour,
    contractSec,
    vacationPaySec,
    remainSec,
    remainDays,
  } = metrics;

  const workPct = pct(actualWorkSec, contractSec);
  const workFill = Math.min(workPct, 100);
  const vacFill = Math.min(pct(vacationPaySec, contractSec), 100);
  const isDone = workPct >= 100;
  const status = savedSec >= 0 ? "plus" : "minus";

  return (
    <div className={`work work--${status}`}>
      <WorkPaceSummary savedSec={savedSec} elapsedWorkdays={elapsedWorkdays} />
      <WorkProgressCard
        actualWorkSec={actualWorkSec}
        contractHour={contractHour}
        vacationPaySec={vacationPaySec}
        workPct={workPct}
        workFill={workFill}
        vacFill={vacFill}
        isDone={isDone}
      />
      <WorkMetricChips
        remainSec={remainSec}
        remainDays={remainDays}
        vacationPaySec={vacationPaySec}
      />
    </div>
  );
}
