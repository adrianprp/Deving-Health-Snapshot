import { calcTimeDifference } from "../utils/timeUtils.js";
import { isValidReviewerFeedback } from "../utils/utils.js"

export const enrichMergeRequests = (mrs, requiredApprovals) => {

  return mrs.map(mr => {

    const approvalTimestamp = getApprovalTimestamp(
      mr.notes,
      requiredApprovals
    );

    const reviewCycleTime = calcTimeDifference(
      mr.createdAt,
      approvalTimestamp ?? mr.mergedAt,
      mr.author.name
    );

    const firstNonAuthorCommentAt = getFirstCommentAt(
      mr.notes,
      mr.author.name
    );

    return {
      ...mr,
      firstNonAuthorCommentAt,
      approvalTimestamp,
      reviewCycleTime
    };

  });
};

const getFirstCommentAt = (notes ,author) => {

  const validNotes = notes
    .filter(note => isValidReviewerFeedback(note, author))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const firstValidNote = validNotes[0];
  return firstValidNote?.created_at ?? null
}

const getApprovalTimestamp = (notes, requiredApprovals) => {

  if (!Array.isArray(notes)) return null;

  const sortedNotes =
    [...notes].sort(
      (a,b) =>
        new Date(a.created_at) -
        new Date(b.created_at)
    );

  let approvalCount = 0;
  for (const note of sortedNotes) {

    if ( note.body.includes("approved this merge request")) {
      approvalCount++;
    }

    if (note.body.includes("unapproved this merge request")) {
      approvalCount--;
    }

    if (approvalCount >= requiredApprovals) {
      return note.created_at;
    }
  }

  return null;
};