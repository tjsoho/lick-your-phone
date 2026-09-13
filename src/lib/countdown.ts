/** Whole units left until a deadline, never negative. */
export function splitRemaining(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3_600),
    minutes: Math.floor((total % 3_600) / 60),
    seconds: total % 60,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "2d 04h 12m 09s", dropping days once there are none left. */
export function formatRemaining(ms: number) {
  const { days, hours, minutes, seconds } = splitRemaining(ms);
  const clock = `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  return days > 0 ? `${days}d ${clock}` : clock;
}
