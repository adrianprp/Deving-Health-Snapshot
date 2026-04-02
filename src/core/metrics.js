import { isValidReviewerFeedback } from "../utils/utils.js";
import { calcTimeDifference, formatTime } from "../utils/timeUtils.js"
import { params } from "../config/env.js";

export const average = (arr) => {
  const valid = arr.filter(v => v != null);
  if (!valid.length) return 0;
  return valid.reduce((a,b)=> a+b, 0) / valid.length;
};

export const calculateAverageReviewCycleTime = (mrs) =>
  average(mrs.map(mr => mr.reviewDoneTimestamp));


export const calculateAveragePickupTime = (mrs) => { 
  return average(
    mrs.map(mr => 
          calcTimeDifference(
          mr.createdAt,
          mr.firstNonAuthorNoteAt,
          mr.author.name
        )
      )
  );
}

export const calculateAverageReviewTime = (mrs) => { 
  return average(
    mrs.map(mr => 
          calcTimeDifference(
          mr.firstNonAuthorNoteAt,
          mr.approvalTimestamp ?? mr.mergedAt,
          mr.author.name
        )
      )
  );
}

export const calculateWaitingForReview = (mrs) => {
  const culprits = mrs
  .filter(mr =>
    mr.state === "opened" &&
    !mr.isDraft &&
    !mr.firstNonAuthorNoteAt
  ).map(mr => mr.url);
  const number = culprits.length;
  return { number, culprits }
};

export const calculateReviewerMetrics = (
  mergeRequests,
  devScopes
) => {

  const responseData = {};

  params.eligibleAuthors.forEach(reviewer => {

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
      average:
        validTimes.length
          ? formatTime(average(validTimes))
          : null
    };

  });

  return responseData;
};