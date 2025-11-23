import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Tournament, CreateTournamentInput, TournamentStatus } from '@/types/tournament';

const TOURNAMENTS_COLLECTION = 'tournaments';

/**
 * Generate a random 6-character access code for private tournaments
 */
function generateAccessCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding confusing characters
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Determine tournament status based on dates
 */
function determineTournamentStatus(startDate: string, endDate: string): TournamentStatus {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (now < start) return 'upcoming';
  if (now >= start && now <= end) return 'live';
  return 'completed';
}

/**
 * Create a new tournament
 */
export async function createTournament(input: CreateTournamentInput): Promise<string> {
  try {
    const startDateTime = `${input.startDate}T${input.startTime}`;
    const endDateTime = `${input.endDate}T${input.endTime}`;
    const status = determineTournamentStatus(startDateTime, endDateTime);

    const tournamentData: Omit<Tournament, 'id'> = {
      name: input.name,
      description: input.description || '',
      creatorId: input.creatorId,
      creatorName: input.creatorName,
      startDate: startDateTime,
      startTime: input.startTime,
      endDate: endDateTime,
      endTime: input.endTime,
      createdAt: new Date().toISOString(),
      type: input.type,
      bracketSize: input.bracketSize,
      isPublic: input.isPublic,
      status,
      participants: [],
      maxParticipants: input.bracketSize,
      matches: [],
      currentRound: 'round1',
      accessCode: input.isPublic ? undefined : generateAccessCode(),
      invitedUserIds: [],
      totalBets: 0,
      totalBetAmount: 0,
    };

    const docRef = await addDoc(collection(db, TOURNAMENTS_COLLECTION), tournamentData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating tournament:', error);
    throw error;
  }
}

/**
 * Get tournament by ID
 */
export async function getTournament(tournamentId: string): Promise<Tournament | null> {
  try {
    const docRef = doc(db, TOURNAMENTS_COLLECTION, tournamentId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Tournament;
    }
    return null;
  } catch (error) {
    console.error('Error getting tournament:', error);
    throw error;
  }
}

/**
 * Get all tournaments (with optional filters)
 */
export async function getTournaments(filters?: {
  status?: TournamentStatus;
  isPublic?: boolean;
  creatorId?: string;
}): Promise<Tournament[]> {
  try {
    let q = query(collection(db, TOURNAMENTS_COLLECTION));

    // Build query with filters
    const constraints: any[] = [];

    if (filters?.status) {
      constraints.push(where('status', '==', filters.status));
    }

    if (filters?.isPublic !== undefined) {
      constraints.push(where('isPublic', '==', filters.isPublic));
    }

    if (filters?.creatorId) {
      constraints.push(where('creatorId', '==', filters.creatorId));
    }

    // Apply constraints and ordering
    if (constraints.length > 0) {
      q = query(collection(db, TOURNAMENTS_COLLECTION), ...constraints, orderBy('startDate', 'desc'), limit(50));
    } else {
      q = query(collection(db, TOURNAMENTS_COLLECTION), orderBy('startDate', 'desc'), limit(50));
    }

    const querySnapshot = await getDocs(q);
    const tournaments: Tournament[] = [];

    querySnapshot.forEach((doc) => {
      tournaments.push({ id: doc.id, ...doc.data() } as Tournament);
    });

    return tournaments;
  } catch (error) {
    console.error('Error getting tournaments:', error);
    throw error;
  }
}

/**
 * Update tournament status (called periodically or on page load)
 */
export async function updateTournamentStatus(tournamentId: string): Promise<void> {
  try {
    const tournament = await getTournament(tournamentId);
    if (!tournament) return;

    const newStatus = determineTournamentStatus(tournament.startDate, tournament.endDate);

    if (tournament.status !== newStatus) {
      const docRef = doc(db, TOURNAMENTS_COLLECTION, tournamentId);
      await updateDoc(docRef, { status: newStatus });
    }
  } catch (error) {
    console.error('Error updating tournament status:', error);
    throw error;
  }
}

/**
 * Delete tournament (creator only)
 */
export async function deleteTournament(tournamentId: string): Promise<void> {
  try {
    const docRef = doc(db, TOURNAMENTS_COLLECTION, tournamentId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting tournament:', error);
    throw error;
  }
}

/**
 * Add participant to tournament
 */
export async function addParticipant(
  tournamentId: string,
  userId: string,
  userName: string
): Promise<void> {
  try {
    const tournament = await getTournament(tournamentId);
    if (!tournament) throw new Error('Tournament not found');

    if (tournament.participants.length >= tournament.maxParticipants) {
      throw new Error('Tournament is full');
    }

    if (tournament.participants.some(p => p.userId === userId)) {
      throw new Error('User already in tournament');
    }

    const newParticipant = {
      userId,
      userName,
      seed: tournament.participants.length + 1, // Temporary seed, will be reassigned
      eliminated: false,
      currentRound: 'round1' as const,
    };

    const docRef = doc(db, TOURNAMENTS_COLLECTION, tournamentId);
    await updateDoc(docRef, {
      participants: [...tournament.participants, newParticipant]
    });
  } catch (error) {
    console.error('Error adding participant:', error);
    throw error;
  }
}

/**
 * Get user's tournaments
 */
export async function getUserTournaments(userId: string): Promise<{
  created: Tournament[];
  participating: Tournament[];
}> {
  try {
    // Get tournaments created by user
    const createdQuery = query(
      collection(db, TOURNAMENTS_COLLECTION),
      where('creatorId', '==', userId),
      orderBy('startDate', 'desc'),
      limit(50)
    );
    const createdSnapshot = await getDocs(createdQuery);
    const created: Tournament[] = [];
    createdSnapshot.forEach((doc) => {
      created.push({ id: doc.id, ...doc.data() } as Tournament);
    });

    // Get all tournaments to filter ones user is participating in
    const allTournaments = await getTournaments();
    const participating = allTournaments.filter(t =>
      t.participants.some(p => p.userId === userId) && t.creatorId !== userId
    );

    return { created, participating };
  } catch (error) {
    console.error('Error getting user tournaments:', error);
    throw error;
  }
}
