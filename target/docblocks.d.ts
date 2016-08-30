declare module "docblocks" {

  interface Tree<T> extends Array<T|Tree<T>> { }

  type Eventually<T> = T|Promise<T>;

  interface Context {
    [name: string]: any;
  }

  class Template {
    toString(): string;
    closure(context: Context): TemplateClosure;
  }

  class TemplateClosure {
    toString(): string;
    get(name: string): any;
    invoke(...args: any[]): TemplateResult;
  }

  class TemplateResult {
    get(name: string): any;
    eval(): Tree<Eventually<any>>;
  }

  function parse(text: string, source?: string): any;

  function render(text: string|Template, context?: Context): Eventually<string>;

  function engine(filePath: string, options: Object, callback: Function): void;
}