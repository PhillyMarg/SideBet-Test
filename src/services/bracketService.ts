import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Tournament, Match, Participant, BracketRound } from '@/types/tournament';
import {
  generateStandardBets,
  getTournamentBets,
  autoSettleStandardBet,
} from './tournamentBetService';

/**
 * Get participant name by userId
 */
export function getParticipantName(userId: string, participants: Participant[]): string {
  const participant = participants.find((p) => p.userId === userId);
  return participant?.userName || 'Unknown';
}

/**
 * Generate single elimination bracket matches
 */
function generateSingleEliminationBracket(participants: Participant[]): Match[] {
  const matches: Match[] = [];
  const numParticipants = participants.length;

  // Calculate number of rounds needed
  const numRounds = Math.ceil(Math.log2(numParticipants));
  const perfectBracketSize = Math.pow(2, numRounds);

  // Seed participants (assuming already seeded by order)
  const seededParticipants = [...participants].sort((a, b) => a.seed - b.seed);

  // Determine round names based on bracket size
  const getRoundName = (roundIndex: number, totalRounds: number): BracketRound => {
    const roundsFromEnd = totalRounds - roundIndex;
    if (roundsFromEnd === 1) return 'finals';
    if (roundsFromEnd === 2) return 'semifinals';
    if (roundsFromEnd === 3 && totalRounds >= 4) return 'round3';
    if (roundsFromEnd === 4 && totalRounds >= 5) return 'round2';
    return 'round1';
  };

  // Calculate number of byes
  const numByes = perfectBracketSize - numParticipants;

  // Create first round matches
  let matchNumber = 1;
  const firstRoundMatchCount = perfectBracketSize / 2;

  for (let i = 0; i < firstRoundMatchCount; i++) {
    const p1Index = i;
    const p2Index = perfectBracketSize - 1 - i;

    const participant1 = seededParticipants[p1Index]?.userId || '';
    const participant2 =
      p2Index < numParticipants ? seededParticipants[p2Index]?.userId || '' : '';

    // Handle bye (if p2 is empty, p1 advances automatically)
    const match: Match = {
      id: `match_${matchNumber}`,
      round: getRoundName(0, numRounds),
      matchNumber,
      participant1,
      participant2,
      winner: participant2 === '' ? participant1 : undefined, // Auto-advance on bye
    };

    matches.push(match);
    matchNumber++;
  }

  // Create subsequent round matches
  let previousRoundMatches = matches.filter((m) => m.round === getRoundName(0, numRounds));

  for (let round = 1; round < numRounds; round++) {
    const currentRoundMatchCount = previousRoundMatches.length / 2;
    const currentRoundMatches: Match[] = [];

    for (let i = 0; i < currentRoundMatchCount; i++) {
      const match: Match = {
        id: `match_${matchNumber}`,
        round: getRoundName(round, numRounds),
        matchNumber,
        participant1: '', // Will be filled by previous round winners
        participant2: '',
      };

      currentRoundMatches.push(match);
      matchNumber++;
    }

    matches.push(...currentRoundMatches);
    previousRoundMatches = currentRoundMatches;
  }

  return matches;
}

/**
 * Generate double elimination bracket matches
 */
function generateDoubleEliminationBracket(participants: Participant[]): Match[] {
  // For now, just use single elimination as a placeholder
  // TODO: Implement full double elimination logic
  return generateSingleEliminationBracket(participants);
}

/**
 * Save bracket matches to tournament
 */
async function saveBracketToTournament(
  tournamentId: string,
  matches: Match[]
): Promise<void> {
  const docRef = doc(db, 'tournaments', tournamentId);
  await updateDoc(docRef, {
    matches,
  });
}

/**
 * Generate bracket for a tournament and create standard bets
 */
export async function generateBracket(tournament: Tournament): Promise<void> {
  if (tournament.participants.length < 2) {
    throw new Error('Need at least 2 participants to generate bracket');
  }

  const matches =
    tournament.type === 'single'
      ? generateSingleEliminationBracket(tournament.participants)
      : generateDoubleEliminationBracket(tournament.participants);

  await saveBracketToTournament(tournament.id, matches);

  // Generate standard bets after bracket is created
  const updatedTournament = { ...tournament, matches };
  await generateStandardBets(updatedTournament);
}

/**
 * Enter match result and auto-settle related bets
 */
