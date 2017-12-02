/**
 * A location in the source text.
 */
export interface Location {
  source: string;
  line: number;
  column: number;
}

export function copyLoc(loc: Location) {
  return { source: loc.source, line: loc.line, column: loc.column };
}