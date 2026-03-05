import * as metrics from "./metrics.js";
import { formatTime } from "../utils/timeUtils.js";

export const buildSnapshot = ({
  yearToDateMrs,
  currentWeekMrs,
  reviewers,
  startDate,
  endDate
}) => {

  const avgYtd =
    metrics.calculateAverageReviewCycleTime(
      yearToDateMrs
    );

  const avgFeedback =
    metrics.calculateAverageFeedbackTime(
      currentWeekMrs
    );

  const reviewerResponse =
    metrics.calculateReviewerResponseTime(
      currentWeekMrs,
      reviewers
    );

  return {
    period: `${startDate.format("dddd, MMMM D")} - ${endDate.format("dddd, MMMM D")}`,
    averageTimeYearToDate: formatTime(avgYtd),
    averageFeedbackTime: formatTime(avgFeedback),
    reviewerResponseTimes: reviewerResponse
  };
};