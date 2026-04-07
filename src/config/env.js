'use strict'
import { emailToName } from '../utils/utils.js';

export const params = {
  users: process.env.USERS.split(','),
  gitlab : {
    token: process.env.GITLAB_TOKEN,
    url: process.env.GITLAB_URL,
    projectIds: process.env.PROJECT_IDS.split(','),
    flowIds: process.env.FLOW_IDS.split(','),
    requiredApprovals: Number(process.env.REQ_APPS) || 2,
  },
  jira: {
    domain: process.env.JIRA_DOMAIN,
    email: process.env.JIRA_EMAIL,
    token: process.env.JIRA_TOKEN,
    projectKey: process.env.JIRA_PROJECT_KEY,
  }
};

export const USERS = params.users.map(u => emailToName(u));