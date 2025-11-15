// Core Type Definitions for SideBet App

export type BetType = "YES_NO" | "OVER_UNDER" | "CLOSEST_GUESS";
export type BetStatus = "OPEN" | "CLOSED" | "JUDGED";
export type SeasonType = "none" | "monthly" | "quarterly" | "yearly";
export type InviteType = "link" | "code" | "both";
export type StreakType = "W" | "L";

export interface Bet {
  id: string;
  title: string;
  description: string;
  type: BetType;
  status: BetStatus;
  line: number | null;
  perUserWager: number;
  participants: string[];
  picks: Record<string, string | number>;
  creatorId: string;
  groupId: string;
  createdAt: string;
  updatedAt: string;
  closingAt: string;
  correctAnswer?: string | number;
  winners?: string[];
  judgedAt?: string;
  payoutPerWinner?: number;
}

export interface Group {
  id: string;
  name: string;
  tagline: string;
  admin_id: string;
  memberIds: string[];
  settings: GroupSettings;
  inviteType: InviteType;
  joinLink: string;
  accessCode: string;
  created_at: string;
  activeCount?: number;
}

export interface GroupSettings {
  min_bet: number;
  max_bet: number;
  starting_balance: number;
  season_enabled: boolean;
  season_type: SeasonType;
  season_end_date: string | null;
  auto_renew: boolean;
}

export interface LeaderboardEntry {
  user_id: string;
  group_id: string;
  balance: number;
  wins: number;
  losses: number;
  ties: number;
  total_bets: number;
  current_streak?: number;
  streak_type?: StreakType;
}

export interface UserData {
  uid: string;
  email: string;
  firstName?: string;
  lastName?: string;
  onboardingCompleted?: boolean;
}

export interface BetFormData {
  type: BetType;
  groupId: string;
  title: string;
  description: string;
  wager: string;
  line: string;
  closingAt: string;
}

export interface GroupFormData {
  name: string;
  tagline: string;
  min_bet: number;
  max_bet: number;
  season_enabled: boolean;
  season_type: SeasonType;
  season_end_date: string;
  auto_renew: boolean;
  inviteType: InviteType;
  joinLink: string;
  accessCode: string;
}

export interface TimeRemaining {
  text: string;
  isClosed: boolean;
}

export interface LivePercentages {
  yes: number;
  no: number;
}
