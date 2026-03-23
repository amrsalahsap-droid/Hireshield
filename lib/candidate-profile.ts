/** Minimum length for CV/resume text to count as an identifying field. */
export const MIN_CV_IDENTITY_LENGTH = 15;

/** Normalize email for comparison and storage (lowercase, trim). */
export function normalizeEmail(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

/**
 * Normalize phone: trim, remove spaces/dashes/parens; keep leading + and digits.
 */
export function normalizePhone(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  const hasPlus = raw.startsWith("+");
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return hasPlus ? `+${digits}` : digits;
}

/** Trim; if it looks like a URL without scheme, prepend https:// */
export function normalizeProfileUrl(value: string | null | undefined): string {
  let s = (value ?? "").trim();
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) {
    if (/^[\w.-]+\.\w{2,}/i.test(s)) {
      s = `https://${s}`;
    }
  }
  try {
    const u = new URL(s);
    u.hostname = u.hostname.toLowerCase();
    return u.toString();
  } catch {
    return s;
  }
}

/** Collapse internal whitespace, trim (for display and name matching). */
export function normalizeDisplayName(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

export function identityRequirementMessage(): string {
  return `Resume or CV text is required (${MIN_CV_IDENTITY_LENGTH}+ characters). Email, phone, and profile URL are optional.`;
}

const MAX_NAME = 200;
const MAX_EMAIL_LEN = 320;
const MAX_PHONE_LEN = 40;
const MAX_PROFILE_URL_LEN = 2048;
const MAX_CV = 20000;

export type ParsedCandidateCreate = {
  fullName: string;
  email: string | null;
  phone: string | null;
  profileUrl: string | null;
  rawCVText: string;
};

/**
 * Parse and validate candidate create fields from JSON body (standalone or job create-and-assign).
 */
export function parseAndValidateCandidateCreate(body: Record<string, unknown>):
  | { ok: true; value: ParsedCandidateCreate }
  | { ok: false; error: string; field?: string } {
  const fullNameRaw = body.fullName;
  if (typeof fullNameRaw !== "string" || fullNameRaw.trim().length === 0) {
    return { ok: false, error: "Full name is required.", field: "fullName" };
  }
  const fullName = normalizeDisplayName(fullNameRaw);
  if (fullName.length > MAX_NAME) {
    return { ok: false, error: `Full name must be at most ${MAX_NAME} characters.`, field: "fullName" };
  }

  let email: string | null = null;
  if (body.email != null) {
    if (typeof body.email !== "string") {
      return { ok: false, error: "Email must be a string.", field: "email" };
    }
    const e = normalizeEmail(body.email);
    if (e) {
      if (e.length > MAX_EMAIL_LEN) {
        return { ok: false, error: "Email is too long.", field: "email" };
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
        return { ok: false, error: "Email must be a valid email address.", field: "email" };
      }
      email = e;
    }
  }

  let phone: string | null = null;
  if (body.phone != null) {
    if (typeof body.phone !== "string") {
      return { ok: false, error: "Phone must be a string.", field: "phone" };
    }
    const p = normalizePhone(body.phone);
    if (p && p.length > MAX_PHONE_LEN) {
      return { ok: false, error: "Phone is too long.", field: "phone" };
    }
    phone = p || null;
  }

  let profileUrl: string | null = null;
  if (body.profileUrl != null) {
    if (typeof body.profileUrl !== "string") {
      return { ok: false, error: "Profile URL must be a string.", field: "profileUrl" };
    }
    const u = normalizeProfileUrl(body.profileUrl);
    if (u.length > MAX_PROFILE_URL_LEN) {
      return { ok: false, error: "Profile URL is too long.", field: "profileUrl" };
    }
    profileUrl = u || null;
  }

  if (body.rawCVText == null) {
    return {
      ok: false,
      error: identityRequirementMessage(),
      field: "rawCVText",
    };
  }
  if (typeof body.rawCVText !== "string") {
    return { ok: false, error: "Resume text must be a string.", field: "rawCVText" };
  }
  const rawCVText = body.rawCVText;
  if (rawCVText.trim().length < MIN_CV_IDENTITY_LENGTH) {
    return {
      ok: false,
      error: `Resume or CV text must be at least ${MIN_CV_IDENTITY_LENGTH} characters.`,
      field: "rawCVText",
    };
  }
  if (rawCVText.length > MAX_CV) {
    return { ok: false, error: `Resume text must be at most ${MAX_CV} characters.`, field: "rawCVText" };
  }

  return {
    ok: true,
    value: { fullName, email, phone, profileUrl, rawCVText },
  };
}
