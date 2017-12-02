import { Expression,
         Identifier  } from "./expr";
import { Location,
         copyLoc     } from "./location";
import { Maybe,
         Dictionary  } from "../util";

export class Definition  {
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
    this.location = copyLoc(location);
  }
}

export class Bloc {
  contextProps: Maybe<Definition[]>
  blocProps: Maybe<Definition[]>
  contents: Maybe<Template>;

  addContextProperty(defn: Definition) {
    if (this.contextProps) {
      this.contextProps.push(defn);
    }
    else {
      this.contextProps = [ defn ];
    }
  }

  addBlocProperty(defn: Definition) {
    if (this.blocProps) {
      this.blocProps.push(defn);
    }
    else {
      this.blocProps = [ defn ];
    }
  }
}

export class NestedBloc extends Bloc {
  expression: Expression;
  location: Location;

  constructor(expression: Expression, contents: Maybe<Template>, location: Location) {
    super();
    this.expression = expression;
    this.contents = contents;
    this.location = location;
  }
}

export class RootBloc extends Bloc {
  contents: Template;

  constructor(contents: Template) {
    super();
    this.contents = contents;
  }
}

export class Template {
  children: (Bloc|string)[] = [];
  params: Maybe<Identifier[]>;
  locals: Dictionary<any> = {};
  location: Location;

  constructor (params: Maybe<Identifier[]>, location: Location) {
    this.params = params;
    this.location = copyLoc(location);
  }
}

