import { TemplateClosure, TemplateResult } from "./ast";

/*========================================================*/

export function escapeHtml(value: any): string {
  return `${value}`.replace(/[<>&"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '"': return '&quot;';
      default: return c;
    }
  })
}

/*========================================================*/

export interface Dictionary<T> {
  [key: string]: T;
}

/*========================================================*/

export interface Tree<T> extends Array<T|Tree<T>>
{ }

/*========================================================*/

export type Maybe<T> = T | void;

/*--------------------------------------------------------*/

export function isDefined<T>(x: Maybe<T>): x is T {
  return x !== undefined && x !== null;
}

/*--------------------------------------------------------*/

export function isUndefined<T>(x: Maybe<T>): x is void {
  return x === undefined || x === null;
}

/*========================================================*/

export interface Stack<T> extends Array<T> {
  top?: T;
}

export function push<T>(ts: Stack<T>, t: T) {
  ts.push(t);
  ts.top = t;
  return ts;
}

export function pop<T>(ts: Stack<T>): T {
  let t = ts.pop(), l = ts.length;
  if (l) {
    ts.top = ts[l - 1];
  }
  else {
    ts.top = undefined;
  }
  return t;
}

/*========================================================*/

export type Eventually<T> = T|Promise<T>;

function f() {

  var x: Eventually<number>;

  if (typeof x === 'number') {
    var y = x + 3;
  }

  if (isPromise(x)) {
    var z = x.then((a) => a + 3);
  }
}

/*--------------------------------------------------------*/

export function isPromise(x: any): x is PromiseLike<any> {
  return (typeof x) === 'object' && x !== null && (typeof x.then) === 'function';
}

/*========================================================*/

export function eventuallyCallFn<T>(f: (...args: any[]) => T, ...args: any[]): Eventually<T> {
  let p = resolvePromises(args);
  if (isPromise(p)) {
    return p.then((resolvedArgs: any[]) => {
      return f.apply(null, resolvedArgs);
    })
  }
  else {
    return f.apply(null, args);
  }
}
/*
export function eventuallyCall<T>(f: Eventually<(...args: any[]) => T>, ...args: any[]): Eventually<T> {
  if (isPromise(f)) {
    return f.then((resolvedF) => eventuallyCallFn(resolvedF, ...args));
  }
  else {
    return eventuallyCallFn(f, ...args);
  }
}

/*========================================================*/

export function eventuallyDefault<T, U>(v: Eventually<T>, w: U): Eventually<T|U> {
  if (isPromise(v)) {
    return v.then((x) => (x === undefined) ? w : x);
  }
  else {
    return (v === undefined) ? w : v;
  }
}

/*========================================================*/

export function get(o: Object, p: string): any {
  if (o === undefined) {
    return undefined;
  }
  if (o instanceof TemplateClosure || o instanceof TemplateResult) {
    return o.context[p];
  }
  else {
    return o[p];
  }
}

/*--------------------------------------------------------*/

export function eventuallyGet(v: Eventually<Object>, p: string): Eventually<any> {
  if (isPromise(v)) {
    return v.then((o) => get(o, p))
  }
  else {
    return get(v, p);
  }
}

/*========================================================*/

export function resolvePromises(value: any): Eventually<any> {
  var promises: PromiseLike<any>[] = [];

  let resolve = (key) => (val) => {
    return value[key] = resolvePromises(val);
  };

  if (Array.isArray(value) ||
      typeof value === 'object' && value !== null &&
      Object.getPrototypeOf(value) === Object.prototype) {
    for (let key in value) {
      let v = resolvePromises(value[key]);
      if (isPromise(v)) {
        promises.push(v.then(resolve(key)))
      }
    }
  }

  if (promises.length) {
    return Promise.all(promises).then(() => {return value});
  }
  else {
    return value;
  }
}

/*========================================================*/

export function flatten<T>(values: Tree<T>, result: T[] = []): T[] {
  for (let v of values) {
    if (Array.isArray(v)) {
      flatten(v, result);
    }
    else {
      result.push(v);
    }
  }
  return result;
}

/*========================================================*/

export function stringify(values: Tree<string>): string {
  return flatten(values).join('');
}

/*--------------------------------------------------------*/

export function eventuallyStringify(values: Tree<Eventually<any>>): Eventually<string> {
  return eventuallyCallFn(stringify, resolvePromises(values));
}
