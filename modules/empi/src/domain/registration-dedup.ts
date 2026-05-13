import type { CreatePatientData, Patient } from "./patient.types.js";

/**
 * Phase 2 registration dedup — name leg vs legacy Mongo search:
 *
 * Implemented (aligned with legacy findSimilarPatients name helpers):
 * - normalizeName, generatePhoneticKey, weighted edit distance, isPhoneticallySimilar thresholds
 * - Salutation / title stripping (legacy removePrefix) on full_name before compare
 * - Collapsed whitespace
 * - Bidirectional substring on full string (legacy lenient path; safe here because SQL
 *   already requires same phone + gender + not merged)
 *
 * Not ported (different product boundary / datastore):
 * - FILTER_TYPES, validateSearchByFilterType, escapeRegex query builders
 * - Mongo $regex, Visit / ABHA visit hydration, aggregate pipelines, hydrateMasterData
 * - Per-field firstName/middleName/lastName query (EMPI stores single full_name)
 * - getPhoneticCharClass regex expansion (would need pg_trgm / SQL ILIKE for search APIs)
 */

const SALUTATION_PREFIXES = [
  "mr",
  "mrs",
  "ms",
  "dr",
  "md",
  "prof",
  "sir",
  "madam",
  "miss",
  "master",
  "baby",
] as const;

/** Legacy `removePrefix`, applied to leading token of `full_name`. */
export function stripSalutationPrefixFromFullName(fullName: string): string {
  const raw = fullName.trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();
  for (const prefix of SALUTATION_PREFIXES) {
    if (lower.startsWith(`${prefix} `)) {
      const sp = raw.indexOf(" ");
      return raw.slice(sp + 1).trim();
    }
    if (lower.startsWith(`${prefix}.`)) {
      const dot = raw.indexOf(".");
      return raw.slice(dot + 1).trim();
    }
  }
  return raw;
}

function collapseWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Legacy-style bidirectional containment (requires min length to reduce noise). */
function fullNamesBidirectionalSubstring(
  a: string,
  b: string,
  minLen = 4,
): boolean {
  const n1 = collapseWhitespace(a).toLowerCase();
  const n2 = collapseWhitespace(b).toLowerCase();
  if (n1.length < minLen || n2.length < minLen) return false;
  return n1.includes(n2) || n2.includes(n1);
}

// ─── Phonetic name matching (ported from legacy findSimilarPatients / Phase 2) ─

function normalizeName(name: string): string {
  if (!name) return "";

  let normalized = name.toLowerCase().trim();

  normalized = normalized.replace(/aa/g, "a");
  normalized = normalized.replace(/ii/g, "i");
  normalized = normalized.replace(/ee/g, "i");
  normalized = normalized.replace(/oo/g, "u");
  normalized = normalized.replace(/uu/g, "u");
  normalized = normalized.replace(/ie/g, "i");
  normalized = normalized.replace(/ei/g, "i");

  normalized = normalized.replace(/ph/g, "f");
  normalized = normalized.replace(/th/g, "t");

  normalized = normalized.replace(/sh/g, "s");
  normalized = normalized.replace(/ch/g, "c");
  normalized = normalized.replace(/[sz]/g, "s");
  normalized = normalized.replace(/x/g, "s");

  normalized = normalized.replace(/[bv]/g, "b");
  normalized = normalized.replace(/[fp]/g, "f");

  normalized = normalized.replace(/m/g, "n");

  normalized = normalized.replace(/d/g, "t");

  normalized = normalized.replace(/[gk]/g, "k");
  normalized = normalized.replace(/j/g, "g");

  normalized = normalized.replace(/q/g, "k");
  normalized = normalized.replace(/y/g, "j");

  return normalized;
}

