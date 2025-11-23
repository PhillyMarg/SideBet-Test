import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Tournament, Match, BracketRound, Participant } from '@/types/tournament';
import { getTournament } from './tournamentService';
import { autoSettleStandardBet, getTournamentBets } from './tournamentBetService';

const TOURNAMENTS_COLLECTION = 'tournaments';

/**
 * Get participant name by userId
 */
export function getParticipantName(userId: string, participants: Participant[]): string {
  const participant = participants.find(p => p.userId === userId);
  return participant?.userName || 'Unknown';
}

/**
 * Settle bets related to a match or bet type
 */
async function settleMatchBets(
  tournamentId: string,
  matchIdOrType: string,
  winnerId: string
): Promise<void> {
  try {
    // Get all bets for the tournament
    const bets = await getTournamentBets(tournamentId);

    for (const bet of bets) {
      // Only settle standard bets that haven't been settled
      if (!bet.isStandard || bet.status === 'settled') continue;

      // Settle match-specific bets
      if (bet.matchId === matchIdOrType) {
        await autoSettleStandardBet(bet.id, winnerId);
        continue;
      }

      // Settle tournament winner bets
      if (matchIdOrType === 'tournament_winner' && bet.type === 'tournament_winner') {
        await autoSettleStandardBet(bet.id, winnerId);
        continue;
      }
    }
  } catch (error) {
    console.error('Error settling match bets:', error);
    throw error;
  }
}

/**
 * Enter match result and advance winner
 */
export async function enterMatchResult(
  tournamentId: string,
  matchId: string,
  winnerId: string
): Promise<void> {
  try {
    const tournament = await getTournament(tournamentId);
    if (!tournament) throw new Error('Tournament not found');

    const match = tournament.matches.find(m => m.id === matchId);
    if (!match) throw new Error('Match not found');

    // Validate winner is one of the participants
    if (winnerId !== match.participant1 && winnerId !== match.participant2) {
      throw new Error('Winner must be one of the match participants');
    }

    // Update the match with winner and completion time
    const updatedMatches = tournament.matches.map(m =>
      m.id === matchId
        ? { ...m, winner: winnerId, completedAt: new Date().toISOString() }
        : m
    );

    // Find loser and mark as eliminated (if not play-in or early rounds)
    const loserId = winnerId === match.participant1 ? match.participant2 : match.participant1;
    const updatedParticipants = tournament.participants.map(p => {
      if (p.userId === loserId && match.round !== 'round1') {
        return { ...p, eliminated: true };
      }
      return p;
    });

    // Find next match this winner should advance to
    const nextMatch = findNextMatch(match, updatedMatches);

    if (nextMatch) {
      // Advance winner to next match
      const finalMatches = updatedMatches.map(m => {
        if (m.id === nextMatch.id) {
          // Determine which slot the winner goes into
          const slotToFill = !m.participant1 || m.participant1 === '' ? 'participant1' : 'participant2';
          return { ...m, [slotToFill]: winnerId };
        }
        return m;
      });

      // Save to database
      const docRef = doc(db, TOURNAMENTS_COLLECTION, tournamentId);
      await updateDoc(docRef, {
        matches: finalMatches,
        participants: updatedParticipants
      });
    } else {
      // This was the finals - tournament complete
      const docRef = doc(db, TOURNAMENTS_COLLECTION, tournamentId);
      await updateDoc(docRef, {
        matches: updatedMatches,
        participants: updatedParticipants,
        status: 'completed'
      });

      // Settle tournament winner bets
      try {
        await settleMatchBets(tournamentId, 'tournament_winner', winnerId);
      } catch (error) {
        console.error('Error settling tournament winner bets:', error);
      }
    }

    // Settle any bets related to this specific match
    try {
      await settleMatchBets(tournamentId, matchId, winnerId);
    } catch (error) {
      console.error('Error settling match bets:', error);
    }
  } catch (error) {
    console.error('Error entering match result:', error);
    throw error;
  }
}

/**
 * Find the next match that the winner should advance to
 */
