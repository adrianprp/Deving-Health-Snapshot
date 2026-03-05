import { isValidReviewerFeedback } from "../utils/utils.js";
import { calcTimeDifference, formatTime } from "../utils/timeUtils.js"

export const average = (arr) => {
  const valid = arr.filter(v => v != null);
  if (!valid.length) return 0;
  return valid.reduce((a,b)=> a+b, 0) / valid.length;
};


export const calculateAverageReviewCycleTime = (mrs) =>
  average(mrs.map(mr => mr.reviewCycleTime));


export const calculateAverageFeedbackTime = (
  mrs
) => {
  return average(
    mrs
      .filter(mr => mr.firstNonAuthorCommentAt)
      .map(mr => {
       return calcTimeDifference(
          mr.createdAt,
          mr.firstNonAuthorCommentAt,
          mr.author.name
        )
      })
  );
}

export const calculateReviewerResponseTime = (
  mergeRequests,
  reviewers
) => {

  const responseData = reviewers.reduce((acc, reviewer) => {

    const totalReviews =
      mergeRequests.filter(
        mr => mr.author.name !== reviewer
      ).length;

    acc[reviewer] = {
      times: [],
      total: totalReviews,
      interacted: 0,
      participationRate: 0,
      average: 0
    };

    return acc;

  }, {});


  mergeRequests.forEach(mr => {

    reviewers.forEach(reviewer => {

      if (mr.author.name === reviewer) return;

      const reviewerNotes = mr.notes
        .filter(note =>
          isValidReviewerFeedback(note, mr.author.name) &&
          note.author.name === reviewer
        )
        .sort((a,b) =>
          new Date(a.created_at) -
          new Date(b.created_at)
        );

      if (reviewerNotes.length) {

        const responseTime = calcTimeDifference(
          mr.createdAt,
          reviewerNotes[0].created_at,
          reviewer
        );

        responseData[reviewer].times.push(responseTime);

      } else {

        responseData[reviewer].times.push(null);

      }

    });

  });


  Object.keys(responseData).forEach(reviewer => {

    const validTimes =
      responseData[reviewer].times.filter(
        t => t != null
      );

    responseData[reviewer].interacted = validTimes.length;

    responseData[reviewer].average =
      formatTime(average(validTimes));

    responseData[reviewer].participationRate =
      responseData[reviewer].total
        ? validTimes.length /
          responseData[reviewer].total
        : 0;

  });

  return responseData;

};