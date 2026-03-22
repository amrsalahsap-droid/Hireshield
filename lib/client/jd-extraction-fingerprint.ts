/**
 * Stable fingerprint for JD extraction JSON so UI can remount / reset when analysis
 * body changes even if timestamps or prompt versions were unchanged.
 */
export function fingerprintJdExtractionJson(json: unknown): string {
  if (json == null) return "";
  try {
    const s = JSON.stringify(json);
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  } catch {
    return "x";
  }
}