function findNextMatch(currentMatch: Match, allMatches: Match[]): Match | null {
  // Finals has no next match
  if (currentMatch.round === 'finals') return null;

  const roundOrder: BracketRound[] = ['round1', 'round2', 'round3', 'semifinals', 'finals'];
  const currentRoundIndex = roundOrder.indexOf(currentMatch.round);
  const nextRound = roundOrder[currentRoundIndex + 1];

  if (!nextRound) return null;

  // Find matches in next round
  const nextRoundMatches = allMatches.filter(m => m.round === nextRound);

  // For simplified bracket progression, find first match with empty slot
  // In a proper implementation, this would use bracket tree structure
  const availableMatch = nextRoundMatches.find(
    m => !m.participant1 || m.participant1 === '' || !m.participant2 || m.participant2 === ''
  );

  return availableMatch || null;
}

/**
 * Undo match result (for corrections)
 */
export async function undoMatchResult(
  tournamentId: string,
  matchId: string
): Promise<void> {
  try {
    const tournament = await getTournament(tournamentId);
    if (!tournament) throw new Error('Tournament not found');

    const match = tournament.matches.find(m => m.id === matchId);
    if (!match || !match.winner) throw new Error('Match has no result to undo');

    // Check if winner has already played in next round
    const nextMatch = findNextMatch(match, tournament.matches);
    if (nextMatch && nextMatch.winner) {
      throw new Error('Cannot undo - winner has already played in next round');
    }

    const winnerId = match.winner;

    // Remove winner from match
    const updatedMatches = tournament.matches.map(m => {
      if (m.id === matchId) {
        const { winner, completedAt, ...rest } = m;
        return rest as Match;
      }
      // Remove winner from next match if they were placed
      if (nextMatch && m.id === nextMatch.id) {
        const newMatch = { ...m };
        if (m.participant1 === winnerId) newMatch.participant1 = '';
        if (m.participant2 === winnerId) newMatch.participant2 = '';
        return newMatch;
      }
      return m;
    });

    // Unmark loser as eliminated
    const loserId = winnerId === match.participant1 ? match.participant2 : match.participant1;
    const updatedParticipants = tournament.participants.map(p => {
      if (p.userId === loserId) {
        return { ...p, eliminated: false };
      }
      return p;
    });

    const docRef = doc(db, TOURNAMENTS_COLLECTION, tournamentId);
    await updateDoc(docRef, {
      matches: updatedMatches,
      participants: updatedParticipants
    });
  } catch (error) {
    console.error('Error undoing match result:', error);
    throw error;
  }
}

/**
 * Check if match is ready to have result entered
 */
export function canEnterResult(match: Match): boolean {
  // Both participants must be set
  if (!match.participant1 || !match.participant2) return false;

  // Match must not already have a winner
  if (match.winner) return false;

  // For byes (same participant twice), auto-advance
  if (match.participant1 === match.participant2) return false;

  return true;
}

/**
 * Generate proper seeding order for bracket
 * For 8 players: 1v8, 4v5, 3v6, 2v7
 * For 16 players: 1v16, 8v9, 4v13, 5v12, 3v14, 6v11, 7v10, 2v15
 */
function generateSeedOrder(bracketSize: number): number[][] {
  if (bracketSize === 2) {
    return [[1, 2]];
  }

  const previousRound = generateSeedOrder(bracketSize / 2);
  const matchups: number[][] = [];

  for (const match of previousRound) {
    // For each match in previous round, create two matches
    // Top seed vs bottom complementary seed
    matchups.push([match[0], bracketSize + 1 - match[0]]);
    matchups.push([match[1], bracketSize + 1 - match[1]]);
  }

  return matchups;
}

/**
 * Generate bracket matches for a tournament
 */
