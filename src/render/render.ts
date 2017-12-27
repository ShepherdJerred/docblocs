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

export type Render_3 = {
  (bloc: Dictionary<any>): Eventually<Tree<string>>;
}

export type Render_2 = {
  (globals: Dictionary<any>): Render_3;
  (globals: Dictionary<any>, bloc: Dictionary<any>): Eventually<Tree<string>>;
}

export type Render_1 = {
  (locals: Dictionary<any>): Render_2;
  (locals: Dictionary<any>, globals: Dictionary<any>): Render_3;
  (locals: Dictionary<any>, globals: Dictionary<any>, bloc: Dictionary<any>): Eventually<Tree<string>>;
}

export type Render = {
  (template: Template): Render_1;
  (template: Template, locals: Dictionary<any>): Render_2;
  (template: Template, locals: Dictionary<any>, globals: Dictionary<any>): Render_3;
  (template: Template, locals: Dictionary<any>, globals: Dictionary<any>, bloc: Dictionary<any>): Eventually<Tree<string>>;
}

export const render = curry(renderTemplate) as Render;

function renderTemplate(
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
        newBloc.contents = render(child.contents, blocLocals);
      }

      if (child.properties) {
        for (let defn of child.properties) {
          if (defn.expression) {
            newBloc[defn.target.text] = evaluate(defn.expression, blocLocals, blocGlobals);
          }
          else if (defn.contents) {
            newBloc[defn.target.text] = render(defn.contents, blocLocals);
          }
        }
      }

      results.push(evaluate(child.expression, blocLocals, blocGlobals));
    }
  }

  return resolvePromises(results);
}

export function template(template: string | Template, source?: string): Render_2 {
  let t = typeof template == "string" ? parse(template, source) : template;
  return render(t, baseEnv);
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
      let r = render(t, baseEnv, globals, { });
      let x = eventuallyCall<string[], Tree<string>>(flatten, r);
      let s = eventuallyCall(x => x.join(''), x);
      eventuallyCall(resolve, s);
    }
    catch(e) {
      reject(e);
    }
  })
}
