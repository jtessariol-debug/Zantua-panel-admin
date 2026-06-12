const INTERNAL_AUTH_DOMAIN = "zantua.internal";

export function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

export function buildInternalEmailFromUsername(username) {
  return `${normalizeUsername(username)}@${INTERNAL_AUTH_DOMAIN}`;
}

export function isEmailLike(value) {
  return /\S+@\S+\.\S+/.test(String(value || "").trim());
}

export function deriveUsernameFromEmail(email) {
  return normalizeUsername(String(email || "").split("@")[0]);
}
