import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import {
  TournamentBet,
  CreateTournamentBetInput,
  PlaceTournamentBetInput,
} from '@/types/tournamentBet';
import { Tournament, Participant } from '@/types/tournament';

const TOURNAMENT_BETS_COLLECTION = 'tournament_bets';

/**
 * Get participant name by userId
 */
export function getParticipantName(userId: string, participants: Participant[]): string {
  const participant = participants.find(p => p.userId === userId);
  return participant?.userName || 'Unknown';
}

/**
 * Create a tournament bet
 */
export async function createTournamentBet(
  input: CreateTournamentBetInput
): Promise<string> {
  try {
    const betData: Omit<TournamentBet, 'id'> = {
      tournamentId: input.tournamentId,
      tournamentName: input.tournamentName,
      type: input.type,
      title: input.title,
      description: input.description,
      matchId: input.matchId,
      round: input.round,
      isStandard: false, // User-created bets are not standard
      creatorId: input.creatorId,
      creatorName: input.creatorName,
      wagerAmount: input.wagerAmount,
      createdAt: new Date().toISOString(),
      closesAt: input.closesAt,
      status: 'open',
      picks: [],
      totalPot: 0,
      options: input.options,
    };

    const docRef = await addDoc(collection(db, TOURNAMENT_BETS_COLLECTION), betData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating tournament bet:', error);
    throw error;
  }
}

/**
 * Get all bets for a tournament
 */
export async function getTournamentBets(
  tournamentId: string
): Promise<TournamentBet[]> {
  try {
    const q = query(
      collection(db, TOURNAMENT_BETS_COLLECTION),
      where('tournamentId', '==', tournamentId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const bets: TournamentBet[] = [];

    snapshot.forEach((doc) => {
      bets.push({ id: doc.id, ...doc.data() } as TournamentBet);
    });

    return bets;
  } catch (error) {
    console.error('Error getting tournament bets:', error);
    throw error;
  }
}

/**
 * Get single bet
 */
export async function getTournamentBet(betId: string): Promise<TournamentBet | null> {
  try {
    const docRef = doc(db, TOURNAMENT_BETS_COLLECTION, betId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as TournamentBet;
    }
    return null;
  } catch (error) {
    console.error('Error getting bet:', error);
    throw error;
  }
}

/**
 * Place a bet pick
 */
export async function placeTournamentBetPick(
  input: PlaceTournamentBetInput
): Promise<void> {
  try {
    const bet = await getTournamentBet(input.betId);
    if (!bet) throw new Error('Bet not found');

    if (bet.status !== 'open') throw new Error('Betting is closed');

    // Check if user already placed a pick
    if (bet.picks.some((p) => p.userId === input.userId)) {
      throw new Error('You have already placed a pick on this bet');
    }

    // Validate wager amount
    if (input.amount !== bet.wagerAmount) {
      throw new Error(`Wager must be exactly $${bet.wagerAmount}`);
    }

    const newPick = {
      userId: input.userId,
      userName: input.userName,
      selection: input.selection,
      selectionLabel: input.selectionLabel,
      amount: input.amount,
      timestamp: new Date().toISOString(),
    };

    const docRef = doc(db, TOURNAMENT_BETS_COLLECTION, input.betId);
    await updateDoc(docRef, {
      picks: [...bet.picks, newPick],
      totalPot: bet.totalPot + input.amount,
    });
  } catch (error) {
    console.error('Error placing bet pick:', error);
    throw error;
  }
}

/**
 * Close betting (when match/round starts)
 */
export async function closeTournamentBet(betId: string): Promise<void> {
  try {
    const docRef = doc(db, TOURNAMENT_BETS_COLLECTION, betId);
    await updateDoc(docRef, {
      status: 'closed',
    });
  } catch (error) {
    console.error('Error closing bet:', error);
    throw error;
  }
}

/**
 * Auto-settle standard bet based on match result
 */
export async function autoSettleStandardBet(
  betId: string,
  winnerId: string
): Promise<void> {
  try {
    const bet = await getTournamentBet(betId);
    if (!bet) throw new Error('Bet not found');

    if (!bet.isStandard) throw new Error('Only standard bets can be auto-settled');
    if (bet.status === 'settled') throw new Error('Bet already settled');

    // Find winners (users who picked the winning selection)
    const winners = bet.picks.filter((p) => p.selection === winnerId);

    if (winners.length === 0) {
      // No winners - void the bet, return money
      const updatedPicks = bet.picks.map((p) => ({ ...p, payout: p.amount }));

      const docRef = doc(db, TOURNAMENT_BETS_COLLECTION, betId);
      await updateDoc(docRef, {
        status: 'settled',
        settledAt: new Date().toISOString(),
        winningSelection: winnerId,
        winnerIds: [],
        picks: updatedPicks,
      });
      return;
    }

    // Calculate payouts (split pot evenly among winners)
    const payoutPerWinner = bet.totalPot / winners.length;

    const updatedPicks = bet.picks.map((p) => ({
      ...p,
      payout: p.selection === winnerId ? payoutPerWinner : 0,
    }));

    const winnerIds = winners.map((w) => w.userId);

    const docRef = doc(db, TOURNAMENT_BETS_COLLECTION, betId);
    await updateDoc(docRef, {
      status: 'settled',
      settledAt: new Date().toISOString(),
      winningSelection: winnerId,
      winnerIds,
      picks: updatedPicks,
    });
  } catch (error) {
    console.error('Error auto-settling bet:', error);
    throw error;
  }
}

/**
 * Manually settle custom bet (bet creator judges)
 */
export async function settleCustomBet(
  betId: string,
  winningSelection: string,
  judgedBy: string
): Promise<void> {
  try {
    const bet = await getTournamentBet(betId);
    if (!bet) throw new Error('Bet not found');

    if (bet.isStandard) throw new Error('Standard bets are auto-settled');
    if (bet.status === 'settled') throw new Error('Bet already settled');
    if (judgedBy !== bet.creatorId) throw new Error('Only bet creator can judge');

    // Find winners
    const winners = bet.picks.filter((p) => p.selection === winningSelection);

    if (winners.length === 0) {
      // No winners - void the bet
      const updatedPicks = bet.picks.map((p) => ({ ...p, payout: p.amount }));

      const docRef = doc(db, TOURNAMENT_BETS_COLLECTION, betId);
      await updateDoc(docRef, {
        status: 'settled',
        settledAt: new Date().toISOString(),
        judgedBy,
        winningSelection,
        winnerIds: [],
        picks: updatedPicks,
      });
      return;
    }

    // Calculate payouts
    const payoutPerWinner = bet.totalPot / winners.length;

    const updatedPicks = bet.picks.map((p) => ({
      ...p,
      payout: p.selection === winningSelection ? payoutPerWinner : 0,
    }));

    const winnerIds = winners.map((w) => w.userId);

    const docRef = doc(db, TOURNAMENT_BETS_COLLECTION, betId);
    await updateDoc(docRef, {
      status: 'settled',
      settledAt: new Date().toISOString(),
      judgedBy,
      winningSelection,
      winnerIds,
      picks: updatedPicks,
    });
  } catch (error) {
    console.error('Error settling custom bet:', error);
    throw error;
  }
}

/**
 * Generate standard bets for tournament
 */
export async function generateStandardBets(tournament: Tournament): Promise<void> {
  try {
    if (tournament.matches.length === 0) {
      throw new Error('Tournament must have bracket generated first');
    }

    const standardBets: Omit<TournamentBet, 'id'>[] = [];

    // 1. Tournament Winner Bet
    const tournamentWinnerBet: Omit<TournamentBet, 'id'> = {
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      type: 'tournament_winner',
      title: 'Who will win the tournament?',
      description: 'Pick the champion',
      isStandard: true,
      creatorId: tournament.creatorId,
      creatorName: tournament.creatorName,
      wagerAmount: 10, // Default wager
      createdAt: new Date().toISOString(),
      closesAt: tournament.startDate, // Closes when tournament starts
      status: 'open',
      picks: [],
      totalPot: 0,
      options: tournament.participants.map((p) => p.userId),
    };
    standardBets.push(tournamentWinnerBet);

    // 2. Final Four Bet (if 8+ participants)
    if (tournament.participants.length >= 8) {
      const finalFourBet: Omit<TournamentBet, 'id'> = {
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        type: 'final_four',
        title: 'Who will make the Final Four?',
        description: 'Pick a participant to reach semifinals',
        isStandard: true,
        creatorId: tournament.creatorId,
        creatorName: tournament.creatorName,
        wagerAmount: 5,
        createdAt: new Date().toISOString(),
        closesAt: tournament.startDate,
        status: 'open',
        picks: [],
        totalPot: 0,
        options: tournament.participants.map((p) => p.userId),
      };
      standardBets.push(finalFourBet);
    }

    // 3. Individual Match Bets (Round 1 only for now)
    const round1Matches = tournament.matches.filter(
      (m) =>
        m.round === 'round1' &&
        m.participant1 &&
        m.participant2 &&
        m.participant1 !== m.participant2
    );

    for (const match of round1Matches) {
      const p1Name = getParticipantName(match.participant1, tournament.participants);
      const p2Name = getParticipantName(match.participant2, tournament.participants);

      const matchBet: Omit<TournamentBet, 'id'> = {
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        type: 'matchup_winner',
        title: `${p1Name} vs ${p2Name}`,
        description: `Round 1 - Match #${match.matchNumber}`,
        matchId: match.id,
        isStandard: true,
        creatorId: tournament.creatorId,
        creatorName: tournament.creatorName,
        wagerAmount: 5,
        createdAt: new Date().toISOString(),
        closesAt: tournament.startDate, // Closes when round starts
        status: 'open',
        picks: [],
        totalPot: 0,
        options: [match.participant1, match.participant2],
      };
      standardBets.push(matchBet);
    }

    // Save all standard bets
    for (const bet of standardBets) {
      await addDoc(collection(db, TOURNAMENT_BETS_COLLECTION), bet);
    }

    // Update tournament with bet count
    const docRef = doc(db, 'tournaments', tournament.id);
    await updateDoc(docRef, {
      totalBets: standardBets.length,
    });
  } catch (error) {
    console.error('Error generating standard bets:', error);
    throw error;
  }
}
