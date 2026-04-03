import * as metrics from "./metrics.js";
import { formatTime } from "../utils/timeUtils.js";
import dayjs from "dayjs";

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

export const buildStorageSnapshot = ({
  snapshot,
  startDate,
  endDate
}) => {

  const storageSnapshot = {
    generatedAt: dayjs().format("YYYY-MM-DD"),
    periodStart: startDate.toISOString(),
    periodEnd: endDate.toISOString(),
    flow: {},
    reviewers: {}
  };

  Object.entries(snapshot)
    .filter(([key]) => key !== "reviewers")
    .forEach(([repo, data]) => {

      storageSnapshot.flow[repo] = {
        cycleTimeWeekly: data.flow.cycleTime.weekly.milliseconds,
        cycleTimeBaseline: data.flow.cycleTime.baseline90d.milliseconds,
        pickupTime: data.flow.pickupTime.milliseconds,
        reviewTime: data.flow.reviewTime.milliseconds,
        waitingForReview: data.flow.waitingForReview.number
      };

    });


  const reviewerMetrics = snapshot.reviewers?.reviewerMetrics || {};

  Object.entries(reviewerMetrics).forEach(([dev, data]) => {

    storageSnapshot.reviewers[dev] = {
      repos: data.repos, 
      participationRate: data.participationRate,
      avgResponseTime: data.average.milliseconds,
      total: data.total,
      interacted: data.interacted
    };

  });

  return storageSnapshot;
};