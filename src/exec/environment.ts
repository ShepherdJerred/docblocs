import { Dictionary,
         Maybe       } from "../util";

interface GetResult {
  found: boolean;
  value?: any;
}

export class Scope {
  parent: Maybe<Scope>;
  symbols: Dictionary<any>;

  constructor(symbols: Dictionary<any>, parent?: Scope) {
    this.symbols = symbols;
    this.parent = parent;
  }

  get(id: string): GetResult {
    if (id in this.symbols) {
      return { found: true, value: this.symbols[id] };
    }
    else if (this.parent) {
      return this.parent.get(id);
    }
    else {
      return { found: false };
    }
  }

  set(id: string, value: any) {
    this.symbols[id] = value;
  }

  bind(id: string, value: any): void {
    this.symbols[id] = value;
  }

  dump() {
    console.dir(this.symbols);
    if (this.parent) {
      this.parent.dump();
    }
  }

}

export class Environment {
  page: Scope;
  context: Scope;
  added: Scope;

  constructor(page: Scope, context: Scope, added?: Scope) {
    this.page = page;
    this.context = context;
    this.added = added || new Scope({});
  }

  get(id: string): any {
    let result: GetResult;
    if ((result = this.page.get(id)).found) {
      return result.value;
    }
    else if ((result = this.context.get(id)).found) {
      return result.value;
    }
    else {
      return this.added.get(id).value;
    }
  }

  set(id: string, value: any): void {
    this.page.set(id, value);
  }

  extend(symbols: Dictionary<any>) {
    let nestedPage = new Scope(symbols, this.page);
    return new Environment(nestedPage, this.context, this.added);
  }

  dump() {
    console.log('[[+ENV]]');
    this.page.dump();
    this.context.dump();
    this.added.dump();
    console.log('[[-ENV]]');
  }
}
