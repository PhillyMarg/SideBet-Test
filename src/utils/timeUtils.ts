// src/utils/timeUtils.ts
export function getTimeRemaining(closingAt: string) {
  if (!closingAt) return { text: "No close time", isClosed: false };

  const parsed = new Date(closingAt).getTime();
  if (isNaN(parsed)) return { text: "No close time", isClosed: false };

  const diff = parsed - Date.now();
  if (diff <= 0) return { text: "CLOSED", isClosed: true };

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  let text = "";
  if (days > 0) text = `${days}d ${hours}h`;
  else if (hours > 0) text = `${hours}h ${minutes}m`;
  else if (minutes > 0) text = `${minutes}m ${seconds}s`;
  else text = `${seconds}s`;

  return { text: `Closes in ${text}`, isClosed: false };
}
