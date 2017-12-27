import * as ast from "../ast";
import { ExpressionVisitor, visit } from "../ast/visit";
import { Dictionary, eventuallyCall, resolvePromises } from "../util";

export function evaluate(expr: ast.Expression, locals: Dictionary<any>, globals: Dictionary<any>): any {
  let visitor = new EvalVisitor(locals, globals);
  return visitor.evalHelper(visit(visitor, expr));
}

class EvalVisitor implements ExpressionVisitor<any> {
  private locals: Dictionary<any>;
  private globals: Dictionary<any>;

  constructor(locals: Dictionary<any>, globals: Dictionary<any>) {
    this.locals = locals;
    this.globals = globals;
  }

  visitUndefined(u: ast.Undefined): undefined {
    return undefined;
  }

  visitNull(n: ast.Null): null {
    return null;
  }

  visitBoolean(b: ast.Boolean): boolean {
    return b.value;
  }

  visitNumber(n: ast.Number): number {
    return n.value;
  }

  visitString(s: ast.String): string {
    return s.value;
  }

  visitIdentifier(i: ast.Identifier): any {
    if (i.text in this.locals) {
      return this.locals[i.text];
    }
    else {
      return this.globals[i.text];
    }
  }

  visitProperty(p: ast.Property): any {
    return eventuallyCall(
      (obj: Dictionary<any>) => {
        if (obj === undefined || obj === null) {
          return undefined;
        }
        else {
          return obj[p.property.text];
        }
      },
      visit(this, p.object)
    );
  }

  visitIndex(i: ast.Index): any {
    return eventuallyCall(
      (obj: Dictionary<any>, index: any) => {
        if (obj === undefined || obj === null) {
          return undefined;
        }
        else {
          return obj[index]
        }
      },
      visit(this, i.object),
      visit(this, i.index)
    );
  }

  visitApplication(a: ast.Application): any {
    let args = a.args.map(visit.bind(null, this));
    return eventuallyCall(
      (fn: Function, args: any[]) => {
        if (typeof fn !== "function") {
          return undefined;
        }
        else {
          return fn.apply(null, args);
        }
      },
      visit(this, a.fn),
      resolvePromises(args)
    );
  }

  visitUnaryOperation(u: ast.UnaryOperation): any {
    return unop[u.op](u.right, this);
  }

  visitBinaryOperation(b: ast.BinaryOperation): any {
    return binop[b.op](b.left, b.right, this);
  }

  visitArrayConstruction(a: ast.ArrayConstruction): any[] {
    return a.value.map(visit.bind(null, this));
  }

  visitObjectConstruction(o: ast.ObjectConstruction): Dictionary<any> {
    let result: Dictionary<any> = { };
    for (let key in o.value) {
      result[key] = visit(this, o.value[key]);
    }
    return result;
  }

  evalHelper(helper: any): any {
    if (typeof helper == "function") {
      return helper(this.globals, this.locals.this);
    }
    else {
      return helper;
    }
  }

}

let unop : Dictionary<(right: ast.Expression, visitor: EvalVisitor) => any> = {
  "+": (right, visitor) => + visit(visitor, right),
  "-": (right, visitor) => - visit(visitor, right),
  "!": (right, visitor) => ! visit(visitor, right),
};

let binop : Dictionary<(left: ast.Expression, right: ast.Expression, visitor: EvalVisitor) => any> = {
  "+":  (left, right, visitor) => visit(visitor, left) +  visit(visitor, right),
  "-":  (left, right, visitor) => visit(visitor, left) -  visit(visitor, right),
  "*":  (left, right, visitor) => visit(visitor, left) *  visit(visitor, right),
  "/":  (left, right, visitor) => visit(visitor, left) /  visit(visitor, right),
  "%":  (left, right, visitor) => visit(visitor, left) %  visit(visitor, right),
  "<":  (left, right, visitor) => visit(visitor, left) <  visit(visitor, right),
  ">":  (left, right, visitor) => visit(visitor, left) >  visit(visitor, right),
  "==": (left, right, visitor) => visit(visitor, left) == visit(visitor, right),
  ">=": (left, right, visitor) => visit(visitor, left) >= visit(visitor, right),
  "<=": (left, right, visitor) => visit(visitor, left) <= visit(visitor, right),
  "!=": (left, right, visitor) => visit(visitor, left) != visit(visitor, right),
  "&&": (left, right, visitor) => visit(visitor, left) && visit(visitor, right),
  "||": (left, right, visitor) => visit(visitor, left) || visit(visitor, right),
  "|":  (left, right, visitor) =>
    visit(visitor, right).call(null, visitor.evalHelper(visit(visitor, left)))
};

