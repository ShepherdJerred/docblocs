import { evaluate        } from "./eval";
import { baseEnv         } from "./env";
import { Template        } from "../ast";
import { parse           } from "../parse";
import { curry,
         Maybe,
         Dictionary,
         Tree,
         flatten,
         Eventually,
         eventuallyCall,
         resolvePromises } from "../util";

export function renderTemplate(
  template: Template,
  locals: Dictionary<any>,
  globals: Dictionary<any>,
  bloc: Dictionary<any>
): Eventually<Tree<string>> {

  let results: Tree<string> = [];

  for (let child of template.children) {
    if (typeof child == "string") {
      results.push(child);
    }
    else {
      let newBloc: Dictionary<any> = { };

      let blocGlobals: Dictionary<any> = Object.create(globals);

      let blocLocals: Dictionary<any> = Object.create(locals);
      blocLocals.this = newBloc;
      blocLocals.bloc = bloc;

      if (child.contents) {
        newBloc.contents = renderTemplate.bind(null, child.contents, blocLocals);
      }

      if (child.properties) {
        for (let defn of child.properties) {
          if (defn.expression) {
            newBloc[defn.target.text] = evaluate(defn.expression, blocLocals, blocGlobals);
          }
          else if (defn.contents) {
            newBloc[defn.target.text] = renderTemplate.bind(null, defn.contents, blocLocals);
          }
        }
      }

      results.push(evaluate(child.expression, blocLocals, blocGlobals));
    }
  }

  return resolvePromises(results);
}

export function template(template: string | Template, source?: string) {
  let t = typeof template == "string" ? parse(template, source) : template;
  return renderTemplate.bind(null, t, baseEnv);
}

export function templateResult(
    template: string | Template,
    context?: Dictionary<any>
): Promise<string>;

export function templateResult(
    template: string | Template,
    source: string,
    context?: Dictionary<any>
): Promise<string>;

export function templateResult(
    template: string | Template,
    source_context?: string | Dictionary<any>,
    context?: Dictionary<any>
): Promise<string> {

  let source: Maybe<string>;
  if (typeof source_context === "string") {
    source = source_context;
  }
  else {
    context = source_context;
  }
  let globals: Dictionary<any> = typeof context === "object" ? context : { };

  return new Promise((resolve, reject) => {
    try {
      let t = typeof template == "string" ? parse(template, source): template;
      let r = renderTemplate(t, baseEnv, globals, { });
      let x = eventuallyCall<string[], Tree<string>>(flatten, r);
      let s = eventuallyCall(x => x.join(''), x);
      eventuallyCall(resolve, s);
    }
    catch(e) {
      reject(e);
    }
  })
}