/** Enhanced Soundex-like key (legacy `generatePhoneticKey`). */
export function generatePhoneticKey(name: string): string {
  if (!name) return "";

  let s = name.toLowerCase().trim();
  if (!s) return "";

  s = s.replace(/[mn]/g, "n");
  s = s.replace(/[bpv]/g, "b");
  s = s.replace(/[fp]/g, "f");
  s = s.replace(/[dt]/g, "t");
  s = s.replace(/[gk]/g, "k");
  s = s.replace(/j/g, "g");
  s = s.replace(/sh/g, "s");
  s = s.replace(/ch/g, "c");
  s = s.replace(/[sz]/g, "s");
  s = s.replace(/[ck]/g, "k");
  s = s.replace(/y/g, "j");

  let result = s.toUpperCase();
  result = result.replace(/[^A-Z]/g, "");
  if (result.length === 0) return "";

  const firstLetter = result[0] ?? "";

  result = result.replace(/[BFPV]/g, "1");
  result = result.replace(/[CGJKQSXZ]/g, "2");
  result = result.replace(/[DT]/g, "3");
  result = result.replace(/L/g, "4");
  result = result.replace(/[MN]/g, "5");
  result = result.replace(/R/g, "6");

  result = result.replace(/[AEIOUHWY]/g, "");

  let encoded = firstLetter + result;

  encoded = encoded.replace(/(.)\1+/g, "$1");

  const head = encoded.at(0);
  if (head !== undefined && head >= "0" && head <= "9") {
    encoded = encoded.slice(1);
  }

  return encoded.slice(0, 8).padEnd(4, "0");
}

function areSimilarLetters(char1: string, char2: string): boolean {
  // Single-character groups only (legacy editDistance compares char-by-char).
  const similarGroups: string[][] = [
    ["m", "n"],
    ["b", "p", "v"],
    ["f", "p"],
    ["f", "v"],
    ["d", "t"],
    ["g", "k"],
    ["g", "j"],
    ["s", "z"],
    ["c", "k"],
    ["i", "e"],
    ["u", "o"],
    ["y", "j"],
    ["a", "e"],
    ["o", "u"],
  ];

  const c1 = char1.toLowerCase();
  const c2 = char2.toLowerCase();

  if (c1 === c2) return true;

  for (const group of similarGroups) {
    if (group.includes(c1) && group.includes(c2)) return true;
  }

  return false;
}

function editDistance(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array<number>(n + 1).fill(0),
  );

  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]!;
      } else {
        const substitutionCost = areSimilarLetters(
          s1[i - 1] ?? "",
          s2[j - 1] ?? "",
        )
          ? 0.5
          : 1;
        dp[i]![j] = Math.min(
          dp[i - 1]![j]! + 1,
          dp[i]![j - 1]! + 1,
          dp[i - 1]![j - 1]! + substitutionCost,
        );
      }
    }
  }

  return dp[m]![n]!;
}

function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;

  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  if (longer.length === 0) return 1;

  const distance = editDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

/** Legacy `isPhoneticallySimilar` — used for Phase 2 full_name / token comparison. */
export function isPhoneticallySimilar(name1: string, name2: string): boolean {
  if (!name1 || !name2) return false;

  const n1 = name1.toLowerCase().trim();
  const n2 = name2.toLowerCase().trim();

  if (n1 === n2) return true;

  const norm1 = normalizeName(n1);
  const norm2 = normalizeName(n2);

  if (norm1 === norm2) return true;

  const overallSimilarity = calculateSimilarity(n1, n2);
  if (overallSimilarity > 0.65) return true;

  const normalizedSimilarity = calculateSimilarity(norm1, norm2);
  if (normalizedSimilarity > 0.75) return true;

  const key1 = generatePhoneticKey(name1);
  const key2 = generatePhoneticKey(name2);

  if (key1 === key2 && key1.length > 2) return true;

  const consonants1 = n1.replace(/[aeiou]/g, "");
  const consonants2 = n2.replace(/[aeiou]/g, "");

  const consonantSimilarity = calculateSimilarity(consonants1, consonants2);

  const normConsonants1 = norm1.replace(/[aeiou]/g, "");
  const normConsonants2 = norm2.replace(/[aeiou]/g, "");
  const normConsonantSimilarity = calculateSimilarity(
    normConsonants1,
    normConsonants2,
  );

  return consonantSimilarity > 0.55 || normConsonantSimilarity > 0.65;
}

