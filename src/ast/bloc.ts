import { Expression,
        Identifier  } from "./expr";
import { Template   } from "./template";
import { Location       } from "./location";
// import { ParseError     } from "../exec/error";
import { Maybe          } from "../util";

export class Bloc implements Location {
  source: string;
  line: number;
  column: number;
  expression: Expression;
  contents: Maybe<Template>;
  location: Location;

  constructor(expression: Expression, contents: Maybe<Template>, location: Location) {
    this.expression = expression;
    this.contents = contents;
    this.location = location;
  }
}

export class Definition implements Location {
  source: string;
  line: number;
  column: number;
  target: Identifier;
  expression: Expression;
  contents: Maybe<Template>;
  location: Location;

  constructor(target: Identifier,
              expression: Expression,
              contents: Maybe<Template>,
              location: Location        ) {
    this.target = target;
    this.expression = expression;
    this.contents = contents;
    this.location = location;
  }
}

