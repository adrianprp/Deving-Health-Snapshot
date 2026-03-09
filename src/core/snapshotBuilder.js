import * as metrics from "./metrics.js";
import { formatTime } from "../utils/timeUtils.js";

export const buildSnapshot = ({
  openMrs,
  currentPeriodMrs,
  rollingWindowMrs,
  reviewers,
  startDate,
  endDate
}) => {
  console.log(currentPeriodMrs);
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

  const reviewerResponse =
    metrics.calculateReviewerResponseTime(
      currentPeriodMrs,
      reviewers
    );

  const waitingForReview =
    metrics.calculateWaitingForReview(
      openMrs
    );

  return {
    period: `${startDate.format("dddd, MMMM D")} - ${endDate.format("dddd, MMMM D")}`,
    reviewCycleTime90days: formatTime(cycleTime90d),
    reviewCycleTimeWeekly: formatTime(weeklyCycleTime),
    reviewCycleTrend: formatTime(cycleTrend),
    averagePickupTime: formatTime(avgPickupTime),
    avgReviewTime: formatTime(avgReviewTime),
    waitingForReview,
    reviewerResponseTimes: reviewerResponse
  };
};