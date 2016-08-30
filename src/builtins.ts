import { Dictionary } from './util';
import { Context } from './base';
import { Block, Template, TemplateClosure } from './ast';
import { parse } from './parse';
import fs = require('fs');

export var builtins: Dictionary<Function> = {
  with: function withBlock(...args: any[]) {
    let contents = args.pop();
    return contents.invoke(...args);
  },

  if: function ifBlock(condition: any, contents: TemplateClosure) {
    let body = contents.invoke();
    if (condition) {
      return body.get('then') ?  body.get('then').invoke() : body;
    }
    else {
      return body.get('else') ? body.get('else').invoke() : '';
    }
  },

  forEach: function forEachBlock(items: any[], contents: TemplateClosure) {
    let bodies: any[] = [];
    if (Array.isArray(items)) {
        for (let i = 0, l = items.length; i < l; ++i) {
          bodies.push(contents.invoke(items[i], i));
        }
    }
    else {
      for (let key in items) {
        bodies.push(contents.invoke(items[key], key));
      }
    }
    return bodies;
  },

}