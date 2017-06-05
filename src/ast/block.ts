import { Token,
         Expression,
         LValue,
         Identifier     } from "./node";
import { Template,
         TemplateParams } from "./template";
import { Location       } from "./location";
import { ParseError     } from "../exec/error";
import { Dictionary,
         Maybe          } from "../util";

export interface BlockData extends Location {
  comment?:    boolean;
  open?:       boolean;
  close?:      boolean;
  implicit?:   boolean;
  assignThis?: Token;
  expr?:       Expression;
  assign?:     Token;
  target?:     Expression;
  params?:     TemplateParams;
}

export class Block implements Location {
  source: string;
  line: number;
  column: number;
  expr: Expression;
  contents: Maybe<Template>;
  injections: Injection[] = [];

  constructor(expr: Expression, contents: Maybe<Template>, loc: Location) {
    this.source = loc.source;
    this.line = loc.line;
    this.column = loc.column;
    this.contents = contents;
    this.expr = expr;
  }

}

export class Assignment extends Block {
  target: LValue;
  operator: Token;

  constructor(target: LValue,
              operator: Token,
              expr: Expression,
              contents: Maybe<Template>,
              loc: Location             ) {
    super(expr, contents, loc);
    this.target = target;
    this.operator = operator;
  }
}

export class Injection extends Block {
  target: Identifier;
  operator: Token;

  constructor(target: Identifier,
              operator: Token,
              expr: Expression,
              contents: Maybe<Template>,
              loc: Location             ) {
    super(expr, contents, loc);
    this.target = target;
    this.operator = operator;
  }
}

export function makeBlock(data: BlockData): Block {
  let contents: Maybe<Template>;
  if (data.open) {
    contents = new Template(data.params);
  }
  if (data.assign && data.assignThis) {
    throw new ParseError("Multiple assignment operators", data.assign)
  }
  else if (data.assign) {
    if (data.assign.value.endsWith(':')) {
      if (data.target instanceof Identifier) {
        return new Injection(data.target, data.assign, data.expr as Expression, contents, data);
      }
      else {
        throw new ParseError("Not an identifier", data.target as Expression);
      }
    }
    else {
      if (data.target instanceof LValue) {
        return new Assignment(data.target, data.assign, data.expr as Expression, contents, data);
      }
      else {
        throw new ParseError("Not an lvalue", data.target || data);
      }
    }
  }
  else if (data.assignThis) {
    if (data.assignThis.value.endsWith(':')) {
      if (data.expr instanceof Identifier) {
        let thisContents = new Identifier("thisContents", data.assignThis);
        return new Injection(data.expr, data.assignThis, thisContents, contents, data);
      }
      else {
        throw new ParseError("Not an identifier", data.expr as Expression);
      }
    }
    else {
      if (data.expr instanceof LValue) {
        let thisContents = new Identifier("thisContents", data.assignThis);
        return new Assignment(data.expr, data.assignThis, thisContents, contents, data);
      }
      else {
        throw new ParseError("Not an lvalue", data.expr || data);
      }
    }
  }
  else if (data.expr) {
    return new Block(data.expr, contents, data);
  }
  else {
    throw new ParseError("Expression expected", data);
  }
}
