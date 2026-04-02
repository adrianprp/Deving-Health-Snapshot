export const isValidReviewerFeedback = (note, author) =>
    // A valid note for feedback time, is a note created by another team member, non system, unless is the one about approving a MR.
    (!note.system && note.author.name !== author) ||
    (note.author.name !== author &&
    (note.body.includes('approved this merge request') || note.body.includes('unapproved this merge request'))
);

export const groupByRepo = (mrs) => {
  return mrs.reduce((acc, mr) => {
    if (!acc[mr.projectId]) {
      acc[mr.projectId] = [];
    }

    acc[mr.projectId].push(mr);

    return acc;
  }, {});
};

export const buildDevScopes = (mrs) => {
  const scopes = {};

  const addDev = (dev) => {
    if (!scopes[dev]) {
      scopes[dev] = new Set();
    }
  };

  mrs.forEach(mr => {
    const { projectId, author, reviewers } = mr;

    // author contributes
    const authorName = author.name;
    addDev(authorName);
    scopes[authorName].add(projectId);

    // reviewers contribute
    reviewers.forEach(dev => {
      addDev(dev);
      scopes[dev].add(projectId);
    });
  });

  Object.keys(scopes).forEach(dev => {
    scopes[dev] = Array.from(scopes[dev]);
  });

  return scopes;
};