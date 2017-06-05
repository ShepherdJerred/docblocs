import { Dictionary,
         Maybe,
         Tree,
         Eventually  } from "../util";
import { Scope       } from "./environment";

export abstract class Renderable {
  params: Maybe<string[]>;
  pageScope: Scope;

  constructor(pageScope: Scope, params?: string[]) {
    this.pageScope = pageScope;
    this.params = params;
  }

  abstract clone(): this;

  abstract render(context: Scope): Eventually<Tree<string>>;

  apply(_: any, args: any[]): this {
    if (this.params && this.params.length && args.length) {
      let currentParam = 0;
      let currentArg = 0;
      let paramScope = new Scope({}, this.pageScope);
      do {
        let id = this.params[currentParam++];
        let value = args[currentArg++];
        paramScope.bind(id, value);
      }
      while (currentArg < args.length &&
             currentParam < this.params.length);

      let dup = this.clone();
      dup.pageScope = paramScope;
      return dup;
    }
    else {
      return this;
    }
  }

  assignParams(context: Dictionary<any>): this {
    if (this.params && this.params.length) {
      let currentParam = 0;
      let paramCount = 0;
      let paramScope = new Scope({}, this.pageScope);
      do {
        let id = this.params[currentParam++];
        if (id in context) {
          paramScope.bind(id, context[id]);
          ++paramCount;
        }
      }
      while (currentParam < this.params.length);

      if (paramCount > 0) {
        let dup = this.clone();
        dup.pageScope = paramScope;
        return dup;
      }
      else {
        return this;
      }
    }
    else {
      return this;
    }
  }

  assignContents(contents: any): this {
    let contentsScope = new Scope({embeddedContents: contents}, this.pageScope);
    let dup = this.clone();
    dup.pageScope = contentsScope;
    return dup;
  }
}
