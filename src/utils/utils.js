import dayjs from "dayjs";

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

export const emailToName = (email) => {
  if (!email) return null;

  const [local] = email.split('@');

  return local
    .split('.')
    .map(part =>
      part.charAt(0).toUpperCase() + part.slice(1)
    )
    .join(' ');
};

export const buildUnifiedDevs = ({ reviewers, estimations }) => {

  const devs = {};

  Object.entries(reviewers).forEach(([name, reviewData]) => {
    devs[name] = {
      review: reviewData,
      estimation: null
    };
  });
  
  estimations.forEach(dev => {
    const { name, ...estimationData } = dev;

    if (!devs[name]) {
      devs[name] = {
        review: null,
        estimation: estimationData
      };
    } else {
      devs[name].estimation = estimationData;
    }
  });

  return devs;
};


export const buildStorage = ({
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