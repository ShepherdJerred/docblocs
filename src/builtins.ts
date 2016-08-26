import { Context } from './base';
import { Block, Template } from './ast';
import { parse } from './parse';
import fs = require('fs');

export var builtins = {
  with: function withBlock(...args: any[]) {
    let contents = args.pop();
    return contents.invoke(...args);
  },

  if: function ifBlock(condition, contents) {
    let body = contents.invoke();
    if (condition) {
      return body.get('then') ?  body.get('then').invoke() : body;
    }
    else {
      return body.get('else') ? body.get('else').invoke() : '';
    }
  },

  // TODO: Make asynchronous
  case: function caseBlock(contents) {
    let open = true;
    this.when = function when(condition, contents) {
      if (open && condition) {
        open = false;
        return contents.invoke();
      }
      else {
        return '';
      }
    }
    this.otherwise = function(contents) {
      if (open) {
        open = false;
        return contents.invoke();
      }
      else {
        return '';
      }
    }
    return contents.invoke();
  },

  forEach: function forEachBlock(items, contents) {
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