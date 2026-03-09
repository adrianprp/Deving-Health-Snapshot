import * as metrics from "./metrics.js";
import { formatTime } from "../utils/timeUtils.js";

export const buildSnapshot = ({
  currentPeriodMrs,
  rollingWindowMrs,
  rollingWindowExcludingCurrentMrs,
  reviewers,
  startDate,
  endDate
}) => {
  const windowAvgExcludingCurrent =
    metrics.calculateAverageReviewCycleTime(
      rollingWindowExcludingCurrentMrs
    );

  const fullWindowAvg =
    metrics.calculateAverageReviewCycleTime(
      rollingWindowMrs
    );

  const delta =
    fullWindowAvg - windowAvgExcludingCurrent;

  const avgFeedback =
    metrics.calculateAverageFeedbackTime(
      currentPeriodMrs
    );

  const reviewerResponse =
    metrics.calculateReviewerResponseTime(
      currentPeriodMrs,
      reviewers
    );

  return {
    period: `${startDate.format("dddd, MMMM D")} - ${endDate.format("dddd, MMMM D")}`,
    reviewCycleTime90days: formatTime(fullWindowAvg),
    reviewCycleTrend: formatTime(delta),
    averageFeedbackTime: formatTime(avgFeedback),
    reviewerResponseTimes: reviewerResponse
  };
};