// Application Constants

// ===== BET SETTINGS =====
export const DEFAULT_BET_DURATION_MS = 30 * 60 * 1000; // 30 minutes
export const DEFAULT_WAGER = 5;

// ===== QUERY LIMITS =====
export const MAX_GROUPS_PER_USER = 50;
export const MAX_BETS_PER_QUERY = 50;
export const MAX_LEADERBOARD_ENTRIES = 10;
export const MAX_BET_COUNT_QUERY = 10;
export const MAX_STATS_QUERY = 1;

// ===== UI CONSTANTS =====
export const CONTENT_MAX_WIDTH = "500px";
export const COUNTDOWN_UPDATE_INTERVAL = 1000; // 1 second
export const DEFAULT_BETS_TO_SHOW = 5;

// ===== TOUCH TARGET SIZES (WCAG) =====
export const MIN_TOUCH_TARGET_WIDTH = 64; // px
export const MIN_TOUCH_TARGET_HEIGHT = 56; // px

// ===== FONT SIZES (Mobile Accessibility) =====
export const MIN_INPUT_FONT_SIZE = "16px"; // Prevents zoom on iOS
export const MIN_BUTTON_FONT_SIZE = "14px";
export const MIN_TEXT_FONT_SIZE = "14px";

// ===== ACCESS CODE GENERATION =====
export const ACCESS_CODE_LENGTH = 5;
export const ACCESS_CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
export const JOIN_LINK_BASE_URL = "https://sidebet.app/join/";

// ===== FIRESTORE COLLECTIONS =====
export const COLLECTIONS = {
  BETS: "bets",
  GROUPS: "groups",
  USERS: "users",
  LEADERBOARDS: "leaderboards",
} as const;

// ===== BET TYPES =====
export const BET_TYPES = {
  YES_NO: "YES_NO",
  OVER_UNDER: "OVER_UNDER",
  CLOSEST_GUESS: "CLOSEST_GUESS",
} as const;

// ===== BET STATUS =====
export const BET_STATUS = {
  OPEN: "OPEN",
  CLOSED: "CLOSED",
  JUDGED: "JUDGED",
} as const;

// ===== SEASON TYPES =====
export const SEASON_TYPES = {
  NONE: "none",
  MONTHLY: "monthly",
  QUARTERLY: "quarterly",
  YEARLY: "yearly",
} as const;

// ===== INVITE TYPES =====
export const INVITE_TYPES = {
  LINK: "link",
  CODE: "code",
  BOTH: "both",
} as const;

// ===== ERROR MESSAGES =====
export const ERROR_MESSAGES = {
  INVALID_LINE: "Please set a valid line ending in .5 for Over/Under bets.",
  INCOMPLETE_FIELDS: "Please complete all required fields.",
  CREATE_BET_FAILED: "Failed to create bet. Please try again.",
  PLACE_BET_FAILED: "Failed to place bet. Please try again.",
  SIGN_IN_REQUIRED: "You must be signed in to create a group.",
  CREATE_GROUP_FAILED: "Failed to create group. Please try again.",
  JOIN_GROUP_FAILED: "Failed to join group. Please try again.",
  GROUP_NOT_FOUND: "No group found. Please check the code or link.",
  ALREADY_MEMBER: "You're already a member of this group!",
  ENTER_CODE: "Please enter a code or link.",
  LOGOUT_FAILED: "Failed to logout. Please try again.",
  JUDGE_BET_FAILED: "Failed to judge bet. Please try again.",
  INVALID_NUMBER: "Please enter a valid number",
  NO_GUESSES: "No guesses to judge!",
  ENTER_GUESS: "Please enter a guess.",
  LOGIN_FAILED: "Invalid credentials or login error.",
} as const;

// ===== SUCCESS MESSAGES =====
export const SUCCESS_MESSAGES = {
  GROUP_CREATED: "Group created successfully!",
  BET_CREATED: "Bet created successfully!",
  GROUP_JOINED: (groupName: string) => `Successfully joined "${groupName}"`,
  BET_JUDGED: (winners: number, payout: number) =>
    `Bet judged! ${winners} winner${winners !== 1 ? "s" : ""} - $${payout.toFixed(2)} each`,
  LINK_COPIED: "Join link copied!",
  CODE_COPIED: "Access code copied!",
} as const;

// ===== Z-INDEX LAYERS =====
export const Z_INDEX = {
  HEADER: 50,
  FOOTER: 50,
  MODAL: 100,
  JUDGE_MODAL: 200,
} as const;

// ===== TOAST SETTINGS =====
export const TOAST_CONFIG = {
  POSITION: "top-center",
  THEME: "dark",
  RICH_COLORS: true,
} as const;
