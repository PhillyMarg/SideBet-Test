export type TournamentType = "single" | "double";
export type TournamentStatus = "upcoming" | "live" | "completed";
export type BracketRound = "round1" | "round2" | "round3" | "semifinals" | "finals";

export interface Participant {
  userId: string;
  userName: string;
  seed: number;
  eliminated?: boolean;
  currentRound?: BracketRound;
}

export interface Match {
  id: string;
  round: BracketRound;
  matchNumber: number;
  participant1: string; // userId
  participant2: string; // userId
  winner?: string; // userId
  isPlayIn?: boolean;
  startTime?: string;
  completedAt?: string;
}

export interface Tournament {
  id: string;
  name: string;
  description?: string;
  creatorId: string;
  creatorName: string;

  // Dates/Times
  startDate: string; // ISO string
  startTime: string; // HH:MM format
  endDate: string; // ISO string
  endTime: string; // HH:MM format
  createdAt: string; // ISO string

  // Tournament Settings
  type: TournamentType;
  bracketSize: number;
  isPublic: boolean;
  status: TournamentStatus;

  // Participants
  participants: Participant[];
  maxParticipants: number;

  // Bracket
  matches: Match[];
  currentRound: BracketRound;

  // Access
  accessCode?: string; // For private tournaments
  invitedUserIds?: string[];

  // Stats
  totalBets: number;
  totalBetAmount: number;
}

export interface CreateTournamentInput {
  name: string;
  description?: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  type: TournamentType;
  bracketSize: number;
  isPublic: boolean;
  creatorId: string;
  creatorName: string;
  participants?: Participant[];
  startImmediately?: boolean;
}
