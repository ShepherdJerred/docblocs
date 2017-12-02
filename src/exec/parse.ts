import { ParseError  } from "../error";
import { Maybe,
         Dictionary,
         Stack       } from "../util";
import * as ast        from '../ast';

/** Unique ID for root template (since it does not have a block). */
const rootId = '<root>';

function canClose(open: ast.Expression, close: ast.Expression): boolean {
  return (
    open.equals(close) ||
    open instanceof ast.Application && canClose(open.fn, close) ||
    open instanceof ast.BinaryOperation && open.op == "|" && canClose(open.left, close)
  );
}

/**
 * Maintains a parallel stack of nodes and templates representing nested
 * blocks.  The node is the identifying node which will be used to close
 * the block.  The template is the contents of the block.
 */
class BlocStack {

  /** Stack of blocks */
  blocs: ast.Bloc[] = [];

  /** Top of block stack */
  bloc: ast.Bloc;

  /** Stack of identifiers. */
  ids: (ast.Expression|null)[] = [];

  /** Top of identifier stack. */
  id: ast.Expression;

  /**
   * Add new id/template pair to stack.
   * @param id       Identifying node for the block
   * @param template Template for block contents
   */
  push(bloc: ast.Bloc, id: ast.Expression|null) {
    this.blocs.push(bloc);
    this.ids.push(id);
    this.bloc = bloc;
    if (id !== null) {
      this.id = id;
    }
  }

  /**
   * Removes top id/template pair, but only if id matches.
   * @param id The node which must match the top id node
   * @returns  The template removed if id matches
   * @throws   ParseError if id does not match
   */
  pop(id: ast.Expression) {
    if (canClose(this.id, id)) {
      let i = this.ids.length - 1;
      while (this.ids[i] === null) {
        --i;
      }

      this.blocs.splice(i, this.blocs.length);
      this.ids.splice(i, this.ids.length);

      --i;
      this.bloc = this.blocs[i];
      while (this.ids[i] === null) {
        --i;
      }
      this.id = this.ids[i] as ast.Expression;
    }
    else if (this.id instanceof ast.Identifier && this.id.value === rootId) {
      throw new ParseError(`Unexpected closing tag`, id.location);
    }
    else {
      throw new ParseError(`Expected [[-${this.id}]]`, id.location);
    }
  }
}

/*============================================================================*/

export function parse(text: string, source?: string): TemplateInstance {
  return new TemplateInstance(parseRaw(text));
}

