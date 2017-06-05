import { Dictionary,
         Tree,
         Maybe,
         Eventually    } from "../util";
import { Environment,
         Scope         } from "./environment";
import { rootPageScope } from "./root";
import { Renderable    } from "./renderable";

export class FunctionHelper extends Renderable {
  fn: Function;

  constructor(fn: Function, params?: string[], pageScope = rootPageScope) {
    super(pageScope, params);
    this.fn = fn;
  }

  clone() {
    return new FunctionHelper(this.fn, this.params, this.pageScope) as this;
  }

  render(context: Scope): Eventually<Tree<string>> {
    let env = new Environment(this.pageScope, context);
    let args = this.params ? this.params.map(name => env.get(name)) : [];
    return this.fn.apply(env, args);
  }

}
