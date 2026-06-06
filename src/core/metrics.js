import { isValidReviewerFeedback } from "../utils/utils.js";
import { calcTimeDifference, formatTime } from "../utils/timeUtils.js";

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
  reviewerName
) => {

  const pickupTimes = [];
  const suspiciousReviews = [];

  mergeRequests.forEach(mr => {
    const reviewerNotes = mr.notes
      .filter(note =>
        isValidReviewerFeedback(note, mr.author.name) &&
        note.author.name === reviewerName
      )
      .sort((a, b) =>
        new Date(a.created_at) - new Date(b.created_at)
      );

    if (reviewerNotes.length) {
      pickupTimes.push(
        calcTimeDifference(
          mr.createdAt,
          reviewerNotes[0].created_at,
          reviewerName
        )
      );
    }


    const approvals = reviewerNotes.filter(note =>
      note.body.includes('approved this merge request')
    ).length;

    const reviewComments = reviewerNotes.filter(note =>
      !note.system &&
      !note.body.includes('approved this merge request') &&
      !note.body.includes('unapproved this merge request')
    ).length;

    if (
      mr.changesCount >= 12 &&
      approvals > 0 &&
      reviewComments === 0
    ) {
      suspiciousReviews.push({
        title: mr.title,
        url: mr.url,
        changesCount: mr.changesCount,
        reason: 'Large file-count MR approved without review comments'
      });
    }

  });
  const validTimes = pickupTimes.filter(Boolean);

  return {
    reviewedMrs: mergeRequests.length,
    suspiciousReviewCount: suspiciousReviews.length,
    suspiciousReviews,
    pickupTime: {
      median: validTimes.length
        ? formatTime(median(validTimes))
        : null,
      p90: validTimes.length
        ? formatTime(p90(validTimes))
        : null,
      average: validTimes.length
        ? formatTime(average(validTimes))
        : null
    }
  };
};


/* ---- JIRA ---- */
const DEV_DONE_STATUSES = new Set([
  'done', 'ready for dev', 'ready for deployment',
  'testing on stage', 'on stage', 'test passed on stage',
  'testing on prod', 'prod testing'
]);

const REOPEN_ELIGIBLE_STATUSES = new Set([
  'done', 'testing on stage', 'on stage',
  'test passed on stage', 'testing on prod', 'prod testing'
]);

const statusKey = (status) => (status ?? 'unknown').trim().toLowerCase();

export const calculateEstimateAccuracy = (issues) => {
  const taskDetails = issues.map(issue => {
    const { estimateHours: estimate, actualHours: actual } = issue;

    let deviation        = null;
    let estimationStatus = 'NO_ESTIMATE';

    if (estimate) {
      deviation = Math.abs(actual - estimate) / estimate;
      estimationStatus = deviation <= 0.2 ? 'OK'
                       : deviation >  0.5 ? 'MAJOR_MISS'
                       :                    'MINOR_MISS';
    }

    return {
      key:             issue.key,
      summary:         issue.summary,
      estimate,
      actual,
      deviation:       deviation !== null ? Number((deviation * 100).toFixed(1)) : null,
      estimationStatus,
      status:          issue.status ?? 'Unknown',
      developer:       issue.developer || 'Unknown'
    };
  });

  const kpiEligibleIssues = taskDetails.filter(issues => DEV_DONE_STATUSES.has(statusKey(issues.status)));
  const inProgressIssues  = taskDetails.filter(issues => !DEV_DONE_STATUSES.has(statusKey(issues.status)));

  const devStats = {};
  const registerDev = (dev) => {
    devStats[dev] ??= { total: 0, withEstimate: 0, withoutEstimate: 0, withinKpi: 0, majorMisses: 0, deviations: [] };
  };

  for (const issue of kpiEligibleIssues) {
    const { developer: dev, estimate, deviation, estimationStatus } = issue;
    registerDev(dev);
    const stats = devStats[dev];
    stats.total++;

    if (!estimate) {
      stats.withoutEstimate++;
    } else {
      stats.withEstimate++;
      stats.deviations.push(deviation !== null ? deviation / 100 : 0);
      if (estimationStatus === 'OK')         stats.withinKpi++;
      if (estimationStatus === 'MAJOR_MISS') stats.majorMisses++;
    }
  }

  for (const issue of inProgressIssues) registerDev(issue.developer);

  const devMetrics = Object.entries(devStats).map(([dev, stats]) => {
    const kpi  = stats.withEstimate ? (stats.withinKpi / stats.withEstimate) * 100 : 0;
    const devs = stats.deviations;
    return {
      developer:      dev,
      kpi:            Number(kpi.toFixed(1)),
      totalEligible:          stats.total,
      withEstimate:   stats.withEstimate,
      withoutEstimate:stats.withoutEstimate,
      majorMisses:    stats.majorMisses,
      deviation: {
        medianDev: Number((devs.length ? median(devs)   * 100 : 0).toFixed(1)),
        p90Dev:    Number((devs.length ? p90(devs)      * 100 : 0).toFixed(1)),
        avgDev:    Number((devs.length ? average(devs)  * 100 : 0).toFixed(1))
      }
    };
  });

  return { devMetrics, taskDetails: { kpiEligibleIssues, inProgressIssues } };
};

export const calculateReopenMetrics = (issues) => {
  const eligible = issues.filter(i => REOPEN_ELIGIBLE_STATUSES.has(statusKey(i.status)));
  const reopened = eligible.filter(i => i.wasReopened).map(({ key, summary }) => ({ key, summary }));

  return {
    reopenRate:     eligible.length ? Number((reopened.length / eligible.length * 100).toFixed(1)) : 0,
    totalReopened:  reopened.length,
    totalIssuesEligible:    eligible.length,
    reopenedIssues: reopened
  };
};