'use strict';

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import businessTime from 'dayjs-business-time';
import isBetween from 'dayjs/plugin/isBetween.js';
import minMax from 'dayjs/plugin/minMax.js';
import pLimit from 'p-limit';

import { params } from './config/env.js';

import { GitLabService } from './services/gitlabService.js';
import { JiraService } from './services/jiraService.js';
import { normalizeMergeRequests } from './core/normalizer.js';
import { enrichMergeRequests } from './core/enrich.js';
import { calculateEstimateAccuracy } from './core/metrics.js';

import { buildFlowSnapshot, buildReviewersSnapshot } from './core/snapshotBuilder.js';

import { groupByRepo, buildDevScopes, emailToName, buildUnifiedDevs } from './utils/utils.js';
import { buildEmailHtml } from './utils/htmlBuilder.js';


dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(businessTime);
dayjs.extend(isBetween);
dayjs.extend(minMax);

const snapshot = async () => {

  /* ==== GITLAB ==== */

  const startDate = dayjs()
    .startOf('isoWeek')
    .subtract(1, 'week')
    .add(8, 'hour');

  const endDate = dayjs()
    .startOf('isoWeek')
    .subtract(1, 'week')
    .add(4, 'day')
    .add(20, 'hour');

  const rollingBaselineStartDate = dayjs()
    .subtract(90, "days")
    .add(8, "hour");

  const presentDate = dayjs();

  const gitlab = new GitLabService(
    params.gitlab.url,
    params.gitlab.token
  );

  const limit = pLimit(5);

  const results = await Promise.all(
    params.gitlab.projectIds.map(id =>
      limit(() =>
        gitlab.getMergeRequests(
          id,
          rollingBaselineStartDate,
          presentDate,
          true
        )
      )
    )
  );

  const rawMrs = results.flat();

  const normalized = normalizeMergeRequests(rawMrs);
  const enriched = enrichMergeRequests(normalized);

  const snapshot = {};

  /* FLOW METRICS */

  const watchedRepoIds = params.gitlab.flowIds.map(Number);

  const watchedMrs = enriched.filter(mr =>
    watchedRepoIds.includes(mr.projectId)
  );

  const groupedByRepo = groupByRepo(watchedMrs);

  params.gitlab.flowIds.forEach((id) => {
    const mrs = groupedByRepo[id] || [];

    const rollingWindowMrs = mrs;

    const currentPeriodMrs = mrs.filter(mr =>
      dayjs(mr.createdAt).isBetween(startDate, endDate, null, "[]")
    );

    snapshot[id] = buildFlowSnapshot({
      rollingWindowMrs,
      currentPeriodMrs,
    });
  });

  /* REVIEWERS */

  const devScopes = buildDevScopes(enriched);

  const weeklyPeriod = enriched.filter(mr =>
    dayjs(mr.createdAt).isBetween(startDate, endDate, null, "[]")
  );

  const reviewerSnapshot = buildReviewersSnapshot({
    mrs: weeklyPeriod,
    devScopes
  }).reviewerMetrics;

  /* ==== JIRA ====  */

  const jira = new JiraService(
    params.jira.domain,
    params.jira.email,
    params.jira.token
  );

  const jiraData = await Promise.all(
    params.users.map(async (email) => {
      const accountId = await jira.getAccountId(email);
      const tickets = await jira.getDevStats(
        accountId,
        params.jira.projectKey
      );

      return {
        email,
        accountId,
        tickets
      };
    })
  );

  const estimationSnapshot = jiraData.map(dev => ({
    email: dev.email,
    name: emailToName(dev.email),
    ...calculateEstimateAccuracy(dev.tickets)
  }));

  const devs = buildUnifiedDevs({
    reviewers: reviewerSnapshot,
    estimations: estimationSnapshot
  });

  snapshot['devs'] = devs;

  console.log(JSON.stringify(snapshot, null, 2));




const html = buildEmailHtml(snapshot);

console.log(html);
};

snapshot();