import { Tree, Eventually } from '../util';
import { injectedContentsName, Context } from '../base';
import { Definition, Block } from './blocks';
import { Node, IdentifierNode } from './nodes';

/*========================================================*/

export class Template {
  children: (Block|string)[];
  params: string[];
  members: Definition[];
  context: Context;

  constructor(params?: string[]) {
    this.children = [];
    if (params) {
      this.params = params;
    }

    let thisTemplate = this;
  }

  toString(): string {
    return '[object Template]';
  }

  push(block: Block|string) {
    this.children.push(block);
  }

  define(name: IdentifierNode, block: Block, isStatic?: boolean) {
    let def = new Definition(name, block);
    if (isStatic) {
      def.static = true;
    }
    if (this.members) {
      this.members.push(def);
    }
    else {
      this.members = [def]
    }
  }

  closure(context: Context): TemplateClosure {
    return new TemplateClosure(this.children, this.params, this.members, context);
  }
}

/*========================================================*/

export class TemplateClosure {
  children: (Block|string)[];
  params:   string[];
  members:  Definition[];
  context:  Context;

  constructor (children: (Block|string)[],
               params:   string[],
               members:  Definition[],
               context:  Context          ) {
    this.children = children;
    this.params   = params;
    this.members  = members;
    this.context  = Object.create(context || null);

    if (members) {
      for (let def of members) {
        if (def.static) {
          this.context[def.name.value] = def.block.eval(context);
        }
      }
    }
  }

  toString(): string {
    return '[object TemplateClosure]';
  }

  get(name: string): any {
    return this.context[name];
  }

  invoke(...args: any[]): TemplateResult;
  invoke() {
    return new TemplateResult(this, ...arguments);
  }
}

/*========================================================*/

export class TemplateResult {
  children: (Block|string)[];
  context: Context;

  constructor(closure: TemplateClosure, ...args: any[]) {
    this.children = closure.children;
    this.context = Object.create(closure.context);

    let contents: Template;
    if ((closure.params ? closure.params.length : 0) < args.length &&
        args[args.length - 1] instanceof TemplateClosure             ) {
      contents = args.pop();
    }
    this.context[injectedContentsName] = contents;

    let params = closure.params;
    if (params) {
      for (let i = 0, l = params.length; i < l; ++i) {
        this.context[params[i]] = args[i];
      }
    }

    if (closure.members) {
      for (let def of closure.members) {
        if (!def.static) {
          this.context[def.name.value] = def.block.eval(this.context);
        }
      }
    }
  }

  get(name: string): any {
    return this.context[name];
  }

  eval(): Tree<Eventually<any>> {
    return this.children.map((child) => {
      if (child instanceof Block) {
        return child.eval(this.context);
      }
      else {
        return child;
      }
    })
  }
}