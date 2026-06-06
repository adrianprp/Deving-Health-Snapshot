'use strict';

import fetch from 'node-fetch';
import https from 'https';

const getEverAssignees = (changelog, currentAssigneeId) => {
  const assignees = new Set();

  if (currentAssigneeId) assignees.add(currentAssigneeId);

  for (const history of changelog?.histories || []) {
    for (const item of history.items || []) {
      if (item.field?.toLowerCase() === 'assignee' && item.to) {
        assignees.add(item.to);
      }
    }
  }

  return assignees;
};

export class JiraService {

  constructor(domain, email, token) {
    this.baseUrl = `https://${domain}`;
    this.auth    = Buffer.from(`${email}:${token}`).toString('base64');
    this.headers = {
      Accept: 'application/json',
      Authorization: `Basic ${this.auth}`,
      'Content-Type': 'application/json'
    };
    this.agent = new https.Agent({ keepAlive: true });
  }

  async safeFetch(url, options = {}, retries = 3) {
    for (let attempt = 0; attempt < retries; attempt++) {
      const res = await fetch(url, { ...options, headers: this.headers, agent: this.agent });

      if (res.status === 429) {
        const delay = res.headers.get('retry-after')
          ? parseInt(res.headers.get('retry-after')) * 1000
          : 2 ** attempt * 1000;
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      if (!res.ok) throw new Error(`Jira API error: ${res.status} — ${await res.text()}`);
      return res;
    }

    throw new Error(`Jira API failed after ${retries} retries: ${url}`);
  }

  async getAccountId(email) {
    const res   = await this.safeFetch(`${this.baseUrl}/rest/api/3/user/search?query=${encodeURIComponent(email)}`);
    const users = await res.json();
    if (!users.length) throw new Error(`No Jira user found for ${email}`);
    return users[0].accountId;
  }

  async fetchChangelog(issueKey) {
    let startAt   = 0;
    const histories = [];

    while (true) {
      const res  = await this.safeFetch(`${this.baseUrl}/rest/api/3/issue/${issueKey}/changelog?startAt=${startAt}&maxResults=100`);
      const data = await res.json();
      histories.push(...(data.values || []));
      if (data.isLast || !data.values?.length) break;
      startAt += 100;
    }

    return { histories };
  }

  async fetchWorklogs(issueKey) {
    let startAt    = 0;
    const hoursByDev = {};

    while (true) {
      const res  = await this.safeFetch(`${this.baseUrl}/rest/api/3/issue/${issueKey}/worklog?startAt=${startAt}&maxResults=100`);
      const data = await res.json();

      for (const wl of data.worklogs || []) {
        const id = wl?.author?.accountId;
        if (id) hoursByDev[id] = (hoursByDev[id] || 0) + (wl.timeSpentSeconds || 0);
      }

      if (!data.worklogs || data.worklogs.length < 100) break;
      startAt += 100;
    }

    return hoursByDev;
  }

  async getDeveloperTickets(accountId, projectKey) {
    let nextPageToken = null;
    const issues      = [];

    const jql = `
      project = ${projectKey}
      AND worklogAuthor = "${accountId}"
      AND worklogDate >= startOfMonth(-1)
    `;

    while (true) {
      const body = {
        jql,
        maxResults: 100,
        fields: ['summary', 'timeoriginalestimate', 'status', 'assignee'],
        ...(nextPageToken && { nextPageToken })
      };

      const res  = await this.safeFetch(`${this.baseUrl}/rest/api/3/search/jql`, { method: 'POST', body: JSON.stringify(body) });
      const data = await res.json();

      if (!Array.isArray(data.issues)) throw new Error(`Invalid Jira response: ${JSON.stringify(data)}`);

      issues.push(...data.issues);
      if (data.isLast) break;
      nextPageToken = data.nextPageToken;
      if (!nextPageToken) break;
    }

    const ownershipMap = await this.resolveOwnership(accountId, issues);

    return issues
      .filter(issue => ownershipMap[issue.key]?.isOwner)
      .map(issue => ({
        key:           issue.key,
        summary:       issue.fields.summary,
        estimateHours: (issue.fields.timeoriginalestimate || 0) / 3600,
        actualHours:   ownershipMap[issue.key].devHours,
        status:        issue.fields.status?.name ?? 'Unknown',
        changelog:     ownershipMap[issue.key].changelog
      }));
  }

  async resolveOwnership(accountId, issues, concurrency = 10) {
    const result = {};

    for (let i = 0; i < issues.length; i += concurrency) {
      const batch = issues.slice(i, i + concurrency);

      const settled = await Promise.all(
        batch.map(async issue => {
          try {
            const [hoursByDev, changelog] = await Promise.all([
              this.fetchWorklogs(issue.key),
              this.fetchChangelog(issue.key)
            ]);

            const everAssignees = getEverAssignees(changelog, issue.fields.assignee?.accountId);
            const wasAssignee   = everAssignees.has(accountId);

            const devSeconds = hoursByDev[accountId] || 0;
            const maxAmongAssignees = Math.max(
              0,
              ...Object.entries(hoursByDev)
                .filter(([id]) => everAssignees.has(id))
                .map(([, s]) => s)
            );

            const isOwner = wasAssignee && devSeconds > 0 && devSeconds === maxAmongAssignees;

            return {
              key: issue.key,
              ownership: {
                devHours: devSeconds / 3600,
                wasAssignee,
                isOwner
              },
              changelog
            };
          } catch (err) {
            console.warn(`Ownership resolution failed for ${issue.key}:`, err.message);
            return { key: issue.key, ownership: null, changelog: null };
          }
        })
      );

      for (const { key, ownership, changelog } of settled) {
        result[key] = { ...ownership, changelog };
      }
    }

    return result;
  }
}