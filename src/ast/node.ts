import { Dictionary } from "../util";
import { Location   } from "./location";

//==============================================================================

export interface LValueVisitor<T> {
  visitIdentifier(i: Identifier): T;
  visitProperty(p: Property): T;
  visitIndex(i: Index): T;
}

export interface ExpressionVisitor<T> extends LValueVisitor<T> {
  visitNull(n: Null): T;
  visitBoolean(b: Boolean): T;
  visitNumber(n: Number): T;
  visitString(s: String): T;
  visitArrayLiteral(a: ArrayLiteral): T;
  visitObjectLiteral(o: ObjectLiteral): T;
  visitBinaryOperation(b: BinaryOperation): T;
  visitUnaryOperation(u: UnaryOperation): T;
  visitExtension(e: Extension): T;
  visitApplication(a: Application): T;
}

export interface NodeVisitor<T> extends ExpressionVisitor<T> {
  visitToken(t: Token): T;
}

/**
 * Base class for all nodes in the AST.
 */
export abstract class Node implements Location {
  source: string;
  line: number;
  column: number;

  constructor(loc: Location) {
    this.source = loc.source;
    this.line =   loc.line;
    this.column = loc.column;
  }

  abstract toString(): string;

  abstract equals(node: any): boolean;

  abstract accept<T>(v: NodeVisitor<T>): T;
}


export class Token extends Node {
  public value:  string;

  constructor(value: string, loc: Location) {
    super(loc);
    this.value =  value;
  }

  toString(): string {
    return this.value;
  }

  equals(node: any): boolean {
    return (node instanceof Token) && this.value == node.value;
  }

  accept<T>(v: NodeVisitor<T>): T {
    return v.visitToken(this);
  }
}


/**
 * Base class for all nodes in the AST.
 */
export abstract class Expression extends Node {
  abstract accept<T>(v: ExpressionVisitor<T>): T;
}

export abstract class LValue extends Expression {
  abstract accept<T>(v: LValueVisitor<T>): T;
}


/**
 * Node for a null literal.
 */
export class Null extends Expression {

  constructor(loc: Location) {
    super(loc);
  }

  toString(): string {
    return "null";
  }

  equals(node: any): boolean {
    return (node instanceof Null);
  }

  accept<T>(v: ExpressionVisitor<T>): T {
    return v.visitNull(this);
  }
}


/**
 * Node for a boolean literal.
 */
export class Boolean extends Expression {
  value:  boolean;

  constructor(value: boolean, loc: Location) {
    super(loc);
    this.value =  value;
  }

  toString(): string {
    return this.value ? "true" : "false";
  }

  equals(node: any): boolean {
    return (node instanceof Boolean) && node.value === this.value;
  }

  accept<T>(v: ExpressionVisitor<T>): T {
    return v.visitBoolean(this);
  }
}


/**
 * Node for a numeric literal.
 */
export class Number extends Expression {
  value:  number;

  constructor(value: number, loc: Location) {
    super(loc);
    this.value =  value;
  }

  toString(): string {
    return JSON.stringify(this.value);
  }

  equals(node: any): boolean {
    return (node instanceof Number) && node.value === this.value;
  }

  accept<T>(v: ExpressionVisitor<T>): T {
    return v.visitNumber(this);
  }
}


/**
 * Node for a string literal.
 */
export class String extends Expression {
  public value:  string;

  constructor(value: string, loc: Location) {
    super(loc);
    this.value =  value;
  }

  toString(): string {
    return JSON.stringify(this.value);
  }

  equals(node: any): boolean {
    return (node instanceof String) && node.value === this.value;
  }

  accept<T>(v: ExpressionVisitor<T>): T {
    return v.visitString(this);
  }
}


/**
 * Node for an identifier.
 */
export class Identifier extends LValue {
  value:  string;

  constructor(value: string, loc: Location) {
    super(loc);
    this.value =  value;
  }

  toString(): string {
    return this.value;
  }

  equals(node: any): boolean {
    return (node instanceof Identifier) && node.value === this.value;
  }

  accept<T>(v: LValueVisitor<T>): T {
    return v.visitIdentifier(this);
  }
}


/**
 * Node for an array literal.
 */
export class ArrayLiteral extends Expression {
  value: Expression[];

  constructor(value: Expression[], loc: Location) {
    super(loc);
  }

  toString(): string {
    let contentsString = this.value.map(value => value.toString()).join(', ');
    return `[${contentsString}]`;
  }

  equals(node: any): boolean {
    if (node instanceof ArrayLiteral) {
      let length = this.value.length;

      if (length != node.value.length) {
        return false;
      }

      for (let i = 0; i < length; ++i) {
        if (! this.value[i].equals(node.value[i])) {
          return false;
        }
      }

      return true;
    }
    else {
      return false;
    }
  }

  accept<T>(v: ExpressionVisitor<T>): T {
    return v.visitArrayLiteral(this);
  }
}


/**
 * Node for an object literal.
 */
export class ObjectLiteral extends Expression {
  value: Dictionary<Expression>;

  constructor(value: Dictionary<any>, loc: Location) {
    super(loc);
    this.value = value;
  }

  toString(): string {
    let contentsString = Object.keys(this.value)
      .map(key => JSON.stringify(key) + ": " + this.value[key].toString())
      .join(', ');
    return `{${contentsString}}`;
  }

  equals(node: any): boolean {
    if (node instanceof ObjectLiteral) {
      let keys = Object.keys(this.value);
      if (keys.length != Object.keys(node.value).length) {
        return false;
      }

      for (let key of keys) {
        if (! (key in node.value) ||
            ! this.value[key].equals(node.value[key])) {
          return false;
        }
      }

      return true;
    }
    else {
      return false;
    }
  }

