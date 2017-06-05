import * as ast from '../ast';
import { Tree } from '../util';
import should = require('should');

let loc = { source: "<constructed>", line: 1, column: 1 };

export function construct(val: Tree<any>): ast.Expression {
  if (Array.isArray(val)) {
    if (val.length <= 2) {
      let op = new ast.UnaryOperation(val[0], loc);
      op.right = construct(val[1]);
      return op;
    }
    else {
      let op = new ast.BinaryOperation(val[0], loc);
      op.left = construct(val[1]);
      op.right = construct(val[2]);
      return op;
    }
  }
  else if (typeof val === 'number') {
    return new ast.Number(val, loc);
  }
  else if (typeof val == 'boolean') {
    return new ast.Boolean(val, loc);
  }
  else if (typeof val == 'string') {
    return new ast.Identifier(val, loc);
  }

  // Unreachable, but TypeScript can't seem to figure out
  return new ast.Boolean(true, loc);
}

export function compare(value: ast.Expression, expected: ast.Expression) {
  should(value).be.instanceof(expected.constructor);
  if (value instanceof ast.UnaryOperation && expected instanceof ast.UnaryOperation) {
    should(value.op).equal(expected.op);
    compare(value.right, expected.right);
  }
  else if (value instanceof ast.BinaryOperation && expected instanceof ast.BinaryOperation) {
    should(value.op).equal(expected.op);
    compare(value.left, expected.left);
    compare(value.right, expected.right);
  }
  else {
    should((value as any).value).equal((expected as any).value);
  }
}