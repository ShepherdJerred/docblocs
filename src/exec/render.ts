import { Dictionary,
         Eventually,
         eventuallyCall,
         resolvePromises,
         flatten          } from "../util";
import { parse            } from "./parse";
import { Scope            } from "./environment";
import { Renderable       } from "./renderable";

export function render(template: string|Renderable, context?: Dictionary<any>|Scope): Eventually<string> {
  let instance: Renderable;
  if (template instanceof Renderable) {
    instance = template;
  }
  else {
    instance = parse(template);
  }

  let scope: Scope;
  if (context instanceof Scope) {
    scope = context;
  }
  else {
    scope = new Scope(context || {});
  }

  let tree = instance.render(scope);
  let eventuallyStrings = eventuallyCall(flatten, resolvePromises(tree));
  return eventuallyCall(strings => strings.join(''), eventuallyStrings);
}
