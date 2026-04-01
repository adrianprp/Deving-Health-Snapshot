import dayjs from "dayjs";
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import businessTime from 'dayjs-business-time';
import isBetween from 'dayjs/plugin/isBetween.js';
import minMax from 'dayjs/plugin/minMax.js'
import pLimit from "p-limit";

import { params } from "./config/env.js";
import { GitLabService } from "./services/gitlabService.js";
import { normalizeMergeRequests } from "./core/normalizer.js";
import { enrichMergeRequests } from "./core/enrich.js";
import { buildFlowSnapshot, buildReviewerSnapshot } from "./core/snapshotBuilder.js";
import { groupByRepo } from "./utils/utils.js";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(businessTime);
dayjs.extend(isBetween);
dayjs.extend(minMax)

const snapshot = (async () => {

  // Weekly Span of time
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
    params.url,
    params.token
  );

  const limit = pLimit(5);

  const results = await Promise.all(
    params.projectIds.map(id =>
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

  const normalized =
    normalizeMergeRequests(rawMrs);

  const enriched =
    enrichMergeRequests(
      normalized,
      params.requiredApprovals
    );


  // --- Flow Metrics --- 
  const snapshot = {};

  const watchedRepoIds = params.flowIds.map(Number);

  const watchedMrs = enriched.filter(mr =>
    watchedRepoIds.includes(mr.projectId)
  );

  const groupedByRepo = groupByRepo(watchedMrs);

  params.flowIds.forEach((id) => {
    const mrs = groupedByRepo[id];

    const rollingWindowMrs = mrs;
  
    const currentPeriodMrs = mrs.filter(mr =>
      dayjs(mr.createdAt).isBetween(startDate, endDate, null, "[]")
    );

    snapshot[id] = buildFlowSnapshot({
      rollingWindowMrs,
      currentPeriodMrs,
    });
  });

  // --- Individual Metrics ---

  const reviewerMrs = enriched.filter(mr =>
    dayjs(mr.createdAt).isBetween(startDate, endDate, null, "[]")
  );

  snapshot.reviewers = buildReviewerSnapshot({  
   mrs: reviewerMrs, reviewers: params.eligibleAuthors,
  });

  console.log(JSON.stringify(snapshot, null, 2));

});

snapshot();
