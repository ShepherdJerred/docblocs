import * as ast from "./node";

export type EqualFunction = (n: any) => boolean;

export function equalToNode(n: ast.Node): EqualFunction {
  return n.accept(equalVisitor);
}

export function nodesEqual(n: ast.Node, m: ast.Node): boolean {
  return n.accept(equalVisitor)(m);
}

const equalVisitor: ast.NodeVisitor<EqualFunction> = {

  visitToken(t: ast.Token): EqualFunction {
    return (n: any) => n instanceof ast.Token &&
      n.value == t.value;
  },

  visitNull(n: ast.Null): EqualFunction {
    return (n: any) => n instanceof ast.Null;
  },

  visitBoolean(b: ast.Boolean): EqualFunction {
    return (n: any) => n instanceof ast.Boolean &&
      n.value == b.value;
  },

  visitNumber(m: ast.Number): EqualFunction {
    return (n: any) => n instanceof ast.Number &&
      n.value == m.value;
  },

  visitString(s: ast.String): EqualFunction {
    return (n: any) => n instanceof ast.String &&
      n.value == s.value;
  },

  visitIdentifier(i: ast.Identifier): EqualFunction {
    return (n: any) => n instanceof ast.Identifier &&
      n.value == i.value;
  },

  visitArrayLiteral(a: ast.ArrayLiteral): EqualFunction {
    return (n: any) => {
      if (! (n instanceof ast.ArrayLiteral)) {
        return false;
      }
      if (n.value.length != a.value.length) {
        return false;
      }
      for (let i = 0, l = n.value.length; i < l; ++i) {
        if (!nodesEqual(n.value[i], a.value[i])) {
          return false;
        }
      }
      return true;
    };
  },

  visitObjectLiteral(o: ast.ObjectLiteral): EqualFunction {
    return (n: any) => {
      if (! (n instanceof ast.ObjectLiteral)) {
        return false;
      }
      let keys = Object.keys(n.value);
      if (keys.length != Object.keys(o.value).length) {
        return false;
      }
      for (let key of keys) {
        if (!(key in o.value) || ! nodesEqual(n.value[key], o.value[key])) {
          return false;
        }
      }
      return true;
    };
  },

  visitBinaryOperation(b: ast.BinaryOperation): EqualFunction {
    return (n: any) => n instanceof ast.BinaryOperation &&
      n.op == b.op &&
      nodesEqual(n.left, b.left) &&
      nodesEqual(n.right, b.right);
  },

  visitUnaryOperation(u: ast.UnaryOperation): EqualFunction {
    return (n: any) => n instanceof ast.UnaryOperation &&
      n.op == u.op &&
      nodesEqual(n.right, u.right);
  },

  visitProperty(p: ast.Property): EqualFunction {
    return (n: any) => n instanceof ast.Property &&
      n.property.value == p.property.value &&
      nodesEqual(n.object, p.object);
  },

  visitIndex(i: ast.Index): EqualFunction {
    return (n: any) => n instanceof ast.Index &&
      nodesEqual(n.object, i.object) &&
      nodesEqual(n.index, i.index);
  },

  visitExtension(e: ast.Extension): EqualFunction {
    return (n: any) => n instanceof ast.Extension &&
      nodesEqual(n.object, e.object) &&
      nodesEqual(n.extension, e.extension);
  },

  visitApplication(a: ast.Application): EqualFunction {
    return (n: any) => {
      if (! (n instanceof ast.Application)) {
        return false;
      }
      if (! nodesEqual(n.fn, a.fn)) {
        return false;
      }
      if (n.args.length != a.args.length) {
        return false;
      }
      for (let i = 0, l = n.args.length; i < l; ++i) {
        if (! nodesEqual(n.args[i], a.args[i])) {
          return false;
        }
      }
      return true;
    }
  }
}
