import * as metrics from "./metrics.js";
import { formatTime } from "../utils/timeUtils.js";

export const buildFlowSnapshot = ({
  rollingWindowMrs,
  currentPeriodMrs,
}) => {

  const openMrs = rollingWindowMrs.filter(
    mr => mr.state === "opened"
  );

  // 90 day baseline
  const cycleTime90d =
    metrics.calculateReviewCycleStats(
      rollingWindowMrs
    );

  // weekly performance
  const weeklyCycleTime =
    metrics.calculateReviewCycleStats(
      currentPeriodMrs
    );

  // trend vs baseline
  const cycleTrend =
    (weeklyCycleTime.medianRaw ?? 0) -
    (cycleTime90d.medianRaw ?? 0);

  const pickupTime =
    metrics.calculatePickupTimeStats(
      currentPeriodMrs
    );

  const reviewTime =
    metrics.calculateReviewTimeStats(
      currentPeriodMrs
    );

  const waitingForReview =
    metrics.calculateWaitingForReview(
      openMrs
    );

  return {
    flow: {
      cycleTime: {
        baseline90d: cycleTime90d,
        weekly: weeklyCycleTime,
        trend: formatTime(cycleTrend)
      },
      pickupTime,
      reviewTime,
      waitingForReview
    },
  }
};


export const buildReviewersSnapshot = ({
  mrs,
  devScopes
}) => {

  const reviewerMetrics =
    metrics.calculateReviewerMetrics(
      mrs,
      devScopes
    );

  return {
    reviewerMetrics
  }
};