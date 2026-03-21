import { useState, useCallback } from "react";

/**
 * Copies text to the clipboard and tracks the "copied" state
 * for a brief feedback period (default 2 s).
 */
export function useCopyToClipboard(timeout = 2000) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), timeout);
    } catch {
      // Clipboard blocked — nothing to do
    }
  }, [timeout]);

  return { copied, copy };
}
