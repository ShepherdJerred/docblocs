import * as ast from "../ast";
import { Environment } from "./environment";
import { evaluate    } from "./eval";
import { Dictionary  } from "../util";

export function assign(lvalue: ast.LValue, value: any, env: Environment) {
  let set = lvalue.accept(new AssignVisitor(env))
  set(value);
}

type Setter = (value: any) => any;

class AssignVisitor implements ast.LValueVisitor<Setter> {

  env: Environment;

  constructor(env: Environment) {
    this.env = env;
  }

  visitIdentifier(i: ast.Identifier): Setter {
    return (val: any) => this.env.set(i.value, val);
  }

  visitProperty(p: ast.Property): Setter {
    let object = evaluate(p.object, this.env);
    return (val: any) => object[p.property.value] = val;
  }

  visitIndex(i: ast.Index): Setter {
    let object = evaluate(i.object, this.env);
    let index  = evaluate(i.index,  this.env);
    return (val: any) => object[index] = val;
  }

}
