import { Scope } from "./environment";
import { Renderable } from "./renderable";
import { render } from "./render";
import { parse } from "./parse";
import { FunctionHelper } from "./function";
import * as config from "../config";
import fs = require('fs');

export var rootPageScope = new Scope({});

rootPageScope.symbols = {
  let: function() {
    let args = Array.prototype.slice.call(arguments, 0);
    return new FunctionHelper(
      function() {
        let contents = this.get("embeddedContents").apply(null, args);
        return render(contents, this.context);
      }
    )
  },

  if: new FunctionHelper(
    function if_helper(test: any, then_branch: Renderable, else_branch: Renderable) {
      if (test) {
        if (then_branch) {
          return render(then_branch, this.context);
        }
        else if (this.get("embeddedContents")) {
          return render(this.get("embeddedContents"), this.context);
        }
      }
      else if (else_branch) {
        return render(else_branch, this.context);
      }
    },
    ["test", "then", "else"]
  ),

  each: new FunctionHelper(
    function each_helper(list: any[], body: Renderable) {
      if (! body) {
        body = this.get("embeddedContents");
      }
      return list.map((el, i) => render(body.apply(null, [el, i])))
    },
    ["list, body"]
  ),

  include: new FunctionHelper(
    function include_helper(file: string) {
      if (! file.endsWith('.blx')) {
        file += '.blx';
      }
      return new Promise((resolve) => {
        fs.readFile(`${config.fragmentsDirectory}/${file}`, (err, data) => {
          if (err) {
            resolve(`Could not read "${config.fragmentsDirectory}/${file}"`);
          }
          else {
            let tmpl = parse(data.toString());

            let contents = this.get("embeddedContents");
            if (contents) {
              resolve(render(contents.apply(null, [tmpl])))
            };
          }
        })
      });
    },
    ["file"]
  ),

  escape: function escape(s: string) {
    return s.replace(/[<>"&]/g, c => {
      switch(c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        case '&': return '&amp;';
      }
      return '';
    })
  }

}

