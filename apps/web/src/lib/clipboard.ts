/**
 * Copy text to the clipboard, working in both secure and non-secure contexts.
 *
 * The async Clipboard API (`navigator.clipboard`) is only available in secure
 * contexts (HTTPS or localhost). When the app is served over plain HTTP — e.g.
 * an EC2 instance reached by IP — `navigator.clipboard` is `undefined`, so we
 * fall back to the legacy `document.execCommand('copy')` via a hidden textarea.
 *
 * Returns true if the copy succeeded.
 */
export async function copyText(text: string): Promise<boolean> {
  // Preferred path — async Clipboard API (secure contexts only)
  try {
    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof window !== 'undefined' &&
      window.isSecureContext
    ) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }

  // Fallback — works over http:// (non-secure contexts)
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
