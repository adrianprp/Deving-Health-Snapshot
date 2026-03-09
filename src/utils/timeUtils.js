import dayjs from "dayjs";
import { bizConfigByZone, defaultBizTime, authorTimezones } from "../config/timeConfig.js";

 export const calcTimeDifference = (createdAt, mergedAt, devName) => {
    if (!mergedAt) return null;
  
    const tz = authorTimezones[devName] || "UTC";
    
    const BUSINESS_MINUTES_PER_DAY = 8 * 60;

    const cfg = bizConfigByZone[tz] || {};
    if (cfg.holidays)     dayjs.setHolidays(cfg.holidays);
    if (cfg.workingHours) dayjs.setBusinessTime(cfg.workingHours);

    const startDate = dayjs.utc(createdAt).tz(tz);
    const endDate   = dayjs.utc(mergedAt).tz(tz);


    let totalMinutes = 0;
    let cursor = startDate.startOf('day');
    const lastDay = endDate.startOf('day');

    while (cursor.isSameOrBefore(lastDay)) {

      const dayStart = cursor.clone();
      const dayEnd   = cursor.clone().endOf('day');


      const sliceStart = dayjs.max(dayStart, startDate);
      const sliceEnd   = dayjs.min(dayEnd,   endDate);

      if (sliceEnd.isAfter(sliceStart)) {
        const dayMins = sliceStart.businessMinutesDiff(sliceEnd);

        totalMinutes += Math.min(dayMins, BUSINESS_MINUTES_PER_DAY);
      }

      cursor = cursor.add(1, 'day');
    }

    dayjs.setBusinessTime(defaultBizTime);

    const ms = totalMinutes * 60 * 1000;

    return ms;
  }

  export const formatTime = milliseconds => {
    if (milliseconds == null) return 'Not yet merged';
    // 1 day = 8 business-hours.
    const sign = milliseconds < 0 ? '-' : '';
    const absMs = Math.abs(milliseconds);
    const totalMinutes = Math.floor(absMs / 60000);
    const totalHours   = Math.floor(totalMinutes / 60);
    const days         = Math.floor(totalHours / 8);
    const hours        = totalHours % 8;
    const mins         = totalMinutes % 60;
    return { days, hours, mins, milliseconds, sign };
  };

