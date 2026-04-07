import { calcTimeDifference } from "../utils/timeUtils.js";
import { isValidReviewerFeedback } from "../utils/utils.js"
import { params } from "../config/env.js";


export const enrichMergeRequests = (mrs) => {

  return mrs.map(mr => {

    const approvalTimestamp = getApprovalTimestamp(
      mr.notes
    );

    const reviewDoneTimestamp = calcTimeDifference(
      mr.createdAt,
      approvalTimestamp ?? mr.mergedAt ?? null,
      mr.author.name
    );

    const firstNonAuthorNoteAt = getFirstNoteAt(
      mr.notes,
      mr.author.name
    );

    const reviewers = extractReviewers(
      mr.notes
    )

    return {
      ...mr,
      firstNonAuthorNoteAt,
      approvalTimestamp,
      reviewDoneTimestamp,
      reviewers
    };
  });
};

const getFirstNoteAt = (notes ,author) => {
  const validNotes = notes
    .filter(note => isValidReviewerFeedback(note, author))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const firstValidNote = validNotes[0];
  return firstValidNote?.created_at ?? null
}

const getApprovalTimestamp = (notes) => {

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

    if (approvalCount >= params.gitlab.requiredApprovals) {
      return note.created_at;
    }
  }

  return null;
};

const extractReviewers = (notes) => {
  return [
    ...new Set(
      notes
        .filter( note => 
          !note.system || 
          note.body.includes('approved this merge request') || 
          note.body.includes('unapproved this merge request')
        ) 
        .map(note => note.author.name)
      )
    ];
};