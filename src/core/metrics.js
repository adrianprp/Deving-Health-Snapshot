import { isValidReviewerFeedback } from "../utils/utils.js";
import { calcTimeDifference, formatTime } from "../utils/timeUtils.js";
import { params, USERS } from "../config/env.js";

/* ---- UTILS ---- */

export const average = (arr) => {
  const valid = arr.filter(v => v != null);
  if (!valid.length) return 0;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
};

export const percentile = (arr, p) => {
  const valid = arr.filter(v => v != null).sort((a, b) => a - b);
  if (!valid.length) return 0;

  const index = (valid.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) return valid[lower];

  return valid[lower] + (valid[upper] - valid[lower]) * (index - lower);
};

export const median = (arr) => percentile(arr, 0.5);
export const p90 = (arr) => percentile(arr, 0.9);

/* ---- GITLAB ---- */

export const calculateReviewCycleStats = (mrs) => {
  const times = mrs.map(mr => mr.reviewCycleDuration);

  return {
    median: formatTime(median(times)),
    p90: formatTime(p90(times)),
    average: formatTime(average(times)),
    medianRaw: median(times)
  };
};

export const calculatePickupTimeStats = (mrs) => {
  const times = mrs.map(mr =>
    calcTimeDifference(
      mr.createdAt,
      mr.firstNonAuthorNoteAt,
      mr.author.name
    )
  );

  return {
    median: formatTime(median(times)),
    p90: formatTime(p90(times)),
    average: formatTime(average(times)),
    medianRaw: median(times)
  };
};

export const calculateReviewTimeStats = (mrs) => {
  const times = mrs.map(mr =>
    calcTimeDifference(
      mr.firstNonAuthorNoteAt,
      mr.approvalTimestamp ?? mr.mergedAt,
      mr.author.name
    )
  );
  return {
    median: formatTime(median(times)),
    p90: formatTime(p90(times)),
    average: formatTime(average(times)),
    medianRaw: median(times),
  };
};

export const calculateWaitingForReview = (mrs) => {
  const culprits = mrs
  .filter(mr =>
    mr.state === "opened" &&
    !mr.isDraft &&
    !mr.firstNonAuthorNoteAt
  ).map(mr => mr.url);
  const number = culprits.length;
  return { number, culprits };
};

export const calculateReviewerMetrics = (
  mergeRequests,
  devScopes
) => {

  const responseData = {};

  USERS.forEach(reviewer => {

    const reviewerRepos = devScopes[reviewer] || [];

    const scopedMrs = mergeRequests.filter(
      mr =>
        reviewerRepos.includes(mr.projectId) &&
        mr.author.name !== reviewer
    );

    const times = [];

    scopedMrs.forEach(mr => {

      const reviewerNotes = mr.notes
        .filter(note =>
          isValidReviewerFeedback(note, mr.author.name) &&
          note.author.name === reviewer
        )
        .sort((a, b) =>
          new Date(a.created_at) -
          new Date(b.created_at)
        );

      if (reviewerNotes.length) {

        const responseTime = calcTimeDifference(
          mr.createdAt,
          reviewerNotes[0].created_at,
          reviewer
        );

        times.push(responseTime);

      } else {
        times.push(null);
      }

    });

    const validTimes = times.filter(t => t != null);

    responseData[reviewer] = {
      repos: reviewerRepos,
      total: scopedMrs.length,
      interacted: validTimes.length,
      participationRate:
        scopedMrs.length
          ? validTimes.length / scopedMrs.length
          : 0,
      median:
        validTimes.length
          ? formatTime(median(validTimes))
          : null,
      p90:
        validTimes.length
          ? formatTime(p90(validTimes))
          : null,
      average:
        validTimes.length
          ? formatTime(average(validTimes))
          : null,
    };

  });

  return responseData;
};


/* ---- JIRA ---- */

export const calculateEstimateAccuracy = (issues) => {
  const devStats = {};
  const taskDetails = [];

  issues.forEach(issue => {
    const dev = issue.developer || 'Unknown';

    if (!devStats[dev]) {
      devStats[dev] = {
        total: 0,
        withEstimate: 0,
        withoutEstimate: 0,
        withinKpi: 0,
        majorMisses: 0,
        deviations: []
      };
    }

    const stat = devStats[dev];

    const estimate = issue.estimateHours;
    const actual = issue.actualHours;

    stat.total++;

    let deviation = null;
    let status = 'NO_ESTIMATE';

    if (!estimate || estimate === 0) {
      stat.withoutEstimate++;
    } else {
      stat.withEstimate++;

      deviation = Math.abs(actual - estimate) / estimate;
      stat.deviations.push(deviation);

      if (deviation <= 0.2) {
        stat.withinKpi++;
        status = 'OK';
      } else if (deviation > 0.5) {
        stat.majorMisses++;
        status = 'MAJOR_MISS';
      } else {
        status = 'MINOR_MISS';
      }
    }

    taskDetails.push({
      key: issue.key,
      summary: issue.summary,
      developer: dev,
      estimate,
      actual,
      deviation: deviation !== null ? Number((deviation * 100).toFixed(1)) : null,
      status
    });
  });

  const devMetrics = Object.entries(devStats).map(([dev, s]) => {
    const kpi = s.withEstimate
      ? (s.withinKpi / s.withEstimate) * 100
      : 0;

  const deviations = s.deviations;

  const avgDev = deviations.length
    ? average(deviations) * 100
    : 0;

  const medianDev = deviations.length
    ? median(deviations) * 100
    : 0;

  const p90Dev = deviations.length
    ? p90(deviations) * 100
    : 0;

    return {
      developer: dev,
      kpi: Number(kpi.toFixed(1)),
      total: s.total,
      withEstimate: s.withEstimate,
      withoutEstimate: s.withoutEstimate,
      majorMisses: s.majorMisses,
      deviation: {
        medianDev: Number(medianDev.toFixed(1)),
        p90Dev: Number(p90Dev.toFixed(1)),
        avgDev: Number(avgDev.toFixed(1))
      }
    };
  });

  return {
    devMetrics,
    taskDetails
  };
};