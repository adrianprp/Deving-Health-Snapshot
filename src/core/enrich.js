import { calcTimeDifference } from "../utils/timeUtils.js";
import { isValidReviewerFeedback } from "../utils/utils.js";
import { params } from "../config/env.js";

export const enrichMergeRequests = (mrs) => {
  return mrs.map(mr => {
    const approvalTimestamp = getApprovalTimestamp(mr.notes);

    const reviewCycleDuration = calcTimeDifference(
      mr.createdAt,
      approvalTimestamp ?? mr.mergedAt ?? null,
      mr.author.name
    );

    const firstNonAuthorNoteAt = getFirstNoteAt(mr.notes, mr.author.name);
    const reviewers = extractReviewers(mr.notes);

    return {
      ...mr,
      firstNonAuthorNoteAt,
      approvalTimestamp,
      reviewCycleDuration,
      reviewers
    };
  });
};

const getFirstNoteAt = (notes, author) => {
  const validNotes = notes
    .filter(note => isValidReviewerFeedback(note, author))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  return validNotes[0]?.created_at ?? null;
};

const getApprovalTimestamp = (notes) => {
  if (!Array.isArray(notes)) return null;

  const sortedNotes = [...notes].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  );

  let approvalCount = 0;
  for (const note of sortedNotes) {
    if (note.body.includes('approved this merge request')) approvalCount++;
    if (note.body.includes('unapproved this merge request')) approvalCount--;
    if (approvalCount >= params.gitlab.requiredApprovals) return note.created_at;
  }

  return null;
};

const extractReviewers = (notes) => {
  return [
    ...new Set(
      notes
        .filter(note =>
          !note.system ||
          note.body.includes('approved this merge request') ||
          note.body.includes('unapproved this merge request')
        )
        .map(note => note.author.name)
    )
  ];
};

const REOPEN_SOURCE_STATUSES = new Set([
  'done', 'testing on stage', 'on stage', 'test passed on stage',
  'testing on prod', 'prod testing', 'ready for deployment'
]);

const REOPEN_TARGET_STATUSES = new Set([
  'in progress', 'open', 'reopened', 'to do', 'backlog'
]);
export const enrichTickets = (tickets) =>
  tickets.map(ticket => ({
    key:           ticket.key,
    summary:       ticket.summary,
    estimateHours: ticket.estimateHours,
    actualHours:   ticket.actualHours,
    status:        ticket.status,
    changelog:     ticket.changelog,
    ...extractReopenInfo(ticket.changelog)
  }));

const extractReopenInfo = (changelog) => {
  const reopens = [];

  for (const history of changelog?.histories || []) {
    for (const item of history.items || []) {
      if (item.field !== 'status') continue;
      const from = item.fromString?.trim().toLowerCase();
      const to   = item.toString?.trim().toLowerCase();
      if (REOPEN_SOURCE_STATUSES.has(from) && REOPEN_TARGET_STATUSES.has(to)) {
        reopens.push({ date: history.created, from: item.fromString, to: item.toString });
      }
    }
  }

  return {
    wasReopened:    reopens.length > 0,
    reopenCount:    reopens.length,
    lastReopenDate: reopens.at(-1)?.date ?? null
  };
};