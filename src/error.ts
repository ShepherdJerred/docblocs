import { Location } from "./ast/location";

/**
 * Error raised when parsing fails.
 */
export class ParseError extends Error {
  fileName: string;
  lineNumber: number;
  columnNumber: number;

  constructor(message: string,
              loc: Location) {
    super(message);
    this.fileName = loc.source;
    this.lineNumber = loc.line;
    this.columnNumber = loc.column;
    this.name = 'ParseError';
    //this.stack = `ParseError: ${message}\n    at <${loc.source}>:${loc.line}:${loc.column}`;
  }

  toString(): string {
    return `${this.message} at ${this.lineNumber}:${this.columnNumber}`;
  }
}

(<any>ParseError.prototype).name = 'ParseError';


/**
 * Error raised when rendering fails.
 */
export class RenderError extends Error {
  fileName: string;
  lineNumber: number;
  columnNumber: number;

  constructor(message: string,
              loc: Location) {
    super(message);
    this.fileName = loc.source;
    this.lineNumber = loc.line;
    this.columnNumber = loc.column;
    this.name = 'RenderError';
    //this.stack = `RenderError: ${message}\n    at <${loc.source}>:${loc.line}:${loc.column}`;
  }

  toString(): string {
    return `${this.message} at ${this.lineNumber}:${this.columnNumber}`;
  }
}

(<any>RenderError.prototype).name = 'RenderError';
