export const CALLBACK_KEYS = {
  // Schedule
  SCHEDULE_MONTH: (m: number) => `schedule_month_${m}`,
  SCHEDULE_DAY: (d: number) => `schedule_day_${d}`,
  SCHEDULE_HOUR: (h: number) => `schedule_hour_${h}`,
  SCHEDULE_MINUTE: (m: number) => `schedule_minute_${m}`,

  // Start
  START_STUDENT: "start_student",
  START_TEACHER: "start_teacher",

  PREFIX: {
    SCHEDULE: "schedule_",
    START: "start_",
  },
} as const;
