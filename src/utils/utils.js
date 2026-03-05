export const isValidReviewerFeedback = (note, author) =>
    // A valid note for feedback time, is a note created by another team member, non system, unless is the one about approving a MR.
    (!note.system && note.author.name !== author) ||
    (note.author.name !== author &&
    (note.body.includes('approved this merge request') || note.body.includes('unapproved this merge request'))
);