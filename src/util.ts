/*========================================================*/

export function merge<T, U>(t: T, u: U): T & U;
export function merge<T, U, V>(t: T, u: U, v: V): T & U & V;
export function merge<T, U, V, W>(t: T, u: U, v: V, w: W): T & U & V & W;
export function merge(): Dictionary<any> {
  let a: Dictionary<any> = {};
  for (let i = 0, l = arguments.length; i < l; ++i) {
    let b: Dictionary<any> = arguments[i];
    for (let key in b) {
      a[key] = b[key];
    }
  }
  return a;
}

/*========================================================*/

/**
 * Object used only to map keys to values.
 */
export interface Dictionary<T> {
  [key: string]: T;
}

/*========================================================*/

export interface ArrayTree<T> extends Array<T|ArrayTree<T>>
{ }

export type Tree<T> = T|ArrayTree<T>;

export function flatten<T>(tree: Tree<T>, result: T[] = []): T[] {
  if (Array.isArray(tree)) {
    for (let el of tree) {
      flatten(el, result);
    }
  }
  else {
    result.push(tree);
  }
  return result;
}

/*========================================================*/

/**
 * Indicates the variable may be undefined.
 */
export type Maybe<T> = T | undefined;

/**
 * Test a Maybe to see if it is defined.
 */
export function isDefined<T>(x: Maybe<T>): x is T {
  return x !== undefined && x !== null;
}

/**
 * Test a Maybe to see if it is undefined.
 */
export function isUndefined<T>(x: Maybe<T>): x is undefined {
  return x === undefined || x === null;
}

/*========================================================*/

/**
 * Array which keeps track of the top (last) element.
 */
export interface Stack<T> extends Array<T> {
  top?: T;
}

/**
 * Add new element to top of stack.
 */
export function push<T>(ts: Stack<T>, t: T) {
  ts.push(t);
  ts.top = t;
  return ts;
}

/**
 * Remove element from top of stack.
 * @returns the element removed
 */
export function pop<T>(ts: Stack<T>): T {
  let t = ts.pop();
  if (! t) {
    throw new Error("Precondition violation: pop() called on non-empty stack");
  }
  let l = ts.length;
  if (l) {
    ts.top = ts[l - 1];
  }
  else {
    ts.top = undefined;
  }
  return t;
}

/*========================================================*/

/**
 * Either a value or a promise for a value.
 */
export type Eventually<T> = T|PromiseLike<T>;

/**
 * Test an Eventually to see if it is a promise.
 */
export function isPromise(x: any): x is PromiseLike<any> {
  return (typeof x) === 'object' && x !== null && (typeof x.then) === 'function';
}

/**
 * Return a new Eventually which has the value of an old Eventually, or else
 * a default value if the old Eventually turns out to be undefined.
 */
export function eventuallyDefault<T, U>(v: Eventually<T>, w: U): Eventually<T|U> {
  if (isPromise(v)) {
    return v.then((x) => (x === undefined) ? w : x);
  }
  else {
    return (v === undefined) ? w : v;
  }
}

/**
 * Call a function once all arguments are ready.
 */
export function eventuallyCall<T>(f: (...args: any[]) => T, ...args: any[]): Eventually<T> {
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

/**
 * Search a recursive object/array data structure looking for promises.
 * Return value which will eventually be the structure with all promises
 * replaced with their values.
 */
export function resolvePromises(value: any): Eventually<any> {
  var promises: PromiseLike<any>[] = [];

  let resolve = (key: string|number) => (val: Object) => {
    return value[key] = val;
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
    return Promise.all(promises).then(() => value);
  }
  else {
    return value;
  }
}
