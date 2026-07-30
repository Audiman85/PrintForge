/**
 * Post-auth deep-return helper.
 * Stashes the intended landing path in sessionStorage before redirecting to
 * Emergent Google auth, so the AuthCallback can hand the user back to where
 * they left off (Buy Now, wishlist, community upload etc.).
 */
const KEY = "printforge.post_auth_return";

export function loginWithReturn(returnPath) {
  const path = returnPath || (window.location.pathname + window.location.search + window.location.hash);
  try { sessionStorage.setItem(KEY, path); } catch {}
  const redirectUrl = window.location.origin + "/dashboard";
  window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
}

export function consumeReturnPath(fallback = "/dashboard") {
  try {
    const p = sessionStorage.getItem(KEY);
    if (p) sessionStorage.removeItem(KEY);
    return p || fallback;
  } catch { return fallback; }
}
