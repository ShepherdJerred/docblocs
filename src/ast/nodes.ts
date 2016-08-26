import { Maybe, Dictionary, resolvePromises, eventuallyCallFn, eventuallyDefault, eventuallyGet } from '../util';
import { blockContentsName, Location, Context, RenderError } from '../base';
import { builtins } from '../builtins';
import { TemplateClosure } from './templates';
import { parse } from '../parse';
import fs = require('fs');

/*========================================================*/

// export type Node =
//   IdentifierNode | NumberNode | StringNode | BuiltinNode |
//   PropertyNode | ApplicationNode | OperationNode;
export abstract class Node {
  source: string;
  line: number;
  column: number;

  constructor(loc: Location) {
    this.source = loc.source;
    this.line =   loc.line;
    this.column = loc.column;
  }

  abstract toString(): string;

  abstract equals(node: Node): boolean;

  abstract eval(context): any;
}

/*========================================================*/

export class IdentifierNode extends Node {
  value:  string;

  constructor(value: string, loc: Location) {
    super(loc);
    this.value =  value;
  }

  toString(): string {
    return this.value;
  }

  equals(node: Node): boolean {
    return (node instanceof IdentifierNode) && node.value === this.value;
  }

  eval(context: Context): any {
    return eventuallyDefault(context[this.value], builtins[this.value]);
  }
}

/*========================================================*/

export class NumberNode extends Node {
  value:  number;

  constructor(value: number, loc: Location) {
    super(loc);
    this.value =  value;
  }

  toString(): string {
    return JSON.stringify(this.value);
  }

  equals(node: Node): boolean {
    return (node instanceof NumberNode) && node.value === this.value;
  }

  eval(context: Context): any {
    return this.value;
  }
}

/*========================================================*/

export class StringNode extends Node {
  public value:  string;

  constructor(value: string, loc: Location) {
    super(loc);
    this.value =  value;
  }

  toString(): string {
    return JSON.stringify(this.value);
  }

  equals(node: Node): boolean {
    return (node instanceof StringNode) && node.value === this.value;
  }

  eval(context: Context): any {
    return this.value;
  }
}

/*========================================================*/

export class BuiltinNode extends Node {
  public value:  Function;

  constructor(value: Function, loc: Location) {
    super(loc);
    this.value =  value;
  }

  toString(): string {
    return this.value.name;
  }

  equals(node: Node): boolean {
    return (node instanceof BuiltinNode) && node.value === this.value;
  }

  eval(context: Context): any {
    return this.value;
  }
}

/*========================================================*/

export class PropertyNode extends Node {
  public left:     Node;
  public property: string;

  constructor(left: Node, property: string, loc: Location) {
    super(loc);
    this.left =     left;
    this.property = property;
  }

  toString(): string {
    return `${this.left}.${this.property}`;
  }

  equals(node: Node): boolean {
    return (node instanceof PropertyNode) &&
      node.left.equals(this.left) && node.property == this.property;
  }

  eval(context: Context): any {
    return eventuallyGet(this.left.eval(context), this.property);
  }
}

/*========================================================*/

export class ImportNode extends Node {
  public id: Maybe<IdentifierNode>;
  public expr: Maybe<Node>;

  constructor(id: Maybe<IdentifierNode>, expr: Maybe<Node>, loc: Location) {
    super(loc);
    this.id = id;
    this.expr = expr;
  }

  toString(): string {
    return `@${this.id}`;
  }

  equals(node: Node): boolean {
    return (node instanceof ImportNode) &&
            (node.id && this.id && node.id.equals(this.id) ||
             node.expr && this.expr && node.expr.equals(this.expr));
  }

  eval(context: Context) {
    let fileName: string;
    if (this.id) {
      fileName = this.id.value.replace('.', '/');
    }
    else if (this.expr){
      fileName = this.expr.eval(context);
    }

    let settings: Dictionary<string>,
        views: string,
        root: string;
    if ((settings = context['settings']) && (views = settings['views'])) {
      root = views;
    }
    else {
      root = '.';
    }

    let filePath = `${root}/fragments/${fileName}.blx`;

    return new Promise((resolve, reject) => {
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          reject(new Error(`Could not find ${filePath}`));
        }
        else {
          try {
            let template = parse(data, `${fileName}.blx`);
            if (template.members && template.members.length == 1 &&
                template.members[0].name.value == fileName &&
                template.children.every((b) =>
                  typeof b === 'string' && (<string>b).match(/^\s*$/) && true)) {
              resolve(template.members[0].block.eval(context));
            }
            else {
              resolve(template.closure(context));
            }
          }
          catch (e) {
            reject(e);
          }
        }
      })
    });
  }
}

