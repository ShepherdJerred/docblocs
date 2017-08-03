declare module "docblocks" {

  interface Dictionary<T> {
    [key: string]: T;
  }

  type Eventually<T> = T|PromiseLike<T>;

  interface ArrayTree<T> extends Array<T|ArrayTree<T>> { }

  type Tree<T> = T|ArrayTree<T>;

  interface GetResult {
    found: boolean;
    value?: any;
  }

  class Scope {
    constructor(symbols: Dictionary<any>, parent?: Scope);

    get(id: string): GetResult;

    set(id: string, value: any): void;

    bind(id: string, value: any): void;
  }

  abstract class Renderable {
    constructor(pageScope: Scope, params?: string[]);

    abstract clone(): this;

    abstract render(context: Scope): Eventually<Tree<string>>;

    apply(thisArg: any, args: any[]): this;

    assignParams(context: Dictionary<any>): this;

    assignContents(contents: any): this;
  }

  function parse(text: string, source?: string): Renderable;

  function render(text: string|Renderable, context?: Dictionary<any>|Scope): Eventually<string>;

  function engine(filePath: string, options: Object, callback: Function): void;
}