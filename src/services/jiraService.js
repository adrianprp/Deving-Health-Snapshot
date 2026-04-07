'use strict';

import fetch from 'node-fetch';
import https from 'https';
import pLimit from 'p-limit';

export class JiraService {

  constructor(domain, email, token) {
    this.baseUrl = `https://${domain}`;
    this.auth = Buffer.from(`${email}:${token}`).toString('base64');

    this.headers = {
      Accept: 'application/json',
      Authorization: `Basic ${this.auth}`,
      'Content-Type': 'application/json'
    };

    this.agent = new https.Agent({ keepAlive: true });
    this.limit = pLimit(process.env.CI ? 2 : 5);
  }

  async safeFetch(url, options = {}) {
    const res = await fetch(url, {
      ...options,
      headers: this.headers,
      agent: this.agent
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Jira API error: ${res.status} — ${text}`);
    }

    return res;
  }

  async getAccountId(email) {
    const url = `${this.baseUrl}/rest/api/3/user/search?query=${encodeURIComponent(email)}`;

    const res = await this.safeFetch(url);
    const users = await res.json();

    if (!users.length) {
      throw new Error(`No Jira user found for ${email}`);
    }

    return users[0].accountId;
  }

  async fetchIssuesForUser(accountId, projectKey) {

    let nextPageToken = null;
    const issues = [];

    const jql = `
      project = ${projectKey}
      AND worklogDate >= startOfMonth()
      AND worklogAuthor = "${accountId}"
      AND assignee = "${accountId}"
    `.replace(/\s+/g, ' ').trim();

    while (true) {

      const body = {
        jql,
        maxResults: 100,
        fields: ['summary', 'timeoriginalestimate']
      };

      if (nextPageToken) {
        body.nextPageToken = nextPageToken;
      }

      const res = await this.safeFetch(
        `${this.baseUrl}/rest/api/3/search/jql`,
        {
          method: 'POST',
          body: JSON.stringify(body)
        }
      );

      const data = await res.json();

      if (!Array.isArray(data.issues)) {
        throw new Error(`Invalid Jira response: ${JSON.stringify(data)}`);
      }

      issues.push(...data.issues);

      if (data.isLast) break;

      nextPageToken = data.nextPageToken;
      if (!nextPageToken) break;
    }

    return issues.map(issue => ({
      key: issue.key,
      summary: issue.fields.summary,
      estimateHours: (issue.fields.timeoriginalestimate || 0) / 3600
    }));
  }

  async fetchActualHours(accountId, issueKey) {

    const now = new Date();
    const fromDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const toDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    let startAt = 0;
    let totalSeconds = 0;

    while (true) {

      const res = await this.safeFetch(
        `${this.baseUrl}/rest/api/3/issue/${issueKey}/worklog?startAt=${startAt}&maxResults=100`
      );

      const data = await res.json();

      for (const wl of data.worklogs || []) {
        // Check only for assignees logs ignore other people. 
        if (wl?.author?.accountId !== accountId) continue;

        const started = new Date(wl.started);
        if (started < fromDate || started >= toDate) continue;

        totalSeconds += wl.timeSpentSeconds || 0;
      }

      if (!data.worklogs || data.worklogs.length < 100) break;

      startAt += 100;
    }

    return totalSeconds / 3600;
  }

  async getDevStats(accountId, projectKey) {

    const issues = await this.fetchIssuesForUser(accountId, projectKey);

    const enriched = await Promise.all(
      issues.map(issue =>
        this.limit(async () => {

          const actualHours = await this.fetchActualHours(
            accountId,
            issue.key
          );

          return {
            key: issue.key,
            summary: issue.summary,
            estimateHours: issue.estimateHours,
            actualHours,
          };
        })
      )
    );

    return enriched;
  }
}