import { eventuallyCallFn, eventuallyDefault, escapeHtml } from '../util';
import { blockContentsName, Context, Location } from '../base';
import { Node, IdentifierNode } from './nodes';
import { Template } from './templates';
import { stringify, evaluate } from '../render';

/*========================================================*/

export class Definition {
  name: IdentifierNode;
  block: Block;
  static: boolean;

  constructor (name:  IdentifierNode, block: Block) {
    this.name = name;
    this.block = block;
  }
}

/*========================================================*/

export class Block {
  expr: Node;
  contents: Template;
  source: string;
  line: number;
  column: number;
  escape: boolean;
  optional: boolean;

  constructor(expr:     Node,
              contents: Template,
              loc:      Location ) {
    this.expr =     expr;
    this.contents = contents;
    this.source =   loc.source;
    this.line =     loc.line;
    this.column =   loc.column;
  }

  eval(context: Context): any {
    let localContext = Object.create(context);
    if (this.contents) {
      let contents = this.contents.closure(localContext);
      localContext[blockContentsName] = contents;
      localContext = contents.context;
    }
    else {
      localContext[blockContentsName] = undefined;
    }
    let result = this.expr.eval(localContext);

    if (this.optional) {
      result = eventuallyDefault(result, '');
    }

    if (this.escape) {
      result = eventuallyCallFn(escapeHtml, stringify(evaluate(result)));
    }

    return result;
  }
}
