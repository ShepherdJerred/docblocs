import fs = require('fs');
import * as express from 'express';
import { parse } from './parse';
import { render } from './render';
import { isPromise, eventuallyStringify } from './util';

export function engine(filePath: string, options: Object, callback: Function) {
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      callback(err);
    }
    else {
      try {
        var tmpl = parse(data, filePath);
        var result = render(tmpl, options);
        if (isPromise(result)) {
          result.then((s) => callback(null, s), (e) => callback(e))
        }
        else {
          callback(null, result);
        }
      }
      catch (e) {
        callback(e);
      }
    }
  })
}
