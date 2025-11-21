export interface Participant {
  oddsRank: number;
  oddsScoreAggregate: number;
  userId: string;
  userName: string;
  seed: number;
  eliminated: boolean;
}

export interface Match {
  id: string;
  round: number;
  matchNumber: number;
  participant1Id: string | null;
  participant2Id: string | null;
  winnerId: string | null;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface Tournament {
  id: string;
  name: string;
  description?: string;
  creatorId: string;
  creatorName: string;
  startDate: string;
  endDate: string;
  type: 'single' | 'double';
  maxParticipants: number;
  isPublic: boolean;
  accessCode?: string;
  status: 'draft' | 'upcoming' | 'live' | 'completed';
  participants: Participant[];
  matches: Match[];
  totalBets: number;
  createdAt: string;
  updatedAt: string;
}