function firstLastAlphaTokens(fullName: string): [string, string] {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .map((p) => p.replace(/[^A-Za-z]/g, ""))
    .filter((p) => p.length > 0);
  if (parts.length === 0) return ["", ""];
  if (parts.length === 1) {
    const t = parts[0] ?? "";
    return [t, t];
  }
  return [parts[0] ?? "", parts[parts.length - 1] ?? ""];
}

/**
 * Phase 2: phonetic similarity on `full_name`.
 * Strips salutations, collapses space, then: exact, substring (legacy lenient), whole-string
 * isPhoneticallySimilar, then first/last token isPhoneticallySimilar (given + family).
 */
export function fullNamesPhoneticallySimilar(
  aFullName: string,
  bFullName: string,
): boolean {
  const a = collapseWhitespace(stripSalutationPrefixFromFullName(aFullName));
  const b = collapseWhitespace(stripSalutationPrefixFromFullName(bFullName));
  if (!a || !b) return false;

  if (a.toLowerCase() === b.toLowerCase()) return true;

  if (fullNamesBidirectionalSubstring(a, b)) return true;

  if (isPhoneticallySimilar(a, b)) return true;

  const [af, al] = firstLastAlphaTokens(a);
  const [bf, bl] = firstLastAlphaTokens(b);
  if (af && bf && al && bl) {
    if (isPhoneticallySimilar(af, bf) && isPhoneticallySimilar(al, bl)) {
      return true;
    }
  }

  return false;
}

/** Approximate age in whole years at `ref` from demographics fields. */
export function estimateAgeYears(
  input: Pick<
    CreatePatientData | Patient,
    "date_of_birth" | "year_of_birth" | "age_years"
  >,
  ref: Date = new Date(),
): number | undefined {
  if (input.age_years != null && Number.isFinite(input.age_years)) {
    return input.age_years;
  }
  if (input.year_of_birth != null && Number.isFinite(input.year_of_birth)) {
    return Math.max(0, ref.getFullYear() - input.year_of_birth);
  }
  if (input.date_of_birth) {
    const d = new Date(`${input.date_of_birth}T12:00:00.000Z`);
    if (Number.isNaN(d.getTime())) return undefined;
    let age = ref.getUTCFullYear() - d.getUTCFullYear();
    const md = ref.getUTCMonth() * 31 + ref.getUTCDate();
    const bd = d.getUTCMonth() * 31 + d.getUTCDate();
    if (md < bd) age -= 1;
    return Math.max(0, age);
  }
  return undefined;
}

/** Both sides must have an estimated age and differ by at most 2 years. */
export function agesWithinTwoYears(
  a: Pick<
    CreatePatientData | Patient,
    "date_of_birth" | "year_of_birth" | "age_years"
  >,
  b: Pick<
    CreatePatientData | Patient,
    "date_of_birth" | "year_of_birth" | "age_years"
  >,
  ref: Date = new Date(),
): boolean {
  const ay = estimateAgeYears(a, ref);
  const by = estimateAgeYears(b, ref);
  if (ay === undefined || by === undefined) return false;
  return Math.abs(ay - by) <= 2;
}

export type DedupMatchedField =
  | "phone_number"
  | "gender"
  | "full_name"
  | "age";

export interface DuplicateRegistrationResponse {
  potential_duplicate: true;
  existing_patient: Patient;
  match_details: { matched_fields: DedupMatchedField[] };
}

export function evaluateDedupAgainstCandidate(
  candidate: Patient,
  incoming: CreatePatientData,
  incomingFullName: string,
  refDate: Date = new Date(),
): DuplicateRegistrationResponse | undefined {
  const nameMatch = fullNamesPhoneticallySimilar(
    candidate.full_name,
    incomingFullName,
  );
  const ageMatch = agesWithinTwoYears(candidate, incoming, refDate);
  if (!nameMatch || !ageMatch) return undefined;

  const matched_fields: DedupMatchedField[] = [
    "phone_number",
    "gender",
    ...(nameMatch ? (["full_name"] as const satisfies readonly DedupMatchedField[]) : []),
    ...(ageMatch ? (["age"] as const satisfies readonly DedupMatchedField[]) : []),
  ];
  return {
    potential_duplicate: true,
    existing_patient: candidate,
    match_details: { matched_fields },
  };
}
