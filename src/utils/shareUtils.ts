// src/utils/shareUtils.ts

/**
 * Generate a shareable link for a bet
 * @param betId - The ID of the bet to share
 * @returns The full URL to the bet
 */
export function generateBetShareLink(betId: string): string {
  // Use window.location.origin for the base URL in browser
  // This ensures the link works in any environment (localhost, staging, production)
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/bets/${betId}`;
  }
  // Fallback for server-side rendering
  return `/bets/${betId}`;
}

/**
 * Copy text to clipboard using the Clipboard API
 * @param text - The text to copy to clipboard
 * @returns Promise that resolves to true if successful, false otherwise
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // Modern Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // Fallback for older browsers or non-secure contexts
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    const success = document.execCommand('copy');
    document.body.removeChild(textArea);

    return success;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}
