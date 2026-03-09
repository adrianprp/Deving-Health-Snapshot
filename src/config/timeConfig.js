import dayjs from 'dayjs';
import businessTime from 'dayjs-business-time';

dayjs.extend(businessTime);

// per-zone business-time + holiday config
export const bizConfigByZone = {
  'Europe/Bucharest': {
    holidays: [

    ],
    workingHours: {
      sunday:    null,
      monday:    [{ start: '08:00:00', end: '18:15:00' }],
      tuesday:   [{ start: '08:00:00', end: '18:15:00' }],
      wednesday: [{ start: '08:00:00', end: '18:15:00' }],
      thursday:  [{ start: '08:00:00', end: '18:15:00' }],
      friday:    [{ start: '08:00:00', end: '18:15:00' }],
      saturday:  null,
    },
  },

  'Europe/Kyiv': {
    holidays: [

    ],
    workingHours: {
      sunday:    null,
      monday:    [{ start: '08:00:00', end: '18:15:00' }],
      tuesday:   [{ start: '08:00:00', end: '18:15:00' }],
      wednesday: [{ start: '08:00:00', end: '18:15:00' }],
      thursday:  [{ start: '08:00:00', end: '18:15:00' }],
      friday:    [{ start: '08:00:00', end: '18:15:00' }],
      saturday:  null,
    },
  },

  'Europe/Zagreb': {

    holidays: [
 
    ],
    workingHours: {
      sunday:    null,
      monday:    [{ start: '09:00:00', end: '17:00:00' }],
      tuesday:   [{ start: '09:00:00', end: '17:00:00' }],
      wednesday: [{ start: '09:00:00', end: '17:00:00' }],
      thursday:  [{ start: '09:00:00', end: '17:00:00' }],
      friday:    [{ start: '09:00:00', end: '17:00:00' }],
      saturday:  null,
    },
  },

  'Asia/Bangkok': {
    holidays: [

    ],
    workingHours: {
      sunday:    null,
      monday:    [{ start: '08:00:00', end: '18:15:00' }],
      tuesday:   [{ start: '08:00:00', end: '18:15:00' }],
      wednesday: [{ start: '08:00:00', end: '18:15:00' }],
      thursday:  [{ start: '08:00:00', end: '18:15:00' }],
      friday:    [{ start: '08:00:00', end: '18:15:00' }],
      saturday:  null,
    },
  },

  'Asia/Shanghai': {
    holidays: [

    ],
    workingHours: {
      sunday:    null,
      monday:    [{ start: '12:00:00', end: '20:15:00' }],
      tuesday:   [{ start: '12:00:00', end: '20:15:00' }],
      wednesday: [{ start: '12:00:00', end: '20:15:00' }],
      thursday:  [{ start: '12:00:00', end: '20:15:00' }],
      friday:    [{ start: '12:00:00', end: '20:15:00' }],
      saturday:  null,
    },
  },
};



// For accurate reviewCycleTime calculation the authorTimezones should be accurate. 
export const authorTimezones = {
/*  
'name': 'Europe/Bucharest',
'': 'Europe/Bucharest', 
'':'Europe/Kyiv',
'':'Europe/Zagreb',
'': 'Asia/Bangkok',
'': 'Asia/Shanghai',
*/


};

// copy of the “no-config” default
export const defaultBizTime = dayjs.getBusinessTime();
