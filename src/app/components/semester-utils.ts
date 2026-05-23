export const ALL_SEMESTERS_VALUE = 'all';

function normalizeSchoolYear(value: string): string {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return '';
  }

  const match = raw.match(/^(\d{4})\s*[-/]\s*(\d{2}|\d{4})$/);
  if (!match) {
    return raw;
  }

  const startYear = match[1];
  const endYear = match[2].length === 2 ? `${startYear.slice(0, 2)}${match[2]}` : match[2];
  return `${startYear}-${endYear}`;
}

function detectSemesterPrefix(value: string): string | null {
  const normalized = value.toLowerCase();

  if (/\b(?:1(?:st)?|first)\b/.test(normalized)) {
    return '1st Semester';
  }

  if (/\b(?:2(?:nd)?|second)\b/.test(normalized)) {
    return '2nd Semester';
  }

  if (/\bsummer\b/.test(normalized)) {
    return 'Summer';
  }

  return null;
}

function hasSchoolYear(value: string): boolean {
  return /\b\d{4}(?:\s*[-/]\s*\d{2,4})?\b/.test(value);
}

export function normalizeSemesterLabel(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return 'Not Set';
  }

  const collapsed = raw.replace(/\s+/g, ' ').trim();
  if (collapsed.toLowerCase() === 'not set') {
    return 'Not Set';
  }

  const prefix = detectSemesterPrefix(collapsed);
  const yearMatch = collapsed.match(/\b\d{4}(?:\s*[-/]\s*\d{2,4})?\b/);
  const normalizedYear = yearMatch ? normalizeSchoolYear(yearMatch[0]) : '';

  if (prefix) {
    return normalizedYear ? `${prefix} ${normalizedYear}` : prefix;
  }

  if (normalizedYear) {
    return normalizedYear;
  }

  return collapsed;
}

export function buildSemesterLabel(semesterName: unknown, schoolYear: unknown): string {
  const semesterNameText = String(semesterName ?? '').trim();
  const schoolYearText = String(schoolYear ?? '').trim();

  if (!semesterNameText && !schoolYearText) {
    return 'Not Set';
  }

  if (semesterNameText && hasSchoolYear(semesterNameText)) {
    return normalizeSemesterLabel(semesterNameText);
  }

  const combined = [semesterNameText, schoolYearText].filter(Boolean).join(' ');
  return normalizeSemesterLabel(combined);
}

function semesterSortRank(label: string): number {
  const normalized = normalizeSemesterLabel(label).toLowerCase();

  if (normalized.startsWith('1st semester')) {
    return 1;
  }

  if (normalized.startsWith('2nd semester')) {
    return 2;
  }

  if (normalized.startsWith('summer')) {
    return 3;
  }

  return 99;
}

export function sortSemesterLabels(labels: string[]): string[] {
  return [...new Set(labels.map((label) => normalizeSemesterLabel(label)).filter((label) => label !== 'Not Set'))].sort((left, right) => {
    const rankDiff = semesterSortRank(left) - semesterSortRank(right);
    if (rankDiff !== 0) {
      return rankDiff;
    }

    return left.localeCompare(right);
  });
}

export function matchesSemesterSelection(label: string, selectedSemester: string): boolean {
  return selectedSemester === ALL_SEMESTERS_VALUE || normalizeSemesterLabel(label) === selectedSemester;
}