import { Location    } from "./location";
import { Identifier  } from "./node";
import { Block       } from "./block";
import { Maybe,
         Dictionary,
         Eventually,
         Tree        } from "../util";

export class TemplateParams implements Location {
  source: string;
  line: number;
  column: number;
  ids: Identifier[];

  constructor(ids: Identifier[], loc: Location) {
    this.source = loc.source;
    this.line = loc.line;
    this.column = loc.column;
    this.ids = Array.isArray(ids) ? ids.slice(0) : [];
  }

  slice(start?: number, end?: number) {
    return new TemplateParams(this.ids.slice(start, end), this);
  }
}

export class Template implements Location {
  source: string;
  line: number;
  column: number;
  params: Maybe<TemplateParams>;
  children: (Block|string)[] = [];

  constructor (params?: TemplateParams) {
    this.params = params;
  }

}
