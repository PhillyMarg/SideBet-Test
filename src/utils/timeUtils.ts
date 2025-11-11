// src/utils/timeUtils.ts

export interface TimeRemaining {
  text: string;
  isClosed: boolean;
}

export interface LivePercentages {
  yes: number;
  no: number;
}

export function getTimeRemaining(closingAt: string | null | undefined): TimeRemaining {
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

export function getLivePercentages(bet: any): LivePercentages {
  if (!bet?.picks) return { yes: 0, no: 0 };
  
  const values = Object.values(bet.picks);
  const total = values.filter((v) => v !== null && v !== undefined).length;
  
  if (total === 0) return { yes: 0, no: 0 };
  
  const yesCount = values.filter((v) => v === "YES" || v === "OVER").length;
  const noCount = total - yesCount;
  
  return {
    yes: Math.round((yesCount / total) * 100),
    no: Math.round((noCount / total) * 100),
  };
}