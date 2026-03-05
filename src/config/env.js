export const params = {
  token: process.env.GITLAB_TOKEN,
  url: process.env.GITLAB_URL,
  projectIds: process.env.PROJECT_IDS.split(','),
  eligibleAuthors: process.env.ELIGIBLE_AUTHORS.split(','),
  requiredApprovals: Number(process.env.REQ_APPS) || 2
};