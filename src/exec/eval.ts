import { Dictionary,
         eventuallyCall,
         resolvePromises,
         merge            } from "../util";
import * as ast             from "../ast";
import { Scope,
         Environment      } from "./environment";
import { Renderable       } from "./renderable";

export function evaluate(expr: ast.Expression, env: Environment): any {
  return expr.accept(new EvalVisitor(env));
}

class EvalVisitor implements ast.ExpressionVisitor<any> {

  env: Environment;

  constructor(env: Environment) {
    this.env = env;
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
    return this.env.get(i.value);
  }

  visitArrayLiteral(a: ast.ArrayLiteral): any[] {
    return resolvePromises(a.value.map(expr => expr.accept(this)));
  }

  visitObjectLiteral(o: ast.ObjectLiteral): Dictionary<any> {
    let value: Dictionary<any> = {};
    for (let id in o.value) {
      value[id] = o.value[id].accept(this);
    }
    return resolvePromises(value);
  }

  visitBinaryOperation(b: ast.BinaryOperation): any {
    return eventuallyCall(ast.BinaryOperation.operations[b.op],
      b.left.accept(this), b.right.accept(this));
  }

  visitUnaryOperation(u: ast.UnaryOperation): any {
    return eventuallyCall(ast.UnaryOperation.operations[u.op],
      u.right.accept(this))
  }

  visitProperty(p: ast.Property): any {
    return eventuallyCall(obj => obj[p.property.value],
      p.object.accept(this));
  }

  visitIndex(i: ast.Index): any {
    return eventuallyCall((obj, idx) => obj[idx],
      i.object.accept(this), i.index.accept(this));
  }

  visitExtension(e: ast.Extension): any {
    return eventuallyCall(templateMerge,
      e.object.accept(this), e.extension.accept(this));
  }

  visitApplication(a: ast.Application): any {
    return eventuallyCall((fn, args) => fn.apply(this.env, args),
      a.fn.accept(this), resolvePromises(a.args.map(arg => arg.accept(this))));
  }

}

function templateMerge(obj: Renderable|Dictionary<any>, extend: Dictionary<any>) {
  if (obj instanceof Renderable) {
    return obj.assignParams(extend);
  }
  else {
    return merge(obj, extend);
  }
}