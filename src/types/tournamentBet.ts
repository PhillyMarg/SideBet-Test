export type TournamentBetType =
  | 'tournament_winner'
  | 'matchup_winner'
  | 'final_four'
  | 'round_winner'
  | 'custom';

export type TournamentBetStatus = 'open' | 'closed' | 'judging' | 'settled';

export interface TournamentBetPick {
  userId: string;
  userName: string;
  selection: string; // userId for winner bets, custom value for others
  selectionLabel: string; // Display name
  amount: number;
  timestamp: string;
  payout?: number; // Calculated after settlement
}

export interface TournamentBet {
  id: string;
  tournamentId: string;
  tournamentName: string;

  // Bet Info
  type: TournamentBetType;
  title: string;
  description?: string;

  // Type-specific data
  matchId?: string; // For matchup_winner bets
  round?: string; // For round_winner bets

  // Bet Configuration
  isStandard: boolean; // Auto-generated vs user-created
  creatorId: string;
  creatorName: string;
  wagerAmount: number;

  // Timing
  createdAt: string;
  closesAt: string; // When betting closes
  settledAt?: string;

  // Status
  status: TournamentBetStatus;

  // Participants
  picks: TournamentBetPick[];
  totalPot: number;

  // Options (for custom bets)
  options?: string[]; // Possible selections

  // Result
  winningSelection?: string;
  winnerIds?: string[]; // Users who won

  // Judging (for custom bets only)
  judgedBy?: string; // Bet creator judges custom bets
}

export interface CreateTournamentBetInput {
  tournamentId: string;
  tournamentName: string;
  type: TournamentBetType;
  title: string;
  description?: string;
  matchId?: string;
  round?: string;
  wagerAmount: number;
  closesAt: string;
  options?: string[];
  creatorId: string;
  creatorName: string;
}

export interface PlaceTournamentBetInput {
  betId: string;
  userId: string;
  userName: string;
  selection: string;
  selectionLabel: string;
  amount: number;
}
