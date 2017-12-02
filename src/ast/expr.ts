import { Dictionary } from "../util";
import { Location,
         copyLoc    } from "./location";

//==============================================================================

/**
 * Simple class to hold tokens and their locations.
 */
export class Token {
  value: string;
  location: Location;

  constructor(value: string, location: Location) {
    this.value  = value;
    this.location = copyLoc(location);
  }

  toString(): string {
    return this.value;
  }

  equals(node: any): boolean {
    return (node instanceof Token) && this.value == node.value;
  }
}

/**
 *
 */
export interface ExpressionVisitor<T> {
  visitUndefined(u: Undefined): T;
  visitNull(n: Null): T;
  visitBoolean(b: Boolean): T;
  visitNumber(n: Number): T;
  visitString(s: String): T;
  visitIdentifier(i: Identifier): T;
  visitProperty(p: Property): T;
  visitIndex(i: Index): T;
  visitApplication(a: Application): T;
  visitUnaryOperation(u: UnaryOperation): T;
  visitBinaryOperation(b: BinaryOperation): T;
  visitArrayConstruction(a: ArrayConstruction): T;
  visitObjectConstruction(o: ObjectConstruction): T;
}

/**
 * Base class for all expression nodes in the AST.
 */
export abstract class Expression {
  location: Location;

  constructor(location: Location) {
    this.location = copyLoc(location);
  }

  abstract toString(): string;

  abstract equals(node: any): boolean;

  abstract accept<T>(v: ExpressionVisitor<T>): T;
}


/**
 * Node for a undefined literal.
 */
export class Undefined extends Expression {
  value: undefined;

  constructor(loc: Location) {
    super(loc);
  }

  toString(): string {
    return "undefined";
  }

  equals(node: any): boolean {
    return (node instanceof Undefined);
  }

  accept<T>(v: ExpressionVisitor<T>): T {
    return v.visitUndefined(this);
  }
}

Undefined.prototype.value = undefined;


/**
 * Node for a null literal.
 */
export class Null extends Expression {
  value: null;

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

Null.prototype.value = null;

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
export class Identifier extends Expression {
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

  accept<T>(v: ExpressionVisitor<T>): T {
    return v.visitIdentifier(this);
  }
}


/**
 * Node for a property reference.
 */
export class Property extends Expression {
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

  accept<T>(v: ExpressionVisitor<T>): T {
    return v.visitProperty(this);
  }
}


/**
 * Node for a indexing.
 */
export class Index extends Expression {
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

  accept<T>(v: ExpressionVisitor<T>): T {
    return v.visitIndex(this);
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
 * Implementation function for unary operator.
 */
type UnaryOperationFunction = (a: any) => any;

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
    "|" : (a, b) => b(a),
  }
}


/**
 * Node for an array construction.
 */
export class ArrayConstruction extends Expression {
  value: Expression[];

  constructor(value: Expression[], loc: Location) {
    super(loc);
    this.value = value;
  }

  toString(): string {
    return `[${this.value.join(', ')}]`;
  }

  equals(node: any): boolean {
    if (node instanceof ArrayConstruction) {
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
    return v.visitArrayConstruction(this);
  }
}


/**
 * Node for an object literal.
 */
export class ObjectConstruction extends Expression {
  value: Dictionary<Expression>;

  constructor(value: Dictionary<any>, loc: Location) {
    super(loc);
    this.value = value;
  }

  toString(): string {
    let contentsString = Object.keys(this.value)
      .map(key => JSON.stringify(key) + ": " + this.value[key])
      .join(', ');
    return `{${contentsString}}`;
  }

  equals(node: any): boolean {
    if (node instanceof ObjectConstruction) {
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
    return v.visitObjectConstruction(this);
  }
}

