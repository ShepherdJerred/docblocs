import { Location } from "../ast/location";

/**
 * Error raised when parsing fails.
 */
export class ParseError extends Error {
  message: string;
  stack: string;
  source: string;
  line: number;
  column: number;

  constructor(message: string,
              loc: Location) {
    super(message);
    this.source = loc.source;
    this.line = loc.line;
    this.column = loc.column;
    this.stack = `ParseError: ${message}\n    at <${loc.source}>:${loc.line}:${loc.column}`;
  }

  toString(): string {
    return `${this.message} at ${this.line}:${this.column}`;
  }
}

(<any>ParseError.prototype).name = 'ParseError';


/**
 * Error raised when rendering fails.
 */
export class RenderError extends Error {
  message: string;
  stack: string;
  source: string;
  line: number;
  column: number;

  constructor(message: string,
              loc: Location) {
    super(message);
    this.source = loc.source;
    this.line = loc.line;
    this.column = loc.column;
    this.stack = `RenderError: ${message}\n    at <${loc.source}>:${loc.line}:${loc.column}`;
  }

  toString(): string {
    return `${this.message} at ${this.line}:${this.column}`;
  }
}

(<any>RenderError.prototype).name = 'RenderError';
