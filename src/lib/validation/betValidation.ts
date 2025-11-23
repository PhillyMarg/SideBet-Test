/**
 * Validation utilities for bet creation and operations
 */

export interface BetValidationResult {
  valid: boolean;
  error?: string;
}

export interface BetCreationData {
  title: string;
  description?: string;
  betAmount?: number;
  closingTime: string;
  type?: string;
  line?: number;
}

/**
 * Validates bet creation data before submitting to Firestore
 */
export function validateBetCreation(data: BetCreationData): BetValidationResult {
  // Title validation
  if (!data.title || data.title.trim().length < 3) {
    return { valid: false, error: 'Title must be at least 3 characters' };
  }
  if (data.title.length > 200) {
    return { valid: false, error: 'Title must be less than 200 characters' };
  }

  // Wager validation
  if (data.betAmount !== undefined) {
    if (data.betAmount < 0.01) {
      return { valid: false, error: 'Bet amount must be at least $0.01' };
    }
    if (data.betAmount > 10000) {
      return { valid: false, error: 'Bet amount must be less than $10,000' };
    }
  }

  // Closing time validation
  const closingTime = new Date(data.closingTime);
  const now = new Date();

  if (isNaN(closingTime.getTime())) {
    return { valid: false, error: 'Invalid closing time' };
  }

  if (closingTime <= now) {
    return { valid: false, error: 'Closing time must be in the future' };
  }

  // Max 30 days in future
  const maxDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  if (closingTime > maxDate) {
    return { valid: false, error: 'Closing time cannot be more than 30 days in the future' };
  }

  // Over/Under line validation
  if (data.type === 'OVER_UNDER') {
    if (data.line === undefined || data.line === null) {
      return { valid: false, error: 'Over/Under bets require a line value' };
    }
  }

  return { valid: true };
}

/**
 * Validates bet deletion permissions and requirements
 */
export function validateBetDeletion(
  betCreatorId: string,
  currentUserId: string,
  participantCount: number
): BetValidationResult {
  // Creator check
  if (betCreatorId !== currentUserId) {
    return { valid: false, error: 'Only the bet creator can delete this bet' };
  }

  // Warn about participants (caller should confirm with user)
  if (participantCount > 0) {
    return {
      valid: true,
      error: `${participantCount} people have placed bets. Their wagers will be voided.`
    };
  }

  return { valid: true };
}

/**
 * Validates bet judging permissions and requirements
 */
export function validateBetJudging(
  betCreatorId: string,
  currentUserId: string,
  betStatus: string,
  closingTime: string
): BetValidationResult {
  // Creator check
  if (betCreatorId !== currentUserId) {
    return { valid: false, error: 'Only the bet creator can judge this bet' };
  }

  // Bet must be closed (past closing time)
  const closingDate = new Date(closingTime);
  const now = new Date();
  if (now < closingDate) {
    return { valid: false, error: 'Bet must be closed before judging' };
  }

  // Status check
  if (betStatus === 'JUDGED') {
    return { valid: false, error: 'This bet has already been judged' };
  }

  if (betStatus === 'VOID') {
    return { valid: false, error: 'This bet has been voided' };
  }

  return { valid: true };
}

/**
 * Validates tournament director permissions
 */
export function validateTournamentDirector(
  tournamentDirectorId: string,
  currentUserId: string
): BetValidationResult {
  if (tournamentDirectorId !== currentUserId) {
    return { valid: false, error: 'Only the tournament director can perform this action' };
  }
  return { valid: true };
}
