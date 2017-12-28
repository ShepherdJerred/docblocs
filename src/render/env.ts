import { Dictionary, resolvePromises } from "../util";
import * as ast from "../ast";
import * as fs from "fs";

export const baseEnv = {
  let: (...args: any[]) => (context: Dictionary<any>, bloc: Dictionary<any>) => {
    return bloc.contents.apply(null, args)(context, bloc);
  },

  if: (test: boolean) => (context: Dictionary<any>, bloc: Dictionary<any>) => {
    if (test) {
      if (bloc.then) {
        return bloc.then(context, bloc);
      }
      else if (bloc.contents) {
        return bloc.contents(context, bloc);
      }
    }
    else {
      if (bloc.else) {
        return bloc.else(context, bloc);
      }
    }
  },

  eachof: (items: any[]) => (context: Dictionary<any>, bloc: Dictionary<any>) => {
    if (! Array.isArray(items)) {
      throw new TypeError("Argument to eachof is not an array")
    }
    return resolvePromises(items.map(item =>
      bloc.contents(item)(context, bloc)
    ), true);
  },

  require: (name: string) => {
    let templateText = new Promise((resolve, reject) => {
      fs.readFile(name, (err, data) => {
        if (err) {
          reject(err);
        }
        else {
          reject(data);
        }
      });
    })
    return (context: Dictionary<any>, bloc: Dictionary<any>) => {

    };
  }
};