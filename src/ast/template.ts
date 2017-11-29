import { Location    } from "./location";
import { Identifier  } from "./expr";
import { Bloc        } from "./bloc";
import { Maybe,
         Dictionary,
         Eventually,
         Tree        } from "../util";

export class Template implements Location {
  source: string;
  line: number;
  column: number;
  params: Maybe<Identifier[]>;
  children: Maybe<(Bloc|string)[]>;

  constructor (params?: Identifier[]) {
    this.params = params;
  }

}