export async function enterMatchResult(
  tournamentId: string,
  matchId: string,
  winnerId: string
): Promise<void> {
  try {
    // Get tournament
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const tournamentSnap = await getDoc(tournamentRef);

    if (!tournamentSnap.exists()) {
      throw new Error('Tournament not found');
    }

    const tournament = {
      id: tournamentSnap.id,
      ...tournamentSnap.data(),
    } as Tournament;

    // Find and update the match
    const matchIndex = tournament.matches.findIndex((m) => m.id === matchId);
    if (matchIndex === -1) {
      throw new Error('Match not found');
    }

    const match = tournament.matches[matchIndex];

    // Validate winner is one of the participants
    if (winnerId !== match.participant1 && winnerId !== match.participant2) {
      throw new Error('Winner must be one of the match participants');
    }

    // Update match with winner
    const updatedMatches = [...tournament.matches];
    updatedMatches[matchIndex] = {
      ...match,
      winner: winnerId,
      completedAt: new Date().toISOString(),
    };

    // Advance winner to next round
    const advancedMatches = advanceWinnerToNextRound(
      updatedMatches,
      matchId,
      winnerId,
      match.round
    );

    // Eliminate loser
    const loserId =
      winnerId === match.participant1 ? match.participant2 : match.participant1;
    const updatedParticipants = tournament.participants.map((p) =>
      p.userId === loserId ? { ...p, eliminated: true } : p
    );

    // Save updates
    await updateDoc(tournamentRef, {
      matches: advancedMatches,
      participants: updatedParticipants,
    });

    // Auto-settle related bets
    const allBets = await getTournamentBets(tournamentId);

    // Find bets for this specific match
    const matchBets = allBets.filter(
      (bet) =>
        bet.matchId === matchId &&
        bet.isStandard &&
        (bet.status === 'closed' || bet.status === 'open')
    );

    for (const bet of matchBets) {
      try {
        await autoSettleStandardBet(bet.id, winnerId);
      } catch (error) {
        console.error(`Error settling bet ${bet.id}:`, error);
      }
    }

    // If this was the finals, settle tournament winner bet
    if (match.round === 'finals') {
      const tournamentWinnerBet = allBets.find(
        (bet) => bet.type === 'tournament_winner' && bet.isStandard
      );

      if (tournamentWinnerBet) {
        try {
          await autoSettleStandardBet(tournamentWinnerBet.id, winnerId);
        } catch (error) {
          console.error('Error settling tournament winner bet:', error);
        }
      }

      // Update tournament status to completed
      await updateDoc(tournamentRef, {
        status: 'completed',
      });
    }
  } catch (error) {
    console.error('Error entering match result:', error);
    throw error;
  }
}

/**
 * Advance winner to the next round match
 */
function advanceWinnerToNextRound(
  matches: Match[],
  completedMatchId: string,
  winnerId: string,
  currentRound: BracketRound
): Match[] {
  const updatedMatches = [...matches];

  // Get current match number
  const currentMatch = matches.find((m) => m.id === completedMatchId);
  if (!currentMatch) return updatedMatches;

  // Determine next round
  const roundOrder: BracketRound[] = [
    'round1',
    'round2',
    'round3',
    'semifinals',
    'finals',
  ];
  const currentRoundIndex = roundOrder.indexOf(currentRound);

  if (currentRoundIndex === -1 || currentRound === 'finals') {
    return updatedMatches; // No next round
  }

  // Find next round matches
  const nextRound = roundOrder[currentRoundIndex + 1];
  const nextRoundMatches = matches.filter((m) => m.round === nextRound);

  if (nextRoundMatches.length === 0) return updatedMatches;

  // Determine which next round match and slot
  const currentRoundMatches = matches.filter((m) => m.round === currentRound);
  const matchIndexInRound = currentRoundMatches.findIndex(
    (m) => m.id === completedMatchId
  );

  const nextMatchIndex = Math.floor(matchIndexInRound / 2);
  const slot = matchIndexInRound % 2; // 0 = participant1, 1 = participant2

  if (nextMatchIndex < nextRoundMatches.length) {
    const nextMatch = nextRoundMatches[nextMatchIndex];
    const matchToUpdateIndex = updatedMatches.findIndex(
      (m) => m.id === nextMatch.id
    );

    if (matchToUpdateIndex !== -1) {
      if (slot === 0) {
        updatedMatches[matchToUpdateIndex] = {
          ...updatedMatches[matchToUpdateIndex],
          participant1: winnerId,
        };
      } else {
        updatedMatches[matchToUpdateIndex] = {
          ...updatedMatches[matchToUpdateIndex],
          participant2: winnerId,
        };
      }
    }
  }

  return updatedMatches;
}

/**
 * Get tournament with fresh data
 */
export async function getTournamentWithBracket(
  tournamentId: string
): Promise<Tournament | null> {
  try {
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const tournamentSnap = await getDoc(tournamentRef);

    if (!tournamentSnap.exists()) {
      return null;
    }

    return {
      id: tournamentSnap.id,
      ...tournamentSnap.data(),
    } as Tournament;
  } catch (error) {
    console.error('Error getting tournament:', error);
    throw error;
  }
}