  accept<T>(v: ExpressionVisitor<T>): T {
    return v.visitObjectLiteral(this);
  }
}


/**
 * Base class for unary/binary operators.
 */
export abstract class Operation extends Expression {
  public op: string;

  constructor(op: string, loc: Location) {
    super(loc);
    this.op = op;
  }
}


/**
 * Implementation function for binary operator.
 */
type BinaryOperationFunction = (a: any, b: any) => any;

/**
 * Node for binary operation.
 */
export class BinaryOperation extends Operation {
  left: Expression;
  right: Expression;
  precedence = BinaryOperation.precedences[this.op];

  toString(): string {
    return this.left.toString() + this.op + this.right.toString();
  }

  equals(node: any): boolean {
    return (node instanceof BinaryOperation) &&
      node.op === this.op &&
      node.left.equals(this.left) &&
      node.right.equals(this.right);
  }

  accept<T>(v: ExpressionVisitor<T>): T {
    return v.visitBinaryOperation(this);
  }

  static precedences: Dictionary<number> = {
    "*" : 80,
    "/" : 80,
    "%" : 80,
    "+" : 70,
    "-" : 70,
    "<" : 60,
    "<=": 60,
    ">" : 60,
    ">=": 60,
    "==": 50,
    "!=": 50,
    "&&": 30,
    "||": 20,
    "|" : 10
  }

  static operations: Dictionary<BinaryOperationFunction> = {
    "*" : (a, b) => a *  b,
    "/" : (a, b) => a /  b,
    "%" : (a, b) => a %  b,
    "+" : (a, b) => a +  b,
    "-" : (a, b) => a -  b,
    "<" : (a, b) => a <  b,
    "<=": (a, b) => a <= b,
    ">" : (a, b) => a >  b,
    ">=": (a, b) => a >= b,
    "==": (a, b) => a == b,
    "!=": (a, b) => a != b,
    "&&": (a, b) => a && b,
    "||": (a, b) => a || b,
    "|" : (a, b) => b(a)
  }
}


/**
 * Implementation function for binary operator.
 */
type UnaryOperationFunction = (a: any, c: any) => any;

/**
 * Node for unary operation.
 */
export class UnaryOperation extends Operation {
  right: Expression;

  toString(): string {
    return this.op + this.right.toString();
  }

  equals(node: any): boolean {
    return (node instanceof UnaryOperation) &&
      node.op === this.op &&
      node.right.equals(this.right);
  }

  accept<T>(v: ExpressionVisitor<T>): T {
    return v.visitUnaryOperation(this);
  }

  static operations: Dictionary<UnaryOperationFunction> = {
    "-": a => -a,
    "!": a => !a
  }
}


type Callable = { call: (thisArg: Object|null, ...args: any[]) => any };
function isCallable(x: any): x is Callable {
  return 'call' in x && typeof x.call === 'function';
}


/**
 * Node for a property reference.
 */
export class Property extends LValue {
  object: Expression;
  property: Identifier;

  constructor(object: Expression, property: Identifier, loc: Location) {
    super(loc);
    this.object = object;
    this.property = property;
  }

  toString(): string {
    return `${this.object}.${this.property}`;
  }

  equals(node: any): boolean {
    return (node instanceof Property) &&
      this.object.equals(node.object) &&
      this.property.equals(node.property);
  }

  accept<T>(v: LValueVisitor<T>): T {
    return v.visitProperty(this);
  }
}


/**
 * Node for a indexing.
 */
export class Index extends LValue {
  object: Expression;
  index: Expression;

  constructor(object: Expression, index: Expression, loc: Location) {
    super(loc);
    this.object = object;
    this.index = index;
  }

  toString(): string {
    return `${this.object}[${this.index}]`;
  }

  equals(node: any): boolean {
    return (node instanceof Index) &&
      this.object.equals(node.object) &&
      this.index.equals(node.index);
  }

  accept<T>(v: LValueVisitor<T>): T {
    return v.visitIndex(this);
  }

}


/**
 * Node for an extension.
 */
export class Extension extends Expression {
  object: Expression;
  extension: ObjectLiteral;

  constructor(object: Expression, extension: ObjectLiteral, loc: Location) {
    super(loc);
    this.object = object;
    this.extension = extension;
  }

  toString(): string {
    return this.object.toString() + this.extension.toString();
  }

  equals(node: any): boolean {
    return (node instanceof Extension) &&
      this.object.equals(node.object) &&
      this.extension.equals(node.extension);
  }

  accept<T>(v: ExpressionVisitor<T>): T {
    return v.visitExtension(this);
  }
}


/**
 * Node for application.
 */
export class Application extends Expression {
  fn: Expression;
  args: Expression[];

  constructor(fn: Expression, args: Expression[], loc: Location) {
    super(loc);
    this.fn = fn;
    this.args = args;
  }

  toString(): string {
    return `${this.fn}(${this.args.join(', ')})`;
  }

  equals(node: any): boolean {
    if (node instanceof Application) {

      if (! (this.fn.equals(node.fn))) {
        return false;
      }

      if (this.args.length != node.args.length) {
        return false;
      }

      for (let i = 0, l = this.args.length; i < l; ++i) {
        if (! this.args[i].equals(node.args[i])) {
          return false;
        }
      }

      return true;
    }
    else {
      return false;
    }
  }

  accept<T>(v: ExpressionVisitor<T>): T {
    return v.visitApplication(this);
  }
}
