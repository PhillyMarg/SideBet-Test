export function generateBetShareLink(betId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://side-bet-test.vercel.app';
  return `${baseUrl}/bet/${betId}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
}
