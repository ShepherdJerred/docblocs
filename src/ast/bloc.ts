import { Expression,
         Identifier  } from "./expr";
import { Location    } from "./location";
import { Maybe,
         Dictionary  } from "../util";


export interface Definition extends Location {
  type: "Definition";
  target: Identifier;
  expression: Maybe<Expression>;
  contents?: Template;
}

export function Definition(
  location: Location,
  target: Identifier,
  expression?: Expression
): Definition {

  return {
    type: "Definition",
    line: location.line,
    char: location.char,
    target,
    expression
  };
}

export interface Bloc extends Location {
  type: "Bloc";
  expression: Expression;
  contents?: Template;
  properties?: Definition[]
}

export function Bloc(location: Location, expression: Expression, contents?: Template, properties?: Definition[]): Bloc {
  let bloc: Bloc = {
    type: "Bloc",
    line: location.line,
    char: location.char,
    expression,
  };
  if (contents) {
    bloc.contents = contents;
  }
  if (properties) {
    bloc.properties = properties;
  }
  return bloc;
}

export interface RootBloc {
  type: "RootBloc";
  source: Maybe<string>;
  contents: Template;
  properties?: Definition[];
}

export function RootBloc(source?: string): RootBloc {
  return {
    type: "RootBloc",
    source,
    contents: Template({ line: 1, char: 1 }),
  };
}

export interface TemplateParam extends Location {
  type: "local" | "global";
  identifier: Identifier;
}

export interface Template extends Location {
  params?: TemplateParam[];
  children: (Bloc|string)[];
  locals: Dictionary<any>;
}

export function Template(location: Location, params?: TemplateParam[], children?: (Bloc|string)[]): Template {
  return {
    line: location.line,
    char: location.char,
    params: params,
    children: children || [],
    locals: { }
  };
}