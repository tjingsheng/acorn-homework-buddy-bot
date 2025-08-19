const SCHEDULE_PREFIX = "schedule";
const START_PREFIX = "start";

export const CALLBACK_KEYS = {
  PREFIX: {
    SCHEDULE: SCHEDULE_PREFIX,
    START: START_PREFIX,
  },

  SCHEDULE: {
    MONTH: (m: number) => `${SCHEDULE_PREFIX}_month_${m}`,
    DAY: (d: number) => `${SCHEDULE_PREFIX}_day_${d}`,
    HOUR: (h: number) => `${SCHEDULE_PREFIX}_hour_${h}`,
    MINUTE: (m: number) => `${SCHEDULE_PREFIX}_minute_${m}`,
  },

  START: {
    STUDENT: `${START_PREFIX}_student`,
    TEACHER: `${START_PREFIX}_teacher`,
  },
} as const;
