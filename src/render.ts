import { Tree, Eventually, isPromise, eventuallyStringify } from "./util";
import { Context } from "./base";
import { Template, TemplateResult } from "./ast";
import { parse } from "./parse";

export function evaluate(value: any): Eventually<string|Tree<string>> {
  if (Array.isArray(value)) {
    let tree = value.map(evaluate);
    let promises: PromiseLike<any>[] = [];
    let resolve = (j) => (result) => {
      let e = evaluate(result);
      if (isPromise(e)) {
        e = e.then(resolve(j));
      }
      else {
        tree[j] = e;
      }
      return e;
    }
    for (let i = 0, l = tree.length; i < l; ++i) {
      let node = tree[i];
      if (isPromise(node)) {
        promises.push(node.then(resolve(i)));
      }
    }

    if (promises.length) {
      return Promise.all(promises).then(() => tree);
    }
    else {
      return tree;
    }
  }
  else if (isPromise(value)) {
    return value.then(evaluate);
  }
  else if (value instanceof TemplateResult) {
    return evaluate(value.eval());
  }
  else {
    return `${value}`;
  }
}

function flatten(tree: Tree<string>, result: string[] = []): string[] {
  for (let node of tree) {
    if (Array.isArray(node)) {
      flatten(node, result);
    }
    else {
      result.push(node);
    }
  }

  return result;
}

export function stringify(value: Eventually<string|Tree<string>>): Eventually<string> {
  if (Array.isArray(value)) {
    return flatten(value).join('');
  }
  else if (isPromise(value)) {
    return value.then(stringify);
  }
  else {
    return value;
  }
}

export function render(text: string|Template, context?: Context): Eventually<string> {
  let tmpl: Template;
  if (text instanceof Template) {
    tmpl = text;
  }
  else {
    tmpl = parse(text);
  }
  let clos = tmpl.closure(context);
  let invo = clos.invoke();
  let tree = evaluate(invo);
  return stringify(tree);
}