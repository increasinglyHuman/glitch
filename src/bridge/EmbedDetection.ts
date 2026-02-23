/**
 * Detect whether Glitch is running inside an iframe.
 * Pattern from Landscaper's demo/main.ts.
 */
export function isEmbedded(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true; // Cross-origin restriction = definitely iframe
  }
}

/** Extract the parent page's origin from document.referrer. */
export function getParentOrigin(): string | null {
  if (!isEmbedded()) return null;
  try {
    const url = new URL(document.referrer);
    return url.origin;
  } catch {
    return null;
  }
}
