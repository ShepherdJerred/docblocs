import { Dictionary,
         Tree,
         Maybe,
         Eventually,
         isPromise,
         resolvePromises  } from "../util";
import * as ast             from "../ast";
import { Scope,
         Environment      } from "./environment";
import { rootPageScope    } from "./root";
import { evaluate         } from "./eval";
import { assign           } from "./assign";
import { Renderable       } from "./renderable";

export class TemplateInstance extends Renderable {
  template: ast.Template;

  constructor(template: ast.Template, pageScope = rootPageScope) {
    let params: Maybe<string[]>;
    if (template.params) {
      params = template.params.ids.map(id => id.value);
    }
    super(pageScope, params);
    this.template = template;
  }

  clone(): this {
    return new TemplateInstance(this.template, this.pageScope) as this;
  }

  render(context: Scope): Eventually<Tree<string>> {
      let result : Eventually<Tree<string>>[] = [];
      let env = new Environment(this.pageScope, context);
      for (let block of this.template.children) {
        if (typeof block === "string") {
          result.push(block);
        }
        else {
          let blockResult = invokeBlock(block, env);

          if (isPromise(blockResult)) {
            let b: ast.Block = block;
            result.push(new Promise(resolve => {
              blockResult.then((resolvedResult: any) => {
                resolve(renderBlockResult(b, resolvedResult, env));
              })
            }))
          }
          else {
            result.push(renderBlockResult(block, blockResult, env));
          }
        }
      }

      return resolvePromises(result);
  }
}

function renderBlockResult(block: ast.Block, blockResult: any, env: Environment): Eventually<Tree<string>> {
  if (blockResult instanceof Renderable) {
    let instance = injectParameters(blockResult, env, block.injections);
    instance = instance.assignContents(block.contents ?
      new TemplateInstance(block.contents, env.page) : undefined);
    return instance.render(env.context);
  }
  else if (blockResult !== undefined) {
    return blockResult as string;
  }
  else {
    return '';
  }
}

function evalBlock(block: ast.Block, env: Environment): any {
  let thisContents: Maybe<TemplateInstance>;
  if (block.contents) {
    thisContents = new TemplateInstance(block.contents, env.page);
  }
  env = env.extend({thisContents});
  return evaluate(block.expr, env);
}

function invokeBlock(block: ast.Block, env: Environment): any {
  let value = evalBlock(block, env);
  if (block instanceof ast.Assignment) {
    assign(block.target, value, env);
  }
  else {
    return value;
  }
}

function injectParameters(instance: Renderable,
                          env: Environment,
                          injections?: ast.Injection[]) {
  if (injections) {
    let params: Dictionary<any> = {};
    for (let injection of injections) {
      let value = evalBlock(injection, env);
      params[injection.target.value] = value;
    }
    return instance.assignParams(params);
  }
  else {
    return instance;
  }
}