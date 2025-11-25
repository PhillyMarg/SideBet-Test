// src/types/ledger.ts

/**
 * Ledger Entry Interface
 * Represents money owed between two users after a bet is judged
 */
export interface LedgerEntry {
  id?: string;                    // Auto-generated Firestore doc ID

  // The two users involved
  fromUserId: string;             // Person who OWES money
  fromUserName: string;           // Their display name
  fromUserVenmo?: string;         // Their Venmo username (if exists)

  toUserId: string;               // Person who is OWED money
  toUserName: string;             // Their display name
  toUserVenmo?: string;           // Their Venmo username (if exists)

  amount: number;                 // Dollar amount owed

  // Context
  betId: string;                  // Which bet this came from
  betTitle: string;               // Bet question for reference
  groupId: string;                // Which group
  groupName: string;              // Group name for display

  // Status
  settled: boolean;               // Has this been paid?
  settledAt?: string;             // When it was marked settled (ISO string)

  // Timestamps
  createdAt: string;              // When the bet was judged (ISO string)
}

/**
 * Consolidated balance per person
 * Used in the Balances tab to show net amounts owed/owing
 */
export interface PersonBalance {
  userId: string;
  userName: string;
  venmoUsername?: string;
  netAmount: number;              // Positive = they owe me, Negative = I owe them
  bets: {
    betId: string;
    betTitle: string;
    amount: number;               // Positive or negative
  }[];
}