export function parseRaw(text: string, source = '<template source>'): ast.Template {
  /** Current position (index) in the text. */
  let curPos = 0;

  /** Current location in the source. */
  let curLoc = {source, line: 1, column: 0};

  /** Position (index) of the end of the text. */
  let endPos = text.length;

  /** The last position where we skipped whitespace. */
  let lastSkip = -1;

  /** Stack for nesting of blocks.  */
  let stack = new BlockStack();
  stack.push(
    null,
    new ast.Identifier(rootId, curLoc),
    new ast.Template()
  );

  /** Last regular expression that was matched. */
  let lastRegexp: RegExp;

  /** Match results from last regular expression that was matched. */
  let lastMatch: RegExpMatchArray;

  // Parse unitl there's nothing left
  while (curPos < endPos) {
    parseText();
    parseBlock();
  }

  // Should be left with just one thing on the stack
  return stack.pop(new ast.Identifier(rootId, curLoc));


  /**
   * Parse a text section (i.e., not a block).
   * If successful, it is added to current template.
   */
  function parseText() {
    let data = match(/([^\[]|\[(?!\[))+/y);
    if (data) {
      stack.template.children.push(data[0]);
      advance();
    }
  }


  /**
   * Parse a block.
   * If successful, it is added to the current template.
   * If parsing fails, an error is generated and the position is left at the
   * point the error was encountered (in order to guarantee progress).
   */
  function parseBlock(): void {
    let opening = parseToken("[[");
    if (opening) {
      let data: ast.BlockData = {
        source:   opening.source,
        line:     opening.line,
        column:   opening.column,
      }
      parseBlockMods(data);
      if (data.comment) {
        let end = match(/([^#]|#(?!]]))*(#]])?/y);
        advance();
        if (!end || !end[2]) {
          throw new ParseError("Unterminated comment", data);
        }
      }
      else {
        parseBlockContents(data);
        if (data.expr) {
          parseBlockParams(data);

          if (parseToken("]]")) {
            if (data.close) {
              if (data.params) {
                try {
                  stack.pop(data.expr);
                }
                catch(e) { }
                throw new ParseError("Closing block may not have parameters", data.params);
              }
              else {
                stack.pop(data.expr);
              }
            }
            else {
              let block = ast.makeBlock(data);
              if (block instanceof ast.Injection) {
                if (stack.block) {
                  stack.block.injections.push(block);
                }
                else {
                  throw new ParseError(
                    "Cannot inject template parameters unless inside a block",
                    block
                  );
                }
              }
              else {
                stack.template.children.push(block);
              }
              if (block.contents) {
                stack.push(block, data.implicit ? null : data.expr, block.contents);
              }
            }
          }
          else {
            throw new ParseError("Expected ]]", curLoc);
          }
        }
        else {
          throw new ParseError("Expected expression for block", curLoc);
        }
      }
    }
  }

  /**
   */
  function parseBlockMods(data: ast.BlockData) {
    let blockMods = match(/(#|-|\+|\*|@?=|@?:)/y);
    if (blockMods) {
      switch (blockMods[1]) {
        case '#':
          data.comment = true;
          break;
        case '-':
          data.close = true;
          break;
        case '+':
          data.open = true;
          break;
        case '*':
          data.open = true;
          data.implicit = true;
          break;
        default:
          data.open = true;
          data.assignThis = new ast.Token(blockMods[1], curLoc);
          break;
      }
      advance();
    }
  }


  /**
   */
  function parseBlockContents(data: ast.BlockData) {
    data.expr = parseExpression();
    if (data.expr) {
      skipWs();
      let assign = match(/[+\-*\/%@]?(=|:)/y);
      if (assign) {
        data.assign = new ast.Token(assign[0], curLoc);
        advance();

        data.target = data.expr;
        data.expr = parseExpression();
      }
    }

    if (! data.expr) {
      throw new ParseError("Expected expression for block", curLoc);
    }
  }


  /**
   */
   function parseBlockParams(data: ast.) {
     let token = parseToken("->");
     if (token) {
       let params = parseSequence(parseIdentifier, "parameter name");
       if (! params) {
         throw new ParseError("Expected parameter list", curLoc);
       }
       data.params = new ast.TemplateParams(params, token);
     }
   }


  /**
   */
  function parseExpression(): Maybe<ast.Expression> {
    let valStack: Stack<ast.Expression> = [];
    let opStack: Stack<ast.BinaryOperation> = [];

    let primary = parsePrimary();
    if (primary) {
      Stack.push(valStack, primary);
      let op = parseBinary();
      while (op) {
        primary = parsePrimary();
        if (primary) {
          while (opStack.top && opStack.top.precedence >= op.precedence) {
            opStack.top.right = Stack.pop(valStack);
            opStack.top.left = Stack.pop(valStack);
            Stack.push(valStack, Stack.pop(opStack));
          }

          Stack.push(opStack, op);
          Stack.push(valStack, primary);
        }
        else {
          throw new ParseError('Expected operand', curLoc);
        }

        op = parseBinary();
      }

      while (opStack.top) {
        opStack.top.right = Stack.pop(valStack);
        opStack.top.left = Stack.pop(valStack);
        Stack.push(valStack, Stack.pop(opStack));
      }

      return Stack.pop(valStack);
    }
  }


  /**
   */
  function parseBinary(): Maybe<ast.BinaryOperation> {
    skipWs();
    let binop = match(/[*\/%+]|-(?!>)|<=?|>=?|[!=]=|&&|\|\|?/y);
    if (binop) {
      let node = new ast.BinaryOperation(binop[0], curLoc);
      advance();
      return node;
    }
  }


  /**
   */
  function parseUnary(): Maybe<ast.UnaryOperation> {
    skipWs();
    let unop = match(/[+\-!]/y);
    if (unop) {
      let node = new ast.UnaryOperation(unop[0], curLoc);
      advance();
      return node;
    }
  }

  /**
   */
  /* Primary := UnaryOp Primary
   *          | Number
   *          | String
   *          | Identifer Deref
   *          | Nested Deref
   * Deref := Empty
   *      | Property Deref
   *      | Call Deref
   *      | Index Deref
   *      | Extend Deref
   */
  function parsePrimary(): Maybe<ast.Expression> {
    let opstack: Stack<ast.UnaryOperation> = [];
    let op = parseUnary();
    while (op) {
      Stack.push(opstack, op);
      op = parseUnary();
    }

    let expr: Maybe<ast.Expression> =
      parseNull() || parseBoolean() || parseNumber() || parseString();
    if (! expr) {
      expr = parseIdentifier() || parseNested();
      if (expr) {
        let next: Maybe<ast.Expression>;
        while (next = parseApplication(expr) || parseExtension(expr) ||
                      parseIndex(expr) || parseProperty(expr)          ) {
          expr = next;
        }
      }
    }

    if (expr) {
      while (opstack.top) {
        opstack.top.right = expr;
        expr = Stack.pop(opstack);
      }
    }

    return expr;
  }


  /* Application := "(" Params ")"
   *
   * Params := Empty | Expression RestOfParams
   *
   * RestOfParams := Empty | "," Expression RestOfParams
   */
  function parseApplication(left: ast.Expression): Maybe<ast.Application> {
    let lparen = parseToken("(");
    if (lparen) {
      let args = parseSequence(parseExpression, "expression");
      if (parseToken(")")) {
        return new ast.Application(left, args || [], lparen);
      }
      else {
        throw new ParseError("Expected closing parenthesis after argument list", curLoc);
      }
    }
  }


  /* Extension := ObjectLiteral
   */
  function parseExtension(left: ast.Expression): Maybe<ast.Extension> {
    let lit = parseObjectLiteral("object extension");
    if (lit) {
      return new ast.Extension(left, lit, lit);
    }
  }


  /*
   */
  function parseIndex(left: ast.Expression): Maybe<ast.Index> {
    let opening = parseToken("[");
    if (opening) {
      let expr = parseExpression();
      if (expr) {
        if (parseToken("]")) {
          return new ast.Index(left, expr, opening);
        }
        else {
          throw new ParseError("Expected closing bracket for index", curLoc);
        }
      }
      else {
        throw new ParseError("Expected expression for index", curLoc);
      }
    }
  }


  /*
   */
  function parseProperty(left: ast.Expression): Maybe<ast.Property> {
    let dot = parseToken(".");
    if (dot) {
      let id = parseIdentifier();
      if (id) {
        return new ast.Property(left, id, dot);
      }
      else {
        throw new ParseError("Expected identifier for property name", curLoc);
      }
    }
  }


  /* Nested := "(" Expression ")"
   */
  function parseNested(): Maybe<ast.Expression> {
    let lparen = parseToken('(');
    if (lparen) {
      let expr = parseExpression();
      if (expr) {
        if (parseToken(')')) {
          return expr;
        }
        else {
          throw new ParseError(
            'Expected closing parenthesis after nested expression',
            curLoc
          );
        }
      }
      else {
        throw new ParseError(
          'Expected expression after opening parenthesis',
          curLoc
        );
      }
    }
  }


  /**
   */
  function parseObjectLiteral(description = "object literal"): Maybe<ast.ObjectLiteral> {
    let opening = parseToken("{");
    if (opening) {
      let obj: Dictionary<ast.Expression> = {};
      let key: Maybe<ast.Identifier>;
      while (key = parseIdentifier()) {
        if (! parseToken(":")) {
          throw new ParseError(`Expected colon after identifier in ${description}`, curLoc);
        }
        let expr = parseExpression();
        if (expr) {
          obj[key.value] = expr;
        }
        else {
          throw new ParseError(`Expected value for property ${key}`, curLoc);
        }
      }
      if (parseToken("}")) {
        return new ast.ObjectLiteral(obj, opening);
      }
      else {
        throw new ParseError(`Expected closing brace after ${description}`, curLoc);
      }
    }
  }


  /**
   */
  function parseArrayLiteral(): Maybe<ast.ArrayLiteral> {
    let opening = parseToken("[");
    if (opening) {
      let arr = parseSequence(parseExpression, "value in array literal") || []
      if (parseToken("]")) {
        return new ast.ArrayLiteral(arr, opening);
      }
      else {
        throw new ParseError("Expected closing bracket after array literal", curLoc);
      }
    }
  }


  /**
   */
  function parseIdentifier(): Maybe<ast.Identifier> {
    skipWs();
    let id = match(/[a-zA-Z_$][\w$]*/y);
    if (id) {
      if (id[0] == "true" || id[0] == "false" || id[0] == "null") {
        let error = new ParseError(
          `Cannot use reserved word "${id[0]}" as identifier`,
          curLoc
        );
        advance();
        throw error;
      }
      else {
        let node = new ast.Identifier(id[0], curLoc);
        advance();
        return node;
      }
    }
  }


  /**
   */
  function parseString(): Maybe<ast.String> {
    skipWs();
    let str = match(/"((?:[^"\\\n]|\\(?:.|\n))*)("?)/y);
    if (str) {
      let unescaped = str[1].replace(/\\(.|\n)/g, (s, c) => {
        switch (c) {
          case 'n': return '\n';
          case 't': return '\t';
          default:  return c;
        }
      })
      let node = new ast.String(unescaped, curLoc);
      advance();
      if (!str[2]) {
        throw new ParseError("Unterminated string literal", curLoc);
      }
      return node;
    }
  }


  /**
   */
  function parseNumber(): Maybe<ast.Number> {
    skipWs();
    let num = match(/(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?/y);
    if (num) {
      let node = new ast.Number(Number(num[0]), curLoc);
      advance();
      return node;
    }
  }


  /**
   */
  function parseNull(): Maybe<ast.Null> {
    skipWs();
    let bool = match(/null/y);
    if (bool) {
      let node = new ast.Null(curLoc);
      advance();
      return node;
    }
  }


  /**
   */
  function parseBoolean(): Maybe<ast.Boolean> {
    skipWs();
    let bool = match(/true|false/y);
    if (bool) {
      let node = new ast.Boolean(bool[0] == "true", curLoc);
      advance();
      return node;
    }
  }


  /**
   */
  function parseSequence<T>(parseT: () => Maybe<T>, description: string): Maybe<T[]> {
    let next = parseT();
    if (next) {
      let all = [next];
      while (parseToken(",")) {
        next = parseT();
        if (! next) {
          throw new ParseError(`Expected ${description}`, curLoc);
        }
        all.push(next);
      }
      return all;
    }
  }


  /**
   */
  function parseToken(value: string): Maybe<ast.Token> {
    skipWs();
    let len = value.length;
    if (text.substr(curPos, len) == value) {
      let token = new ast.Token(value, curLoc);
      curLoc.column += len;
      curPos += len;
      return token;
    }
  }


  /**
   */
  function skipWs() {
    if (lastSkip != curPos) {
      if (match(/\s+/y)) {
        advance();
      }
      lastSkip = curPos;
    }
  }


  /**
   *
  function retractWs() {
    let children = stack.template.children;
    if (children.length) {
      let lastIdx = children.length - 1;
      let last = children[lastIdx];
      if (typeof last === 'string') {
        children[lastIdx] = last.replace(/\s+$/, '');
        if (children[lastIdx] === '') {
          children.pop();
        }
      }
    }
  }


  /**
   */
  function match(regexp: RegExp): RegExpMatchArray|null {
    if (! regexp.sticky) {
      throw new Error("Precondition violation: match called on non-sticky regexp");
    }
    regexp.lastIndex = curPos;
    let m = regexp.exec(text);
    if (m) {
      lastRegexp = regexp;
      lastMatch = m;
    }
    return m;
  }


  /**
   */
  function advance() {
    curPos = lastRegexp.lastIndex;
    countLines(lastMatch[0]);
  }


  /**
   */
  function countLines(text: string) {
    let lineCount = text.match(/\n/g);
    let colCount = (text.match(/.*$/) as RegExpMatchArray)[0];
    if (lineCount) {
      curLoc.line += lineCount.length;
      curLoc.column = colCount.length + 1;
    }
    else {
      curLoc.column += colCount.length;
    }
  }

  function getId(expr: ast.Expression): ast.Expression {
    if (expr instanceof ast.Application) {
      return getId(expr.fn);
    }
    else {
      return expr;
    }
  }

}


export interface BlockData extends Location {
  comment?:    boolean;
  open?:       boolean;
  close?:      boolean;
  implicit?:   boolean;
  assignThis?: Token;
  expr?:       Expression;
  assign?:     Token;
  target?:     Expression;
  params?:     TemplateParams;
}

export function makeBlock(data: BlockData): Block {
  let contents: Maybe<Template>;
  if (data.open) {
    contents = new Template(data.params);
  }
  if (data.assign && data.assignThis) {
    throw new ParseError("Multiple assignment operators", data.assign)
  }
  else if (data.assign) {
    if (data.assign.value.endsWith(':')) {
      if (data.target instanceof Identifier) {
        return new Injection(data.target, data.assign, data.expr as Expression, contents, data);
      }
      else {
        throw new ParseError("Not an identifier", data.target as Expression);
      }
    }
    else {
      if (data.target instanceof LValue) {
        return new Assignment(data.target, data.assign, data.expr as Expression, contents, data);
      }
      else {
        throw new ParseError("Not an lvalue", data.target || data);
      }
    }
  }
  else if (data.assignThis) {
    if (data.assignThis.value.endsWith(':')) {
      if (data.expr instanceof Identifier) {
        let thisContents = new Identifier("thisContents", data.assignThis);
        return new Injection(data.expr, data.assignThis, thisContents, contents, data);
      }
      else {
        throw new ParseError("Not an identifier", data.expr as Expression);
      }
    }
    else {
      if (data.expr instanceof LValue) {
        let thisContents = new Identifier("thisContents", data.assignThis);
        return new Assignment(data.expr, data.assignThis, thisContents, contents, data);
      }
      else {
        throw new ParseError("Not an lvalue", data.expr || data);
      }
    }
  }
  else if (data.expr) {
    return new Block(data.expr, contents, data);
  }
  else {
    throw new ParseError("Expression expected", data);
  }
}
