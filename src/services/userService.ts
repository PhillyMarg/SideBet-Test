import {
  collection,
  query,
  where,
  getDocs,
  limit,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

export interface UserSearchResult {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
}

/**
 * Search for users by name or email
 */
export async function searchUsers(searchQuery: string): Promise<UserSearchResult[]> {
  try {
    if (!searchQuery.trim()) return [];

    const usersRef = collection(db, 'users');
    const searchLower = searchQuery.toLowerCase();

    // Search by display name
    const nameQuery = query(
      usersRef,
      where('displayName_lower', '>=', searchLower),
      where('displayName_lower', '<=', searchLower + '\uf8ff'),
      limit(10)
    );

    const nameSnapshot = await getDocs(nameQuery);
    const results: UserSearchResult[] = [];

    nameSnapshot.forEach((doc) => {
      const data = doc.data();
      results.push({
        uid: doc.id,
        displayName: data.displayName || data.email,
        email: data.email,
        photoURL: data.photoURL
      });
    });

    // Also search by email if no name matches
    if (results.length === 0 && searchQuery.includes('@')) {
      const emailQuery = query(
        usersRef,
        where('email', '==', searchQuery.toLowerCase()),
        limit(5)
      );

      const emailSnapshot = await getDocs(emailQuery);
      emailSnapshot.forEach((doc) => {
        const data = doc.data();
        results.push({
          uid: doc.id,
          displayName: data.displayName || data.email,
          email: data.email,
          photoURL: data.photoURL
        });
      });
    }

    return results;
  } catch (error) {
    console.error('Error searching users:', error);
    throw error;
  }
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<UserSearchResult | null> {
  try {
    const userRef = doc(db, 'users', userId);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) return null;

    const data = snapshot.data();

    return {
      uid: snapshot.id,
      displayName: data.displayName || data.email,
      email: data.email,
      photoURL: data.photoURL
    };
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
}
