const SCHEDULE_PREFIX = "schedule";
const START_PREFIX = "start";
const MANAGE_PREFIX = "manage";

export const CALLBACK_KEYS = {
  PREFIX: {
    SCHEDULE: SCHEDULE_PREFIX,
    START: START_PREFIX,
    MANAGE: MANAGE_PREFIX,
  },

  SCHEDULE: {
    YEAR: (y: number) => `${SCHEDULE_PREFIX}_year_${y}`,
    MONTH: (m: number) => `${SCHEDULE_PREFIX}_month_${m}`,
    DAY: (d: number) => `${SCHEDULE_PREFIX}_day_${d}`,
    HOUR: (h: number) => `${SCHEDULE_PREFIX}_hour_${h}`,
    MINUTE: (m: number) => `${SCHEDULE_PREFIX}_minute_${m}`,

    CONFIRM: `${SCHEDULE_PREFIX}_confirm`,
    CANCEL: `${SCHEDULE_PREFIX}_cancel`,
  },

  MANAGE: {
    DELETE_MESSAGE: (id: number) => `manage_delete_${id}`,
    EDIT_MESSAGE: (id: number) => `manage_edit_${id}`,
  },

  START: {
    STUDENT: `${START_PREFIX}_student`,
    TEACHER: `${START_PREFIX}_teacher`,
  },
} as const;