export function generateBracketMatches(participants: Participant[]): Match[] {
  const matches: Match[] = [];
  const numParticipants = participants.length;

  if (numParticipants < 2) {
    return [];
  }

  // Sort participants by seed
  const sortedParticipants = [...participants].sort((a, b) => a.seed - b.seed);

  // Determine bracket size (next power of 2)
  let bracketSize = 2;
  while (bracketSize < numParticipants) {
    bracketSize *= 2;
  }

  // Calculate play-in games needed
  const numPlayInGames = numParticipants - bracketSize / 2;

  let matchNumber = 1;

  // Generate seeding matchups for the full bracket
  const seedMatchups = generateSeedOrder(bracketSize);

  // If we need play-in games, the lower seeds play each other first
  const playInParticipantSeeds: number[] = [];
  if (numPlayInGames > 0) {
    // The bottom seeds need to play in
    // For example, with 5 participants in a bracket of 8:
    // We need 5 - 4 = 1 play-in game
    // Seeds 4 and 5 play each other, winner faces seed 1

    const numDirectQualifiers = bracketSize / 2 - numPlayInGames;

    // Generate play-in matches
    for (let i = 0; i < numPlayInGames; i++) {
      const higherSeedIndex = numDirectQualifiers + i;
      const lowerSeedIndex = numParticipants - 1 - i;

      const p1 = sortedParticipants[higherSeedIndex];
      const p2 = sortedParticipants[lowerSeedIndex];

      matches.push({
        id: `match-${matchNumber}`,
        round: 'round1',
        matchNumber: matchNumber++,
        participant1: p1?.userId || '',
        participant2: p2?.userId || '',
        isPlayIn: true,
      });

      // Track which seeds are in play-ins
      if (p1) playInParticipantSeeds.push(p1.seed);
      if (p2) playInParticipantSeeds.push(p2.seed);
    }
  }

  // Generate first round matches (excluding play-in games)
  const round1MatchCount = bracketSize / 2;

  for (let i = 0; i < round1MatchCount; i++) {
    const [seed1, seed2] = seedMatchups[i];

    // Get participants by seed (seeds are 1-indexed)
    const p1 = sortedParticipants.find(p => p.seed === seed1);
    const p2 = sortedParticipants.find(p => p.seed === seed2);

    // Check if either participant is in a play-in
    const p1InPlayIn = playInParticipantSeeds.includes(seed1);
    const p2InPlayIn = playInParticipantSeeds.includes(seed2);

    // If this is a match that would have a play-in winner, leave slot empty
    let participant1 = '';
    let participant2 = '';

    if (p1 && !p1InPlayIn) {
      participant1 = p1.userId;
    }
    if (p2 && !p2InPlayIn) {
      participant2 = p2.userId;
    }

    // Skip if both participants are in play-ins (this shouldn't happen with proper seeding)
    if (p1InPlayIn && p2InPlayIn) continue;

    // Skip if this match would have no participants (both seeds beyond our participant count)
    if (!participant1 && !participant2 && !p1InPlayIn && !p2InPlayIn) continue;

    matches.push({
      id: `match-${matchNumber}`,
      round: 'round1',
      matchNumber: matchNumber++,
      participant1,
      participant2,
      isPlayIn: false,
    });
  }

  // Calculate how many rounds we need
  const totalRounds = Math.ceil(Math.log2(bracketSize));

  // Generate subsequent rounds
  const roundNames: BracketRound[] = ['round2', 'round3', 'semifinals', 'finals'];
  let matchesInRound = round1MatchCount / 2;

  for (let roundIndex = 0; roundIndex < totalRounds - 1 && roundIndex < roundNames.length; roundIndex++) {
    if (matchesInRound < 1) break;

    for (let i = 0; i < matchesInRound; i++) {
      matches.push({
        id: `match-${matchNumber}`,
        round: roundNames[roundIndex],
        matchNumber: matchNumber++,
        participant1: '',
        participant2: '',
      });
    }
    matchesInRound = matchesInRound / 2;
  }

  return matches;
}

/**
 * Check if tournament is complete (finals has a winner)
 */
export async function checkTournamentComplete(tournamentId: string): Promise<void> {
  try {
    const tournament = await getTournament(tournamentId);
    if (!tournament) return;

    // Find finals match
    const finalsMatch = tournament.matches.find(m => m.round === 'finals');

    if (finalsMatch && finalsMatch.winner) {
      // Tournament is complete
      const docRef = doc(db, TOURNAMENTS_COLLECTION, tournamentId);
      await updateDoc(docRef, {
        status: 'completed'
      });
    }
  } catch (error) {
    console.error('Error checking tournament completion:', error);
  }
}
