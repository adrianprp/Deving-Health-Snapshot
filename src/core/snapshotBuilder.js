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
    metrics.calculateAverageReviewCycleTime(
      rollingWindowMrs
    );

  // weekly performance
  const weeklyCycleTime =
    metrics.calculateAverageReviewCycleTime(
      currentPeriodMrs
    );

  // trend vs baseline
  const cycleTrend =
    weeklyCycleTime - cycleTime90d;

  const avgPickupTime =
    metrics.calculateAveragePickupTime(
      currentPeriodMrs
    );

  const avgReviewTime =
    metrics.calculateAverageReviewTime(
      currentPeriodMrs
    );

  const waitingForReview =
    metrics.calculateWaitingForReview(
      openMrs
    );

  return {
    flow: {
      cycleTime: {
        baseline90d: formatTime(cycleTime90d),
        weekly: formatTime(weeklyCycleTime),
        trend: formatTime(cycleTrend)
      },
      pickupTime: formatTime(avgPickupTime),
      reviewTime: formatTime(avgReviewTime),
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


