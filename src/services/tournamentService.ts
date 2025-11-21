import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Tournament } from '@/types/tournament';

export async function getTournament(tournamentId: string): Promise<Tournament | null> {
  try {
    const docRef = doc(db, 'tournaments', tournamentId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return {
      id: docSnap.id,
      ...docSnap.data()
    } as Tournament;
  } catch (error) {
    console.error('Error fetching tournament:', error);
    throw error;
  }
}

export async function getTournaments(): Promise<Tournament[]> {
  try {
    const tournamentsRef = collection(db, 'tournaments');
    const querySnapshot = await getDocs(tournamentsRef);

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Tournament[];
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    throw error;
  }
}

export async function getPublicTournaments(): Promise<Tournament[]> {
  try {
    const tournamentsRef = collection(db, 'tournaments');
    const q = query(tournamentsRef, where('isPublic', '==', true));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Tournament[];
  } catch (error) {
    console.error('Error fetching public tournaments:', error);
    throw error;
  }
}

export async function getUserTournaments(userId: string): Promise<Tournament[]> {
  try {
    const tournamentsRef = collection(db, 'tournaments');
    const q = query(tournamentsRef, where('creatorId', '==', userId));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Tournament[];
  } catch (error) {
    console.error('Error fetching user tournaments:', error);
    throw error;
  }
}
