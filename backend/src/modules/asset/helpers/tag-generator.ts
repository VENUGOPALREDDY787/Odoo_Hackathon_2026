/**
 * Utility helper to generate sequential alphanumeric asset tags.
 * Format: AF-XXXXXX (e.g., AF-000001, AF-000002)
 */
export class TagGenerator {
  static generateNextTag(lastTag: string | null): string {
    const PREFIX = 'AF-';
    const PADDING_LENGTH = 6;
    const DEFAULT_START = 1;

    if (!lastTag) {
      return `${PREFIX}${String(DEFAULT_START).padStart(PADDING_LENGTH, '0')}`;
    }

    const numericPartStr = lastTag.replace(PREFIX, '');
    const numericValue = parseInt(numericPartStr, 10);

    if (isNaN(numericValue)) {
      return `${PREFIX}${String(DEFAULT_START).padStart(PADDING_LENGTH, '0')}`;
    }

    const nextValue = numericValue + 1;
    return `${PREFIX}${String(nextValue).padStart(PADDING_LENGTH, '0')}`;
  }
}
export default TagGenerator;
