import dayjs from "dayjs";
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import businessTime from 'dayjs-business-time';
import isBetween from 'dayjs/plugin/isBetween.js';
import minMax from 'dayjs/plugin/minMax.js'

import { params } from "./config/env.js";
import { GitLabService } from "./services/gitlabService.js";
import { normalizeMergeRequests } from "./core/normalizer.js";
import { enrichMergeRequests } from "./core/enrich.js";
import { buildSnapshot } from "./core/snapshotBuilder.js";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(businessTime);
dayjs.extend(isBetween);
dayjs.extend(minMax)

const snapshot = (async () => {
  
  const startDate = dayjs()
  .startOf("isoWeek")
  .subtract(1, "week")
  .add(8, "hour");
  
  const endDate = dayjs()
    .startOf("isoWeek")
    .subtract(1, "week")
    .add(4, "day")
    .add(20, "hour");

  const startOfYearDate = dayjs()
    .startOf("year")
    .add(8, "hour");

  const presentDate = dayjs();

  const gitlab = new GitLabService(
    params.url,
    params.token
  );

  const rawMrs = await gitlab.getMergeRequests(
    params.projectIds,
    startOfYearDate,
    presentDate,
    true
  );

  const normalized =
    normalizeMergeRequests(rawMrs);

  const enriched =
    enrichMergeRequests(
      normalized,
      params.requiredApprovals
    );

  const yearToDateMrs = enriched;

  const currentWeekMrs = enriched.filter(mr =>
    dayjs(mr.createdAt).isBetween(startDate, endDate)
  );

  const snapshot = buildSnapshot({
    yearToDateMrs,
    currentWeekMrs,
    reviewers: params.eligibleAuthors,
    startDate,
    endDate
  });

  console.log(JSON.stringify(snapshot, null, 2));

});

snapshot();