/*========================================================*/

export class ApplicationNode extends Node {
  public fn:     Node;
  public args:   Node[];

  constructor(fn: Node, args: Node[], loc: Location) {
    super(loc);
    this.fn = fn;
    this.args =   args ? args : [];
  }

  toString(): string {
    return `${this.fn}(${this.args.map((n) => n.toString()).join(', ')})`;
  }

  equals(node: Node): boolean {
    return (node instanceof ApplicationNode) &&
      node.fn.equals(this.fn) &&
      node.args.every((n, i) => n.equals(this.args[i]))
  }

  eval(context: Context): any {
    let withResolvedFunction = (fn: Function|TemplateClosure) => {

      if (typeof fn !== 'function' && ! (fn instanceof TemplateClosure)) {
        throw new RenderError(
          `Cannot apply ${this.fn} because ${fn} is not a function or template`,
          this.fn
        );
      }

      let args = this.args.map((n) => n.eval(context));

      let withResolvedArguments = (resolvedArgs: any[]) => {
        if (typeof fn === 'function') {
          return fn.call(context, ...args, context[blockContentsName]);
        }
        else {
          return fn.invoke(...args, context[blockContentsName]);
        }
      };

      return eventuallyCallFn(withResolvedArguments, resolvePromises(args))
    };

    return eventuallyCallFn(withResolvedFunction, this.fn.eval(context))
  }
}

/*========================================================*/

export abstract class OperationNode extends Node {
  public op: string;

  constructor(op: string, loc: Location) {
    super(loc);
    this.op = op;
  }

  abstract toString(): string;

  abstract equals(node: Node): boolean;

  abstract eval(context: Context);
}

/*--------------------------------------------------------*/

export class BinaryOperationNode extends OperationNode {
  left: Node;
  right: Node;
  precedence = BinaryOperationNode.precedences[this.op];

  toString(): string {
    return this.left.toString() + this.op + this.right.toString();
  }

  equals(node: Node) {
    return (node instanceof BinaryOperationNode) &&
      node.op === this.op &&
      node.left.equals(this.left) &&
      node.right.equals(this.right);
  }

  eval(context: Context): any {
    return eventuallyCallFn(BinaryOperationNode.operations[this.op],
      this.left, this.right, context);
  }

  static precedences = {
    "." : 100,
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

  static operations = {
    "." : (a, b, c) => a.eval(c)[b.value],
    "*" : (a, b, c) => a.eval(c) *  b.eval(c),
    "/" : (a, b, c) => a.eval(c) /  b.eval(c),
    "%" : (a, b, c) => a.eval(c) %  b.eval(c),
    "+" : (a, b, c) => a.eval(c) +  b.eval(c),
    "-" : (a, b, c) => a.eval(c) -  b.eval(c),
    "<" : (a, b, c) => a.eval(c) <  b.eval(c),
    "<=": (a, b, c) => a.eval(c) <= b.eval(c),
    ">" : (a, b, c) => a.eval(c) >  b.eval(c),
    ">=": (a, b, c) => a.eval(c) >= b.eval(c),
    "==": (a, b, c) => a.eval(c) == b.eval(c),
    "!=": (a, b, c) => a.eval(c) != b.eval(c),
    "&&": (a, b, c) => a.eval(c) && b.eval(c),
    "||": (a, b, c) => a.eval(c) || b.eval(c),
    "|" : (a, b, c) => b.eval(c)(a.eval(c))
  }
}

/*--------------------------------------------------------*/

export class UnaryOperationNode extends OperationNode {
  right: Node;

  toString(): string {
    return this.op + this.right.toString();
  }

  eval(context: Context): any {
    return eventuallyCallFn(UnaryOperationNode.operations[this.op], this.right, context);
  }

  equals(node: Node) {
    return (node instanceof UnaryOperationNode) &&
      node.op === this.op &&
      node.right.equals(this.right);
  }

  static operations = {
    "-": (a, c) => -a.eval(c),
    "!": (a, c) => !a.eval(c)
  }
}