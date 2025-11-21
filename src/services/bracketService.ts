import {
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Tournament, Match, BracketRound, Participant } from '@/types/tournament';
import { getTournament } from './tournamentService';

const TOURNAMENTS_COLLECTION = 'tournaments';

/**
 * Get participant name by userId
 */
export function getParticipantName(userId: string, participants: Participant[]): string {
  const participant = participants.find(p => p.userId === userId);
  return participant?.userName || 'Unknown';
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
 * Generate bracket matches for a tournament
 */
export function generateBracketMatches(participants: Participant[]): Match[] {
  const matches: Match[] = [];
  const numParticipants = participants.length;

  // Determine bracket size (next power of 2)
  let bracketSize = 2;
  while (bracketSize < numParticipants) {
    bracketSize *= 2;
  }

  // Calculate number of rounds
  const numRounds = Math.log2(bracketSize);

  // Calculate play-in games needed
  const numPlayInGames = numParticipants - bracketSize / 2;
  const numByes = bracketSize / 2 - numPlayInGames;

  let matchNumber = 1;

  // Generate play-in matches if needed
  if (numPlayInGames > 0) {
    for (let i = 0; i < numPlayInGames; i++) {
      const p1Index = bracketSize / 2 + i * 2;
      const p2Index = bracketSize / 2 + i * 2 + 1;

      matches.push({
        id: `match-${matchNumber}`,
        round: 'round1',
        matchNumber: matchNumber++,
        participant1: participants[p1Index]?.userId || '',
        participant2: participants[p2Index]?.userId || '',
        isPlayIn: true,
      });
    }
  }

  // Generate first round matches
  const round1Matches = bracketSize / 2;
  for (let i = 0; i < round1Matches; i++) {
    // Seed matchups: 1v16, 8v9, 5v12, 4v13, 3v14, 6v11, 7v10, 2v15
    const topSeed = i;
    const bottomSeed = bracketSize - 1 - i;

    matches.push({
      id: `match-${matchNumber}`,
      round: 'round1',
      matchNumber: matchNumber++,
      participant1: participants[topSeed]?.userId || '',
      participant2: participants[bottomSeed]?.userId || '',
    });
  }

  // Generate subsequent rounds
  const roundNames: BracketRound[] = ['round2', 'round3', 'semifinals', 'finals'];
  let matchesInRound = round1Matches / 2;
  let roundIndex = 0;

  while (matchesInRound >= 1 && roundIndex < roundNames.length) {
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
    roundIndex++;
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
