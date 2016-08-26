import { Maybe } from "../util";
import { Location } from "../base";
import { Node, IdentifierNode } from "./nodes";

export class Naming {
  public name: IdentifierNode;
  public node: Node;
  public source: string;
  public line: number;
  public column: number;

  constructor(name: IdentifierNode, node: Node, loc: Location) {
    this.name =   name;
    this.node =   node;
    this.source = loc.source;
    this.line =   loc.line;
    this.column = loc.column;
  }
}

/*--------------------------------------------------------*/

export class Symbol implements Location {
  public value:  string;
  public source: string;
  public line:   number;
  public column: number;


  constructor(value: string, loc: Location) {
    this.value =  value;
    this.source = loc.source;
    this.line =   loc.line;
    this.column = loc.column;
  }

  toString(): string {
    return this.value;
  }
}

/*--------------------------------------------------------*/

export interface BeginBlockToken extends Location {
  trimLeft: boolean;
  open: boolean;
  close: boolean;
  fragdef: boolean;
}

/*--------------------------------------------------------*/

export interface EndBlockToken extends Location {
  trimRight: boolean;
  escape: boolean;
  optional: boolean;
  static: boolean;
  instance: boolean;
}

/*--------------------------------------------------------*/

export interface ParamList extends Array<string>, Location {

}