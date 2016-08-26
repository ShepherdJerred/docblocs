import { Maybe, Stack, push, pop } from './util';
import { Context, ParseError, blockContentsName } from './base';
import { Symbol, BeginBlockToken, EndBlockToken, ParamList, Naming, Node,
  IdentifierNode, NumberNode, StringNode, PropertyNode,
  ApplicationNode, ImportNode, OperationNode, BinaryOperationNode,
  UnaryOperationNode, Definition, Block, Template } from './ast';
import { builtins } from './builtins';

var pat = {
  data: /([^\[]|\[(?!\[))+/y,
  openComment: /\[\[(~?)#/y,
  comment: /(([^#]|#(?!~?]]))*)#(~?)]]/y,
  beginBlock: /\[\[([~=+\-]*)/y,
  endBlock: /([~!?is]*)]]/y,
  number: /(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?/y,
  identifier: /[\w$]+/y,
  dottedIdentifier: /[\w$]+(\.[\w$]+)*/y,
  string: /"((?:[^"\\]|\\.)*)"/y,
  ws: /\s+/y,
  binop: /[.*\/%+\-|]|<=?|>=?|[!=]=|&&|\|\|/y,
  unop: /[\-!]/y
}

/*========================================================*/

var rootId = '<root>';

class BlockStack {
  templates: Template[];
  template: Template;
  ids: Node[];
  id: Node;
  source: string;

  constructor(source: string) {
    this.templates = [];
    this.ids = [];
    this.source = source;
  }

  push(id: Node, template: Template) {
    this.ids.push(id);
    this.templates.push(template);
    this.id = id;
    this.template = template;
  }

  pop(id: Node) {
    if (id.equals(this.id)) {
      let template = this.template;
      this.ids.pop();
      this.templates.pop();
      this.id = this.ids[this.ids.length - 1];
      this.template = this.templates[this.templates.length - 1];
      return template;
    }
    else if (this.id instanceof IdentifierNode && this.id.value === rootId) {
      throw new ParseError(`Unexpected closing tag`, id);
    }
    else {
      throw new ParseError(`Expected [[-${this.id}]]`, id);
    }
  }
}

/*========================================================*/

export function parse(text, source = '<template source>'): Template {
  let pos = 0;
  let loc = {source: source, line: 1, column: 1};
  let endPos = text.length;
  let lastSkip = -1;

  let stack = new BlockStack(source);
  stack.push(
    new IdentifierNode(rootId, loc),
    new Template()
  );

  while (pos < endPos) {
    parseData();
    parseComment();
    parseBlock();
  }

  return stack.pop(new IdentifierNode(rootId, loc));

  /*------------------------------------------------------*/

  function countLines(text: string) {
    let lineCount = text.match(/\n/g);
    let colCount = text.match(/.*$/)[0];
    if (lineCount) {
      loc.line += lineCount.length;
      loc.column = colCount.length + 1;
    }
    else {
      loc.column += colCount.length;
    }
  }

  /*------------------------------------------------------*/

  function parseData() {
    pat.data.lastIndex = pos;
    let match = pat.data.exec(text);
    if (match) {
      stack.template.push(match[0]);
      countLines(match[0]);
      pos = pat.data.lastIndex;
    }
  }

  /*------------------------------------------------------*/

  function parseComment() {
    pat.openComment.lastIndex = pos;
    let match = pat.openComment.exec(text)
    if (match) {
      let trimLeft = match[1] == '~';

      let commentStart = {source: loc.source, line: loc.line, column: loc.column};
      loc.column+= match[0].length;
      pos = pat.openComment.lastIndex;

      pat.comment.lastIndex = pos;
      match = pat.comment.exec(text);
      if (match) {
        countLines(match[0]);
        pos = pat.comment.lastIndex;
      }
      else {
        throw new ParseError('Could not find end of comment', commentStart);
      }

      if (trimLeft) {
        retractWs();
      }
      if (match[3] == '~') {
        skipWs();
      }
    }
  }

  /*------------------------------------------------------*/

  function skipWs() {
    if (lastSkip != pos) {
      pat.ws.lastIndex = pos;
      let match = pat.ws.exec(text);
      if (match) {
        countLines(match[0]);
        pos = pat.ws.lastIndex;
      }
      lastSkip = pos;
    }
  }

  /*------------------------------------------------------*/

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

  /*------------------------------------------------------*/

  function parseNumber(): Maybe<NumberNode> {
    skipWs();
    pat.number.lastIndex = pos;
    let match = pat.number.exec(text);
    if (match) {
      let token = new NumberNode(Number(match[0]), loc);
      loc.column += match[0].length;
      pos = pat.number.lastIndex;
      return token;
    }
  }

  /*------------------------------------------------------*/

  function parseIdentifier(): Maybe<IdentifierNode> {
    skipWs();
    pat.identifier.lastIndex = pos;
    let match = pat.identifier.exec(text);
    if (match) {
      let token = new IdentifierNode(match[0], loc);
      loc.column += match[0].length;
      pos = pat.identifier.lastIndex;
      return token;
    }
  }

  /*------------------------------------------------------*/

  function parseDottedIdentifier(): Maybe<IdentifierNode> {
    skipWs();
    pat.dottedIdentifier.lastIndex = pos;
    let match = pat.dottedIdentifier.exec(text);
    if (match) {
      let token = new IdentifierNode(match[0], loc);
      loc.column += match[0].length;
      pos = pat.dottedIdentifier.lastIndex;
      return token;
    }
  }

  /*------------------------------------------------------*/

  function parseString(): Maybe<StringNode> {
    skipWs();
    pat.string.lastIndex = pos;
    let match = pat.string.exec(text);
    if (match) {
        let token = new StringNode(match[1], loc);
        loc.column += match[0].length;
        pos = pat.string.lastIndex;
        return token;
      }
  }

  /*--------------------------------------------------------*/

  function parseSymbol(value: string): Maybe<Symbol> {
    skipWs();
    let len = value.length;
    if (text.substr(pos, len) == value) {
      let sym = new Symbol(value, loc);
      loc.column += len;
      pos += len;
      return sym;
    }
  }

  /*--------------------------------------------------------
   * Sequence<Something> := Empty
   *                      | NonEmptySequence<Something>
   * NonEmptySequence<paSomething> := Something
   *                              | Something "," NonEmptySequence
   */

  function sequence<T>(something: string,
                       parseSomething: () => Maybe<T>): Maybe<T[]> {
    let first = parseSomething();
    if (first) {
      return restOfSequence(first, something, parseSomething);
    }
  }

  /*--------------------------------------------------------
   * Sequence<Something> := Empty
   *                      | NonEmptySequence<Something>
   * NonEmptySequence<Something> := Something
   *                              | Something "," NonEmptySequence
   */

  function restOfSequence<T>(first: T,
                             something: string,
                             parseSomething: () => Maybe<T>): Maybe<T[]> {
    let seq = [first];
    while (parseSymbol(',')) {
      let next = parseSomething();
      if (next) {
        seq.push(next);
      }
      else {
        throw new ParseError(`Expected ${something}`, loc);
      }
    }
    return seq;
  }

  /*--------------------------------------------------------
   * Property := "." Identifier
   */

  function parseProperty(value: Node): Maybe<PropertyNode> {
    let dot = parseSymbol('.');
    if (dot) {
      let id = parseIdentifier();
      if (id) {
        return new PropertyNode(value, id.value, dot);
      }
      else {
        throw new ParseError('Expected identifier following "."', loc);
      }
    }
  }

  /*--------------------------------------------------------
   * Application := "(" Sequence<Expression> ")"
   */

  function parseApplication(value: Node): Maybe<ApplicationNode> {
    let lparen = parseSymbol('(');
    if (lparen) {
      let args = sequence('argument', parseExpression);
      if (parseSymbol(')')) {
        return new ApplicationNode(value, args ? args : [], lparen);
      }
      else {
        throw new ParseError(
          'Expected closing parenthesis for function call',
          loc
        )
      }
    }
  }

  /*--------------------------------------------------------
   * Nested := "(" Expression ")"
   */

  function parseNested(): Maybe<Node> {
    let lparen = parseSymbol('(');
    if (lparen) {
      let expr = parseExpression();
      if (expr) {
        if (parseSymbol(')')) {
          return expr;
        }
        else {
          throw new ParseError(
            'Expecting closing parenthesis after nested expression',
            loc
          );
        }
      }
      else {
        throw new ParseError(
          'Expecting expression after parenthesis',
          loc
        );
      }
    }
  }

  /*--------------------------------------------------------
   * Import := "@" DottedIdentifier
   *         | "@" Nested
   */
   function parseImport(): Maybe<ImportNode> {
     let at = parseSymbol('@');
     if (at) {
       let id, expr: Node;
       id = parseDottedIdentifier();
       if (id) {
         return new ImportNode(id, expr, at);
       }
       else {
         let expr = parseNested();
         if (expr) {
           return new ImportNode(id, expr, at);
         }
         else {
           throw new ParseError('Invalid argument for import', loc);
         }
       }
     }
   }

  /*------------------------------------------------------*/

  function parseUnary(): Maybe<UnaryOperationNode> {
    skipWs();
    pat.unop.lastIndex = pos;
    let match = pat.unop.exec(text);
    if (match) {
      let token = new UnaryOperationNode(match[0], loc);
      loc.column += match[0].length;
      pos = pat.string.lastIndex;
      return token;
    }
  }

  /*--------------------------------------------------------
   * Primary := UnaryOp Primary
   *          | Number
   *          | String
   *          | Identifer Extra
   *          | Nested Extra
   *          | Import Extra
   * Extra := Empty
   *        | Property Extra
   *        | Application Extra
   */

  function parsePrimary(): Maybe<Node> {
    let opstack: Stack<UnaryOperationNode> = [];
    let op = parseUnary();
    while (op) {
      push(opstack, op);
    }

    let node: Maybe<Node> = parseNumber() || parseString();
    if (! node) {
      node = parseIdentifier() || parseNested() || parseImport();
      if (node) {
        let next: Maybe<Node> = parseProperty(node) || parseApplication(node);
        while (next) {
          let x = loc;
          node = next;
          next = parseProperty(node) || parseApplication(node);
        }
      }
    }

    if (node) {
      while (opstack.length) {
        opstack.top.right = node;
        node = pop(opstack);
      }
    }

    return node;
  }

  /*------------------------------------------------------*/

  function parseBinary(): Maybe<BinaryOperationNode> {
    skipWs();
    pat.binop.lastIndex = pos;
    let match = pat.unop.exec(text);
    if (match) {
      let token = new BinaryOperationNode(match[0], loc);
      loc.column += match[0].length;
      pos = pat.string.lastIndex;
      return token;
    }
  }

  /*------------------------------------------------------*/

  function parseExpression(): Maybe<Node> {
    let valStack: Stack<Node> = [];
    let opStack: Stack<BinaryOperationNode> = [];

    let primary = parsePrimary();
    if (primary) {
      push(valStack, primary);
      let op = parseBinary();
      while (op) {
        primary = parsePrimary();
        if (primary) {
          while (opStack.length && opStack.top.precedence >= op.precedence) {
            opStack.top.right = pop(valStack);
            opStack.top.left = pop(valStack);
            push<Node>(valStack, pop(opStack));
          }

          push(opStack, op);
          push(valStack, primary);
        }
        else {
          throw new ParseError('Expected operand', loc);
        }

        op = parseBinary();
      }

      while (opStack.length) {
        opStack.top.right = pop(valStack);
        opStack.top.left = pop(valStack);
        push<Node>(valStack, pop(opStack));
      }

      return pop(valStack);
    }
  }

  /*------------------------------------------------------*/

  function parseNamedExpression(): Maybe<Naming> {
    let id = parseIdentifier();
    if (id) {
      let eq = parseSymbol('=');
      if (! eq) {
        throw new ParseError('Expected "="', loc);
      }

      let expr = parseExpression();
      if (! expr) {
        throw new ParseError('Expected expression', loc);
      }

      return new Naming(id, expr, eq);;
    }
  }

  /*------------------------------------------------------*/

  function parsePossiblyNamedExpression(): Maybe<Node|Naming> {
    let expr = parseExpression();
    if (expr instanceof IdentifierNode) {
      let eq = parseSymbol('=');
      if (eq) {
        let actualExpr = parseExpression();
        if (!actualExpr) {
          throw new ParseError('Expected expression', loc);
        }
        return new Naming(expr, actualExpr, eq);
      }
    }
    return expr;
  }

  /*------------------------------------------------------*/

  function parseParams(): Maybe<ParamList> {
    let arrow = parseSymbol('->');
    if (arrow) {
      let params = sequence('parameter', parseIdentifier);
      if (params) {
        let list = <ParamList>params.map((id) => id.value);
        list.source = arrow.source;
        list.line = arrow.line;
        list.column = arrow.column;
        return list;
      }
      else {
        throw new ParseError(
          'Empty parameter list or invalid character in parameter list',
          loc
        )
      }
    }
  }

  /*------------------------------------------------------*/

  function parseBeginBlock(): Maybe<BeginBlockToken> {
    pat.beginBlock.lastIndex = pos;
    let match = pat.beginBlock.exec(text);
    if (match) {
      let token: BeginBlockToken = {
        source: loc.source,
        line: loc.line,
        column: loc.column,
        trimLeft: match[1].indexOf('~') >= 0,
        open: match[1].indexOf('+') >= 0,
        close: match[1].indexOf('-') >= 0,
        fragdef: match[1].indexOf('=') >= 0
      };

      loc.column += match[0].length;
      pos = pat.beginBlock.lastIndex;

      return token;
    }
  }


  /*------------------------------------------------------*/

  function parseEndBlock(): Maybe<EndBlockToken> {
    pat.endBlock.lastIndex = pos;
    let match = pat.endBlock.exec(text);
    if (match) {
      let token: EndBlockToken = {
        source: loc.source,
        line: loc.line,
        column: loc.column,
        trimRight: match[1].indexOf('~') >= 0,
        escape: match[1].indexOf('!') >= 0,
        optional: match[1].indexOf('?') >= 0,
        static: match[1].indexOf('s') >= 0,
        instance: match[1].indexOf('i') >= 0
      };

      loc.column += match[0].length;
      pos = pat.endBlock.lastIndex;

      return token;
    }
  }

  /*-------------------------------------------------------------------------------*\
              open    close   include fragment escape  optional expression definition
  open        ---     XXX     XXX     ok       XXX     XXX      ok         ok
  close       XXX     ---     XXX     XXX      XXX     XXX      id         XXX
  include     XXX     XXX     ---     XXX      XXX     XXX      id|id()    XXX
  fragment    req     XXX     XXX     ---      XXX     XXX      id         XXX
  escape      XXX     XXX     XXX     XXX      ---     ok       req        XXX
  optional    XXX     XXX     XXX     XXX      ok      ---      req        XXX
  expression  ok      id      id|id() id       ok      ok       ---        XXX
  definition  ok      XXX     XXX     XXX      XXX     XXX      XXX        ---
  \*-------------------------------------------------------------------------------*/

  function validateBlock(begin:  BeginBlockToken,
                         inner:  Node|Naming,
                         params: Maybe<ParamList>,
                         end:    EndBlockToken   ) {
    if (begin.open) {
      if (begin.close) {
        throw new ParseError(
          'Block cannot contains both open and close prefixes',
          begin
        );
      }
    }
    else if (params) {
      throw new ParseError(
        'Only open blocks can have parameters',
        params
      );
    }
    else if (begin.close) {
      if (begin.fragdef) {
        throw new ParseError(
          'Closing block should not have fragment definition prefix',
          begin
        )
      }
      if (end.escape || end.optional) {
        throw new ParseError(
          'Closing block cannot use escape or optional suffixes',
          end
        );
      }
      if (end.static || end.instance) {
        throw new ParseError(
          'Closing block cannot use static or instance suffixes',
          end
        )
      }
      if (! (inner instanceof IdentifierNode)) {
        throw new ParseError(
          'Closing block should only contain identifier',
          inner
        )
      }
    }
    else if (begin.fragdef) {
      if (! begin.open) {
        throw new ParseError(
          'Fragment definition requires conents',
          inner
        )
      }
      if (end.escape || end.optional) {
        throw new ParseError(
          'Fragment definition block cannot use escape or optional prefixes',
          end
        )
      }
      if (! (inner instanceof IdentifierNode)) {
        throw new ParseError(
          'Fragment definition block requires identifier',
          inner
        );
      }
      if (end.static && end.instance) {
        throw new ParseError(
          'Definition cannot be both static and instance',
          end
        )
      }
    }
    else if (inner instanceof Node) {
      if (end.static || end.instance) {
        throw new ParseError(
          'Only definitions may use static or instance suffixes',
          end
        )
      }
    }
    else {
      if (end.escape || end.optional) {
        throw new ParseError(
          'Definition cannot use escape or optional prefixes',
          end
        )
      }
      if (end.static && end.instance) {
        throw new ParseError(
          'Definition cannot be both static and instance',
          end
        )
      }
    }
  }

  /*------------------------------------------------------*/

  function translateFragmentDefinition(id: Node|Naming): Naming {
    if (id instanceof IdentifierNode) {
      return new Naming(id, new IdentifierNode(blockContentsName, id), id);
    }
    else {
      // Shouldn't reach -- already validated
      throw new ParseError('Fragment definition block requires identifier', id);
    }
  }

  function translateImport(expr: Node|Naming, end: EndBlockToken): Node|Naming {
    if (expr instanceof ImportNode && expr.id) {
      if (!end.instance) {
        end.static = true;
      }
      let id = new IdentifierNode(expr.id.value.match(/[^.]*$/)[0], expr.id);
      return new Naming(id, expr, expr);
    }
    else {
      return expr;
    }
  }

  /*------------------------------------------------------*/

  function parseBlock(): boolean {
    let begin = parseBeginBlock();
    if (begin) {
      let inner: Maybe<Node|Naming> = parsePossiblyNamedExpression();
      if (! inner) {
        if (begin.close) {
          inner = new IdentifierNode(blockContentsName, loc);
        }
        else {
          inner = new ApplicationNode(new IdentifierNode(blockContentsName, loc), [], loc);
        }
      }
      let params = parseParams();
      let end = parseEndBlock();
      if (! end) {
        throw new ParseError(
          'Missing closing "]]" or invalid charcter in block',
          loc
        );
      }

      validateBlock(begin, inner, params, end);

      if (begin.trimLeft) {
        retractWs();
      }
      if (end.trimRight) {
        skipWs();
      }

      if (begin.close) {
        // Special case for closing block
        if (inner instanceof ApplicationNode) {
          stack.pop(inner.fn)
        }
        else {
          stack.pop(<Node>inner);
        }
      }
      else {
        // If block has contents, create template for it
        let contents: Template;
        let tagId: Node;
        if (begin.open) {
          contents = new Template(<string[]>params);
          tagId = inner instanceof Naming ? inner.name :
            (inner instanceof ApplicationNode ? inner.fn :
              inner);
        }

        // Translate syntactic sugar
        if (begin.fragdef) {
          inner = translateFragmentDefinition(inner);
        }
        else {
          inner = translateImport(inner, end);
        }

        // Either add block as child or as member
        let block = new Block(inner instanceof Naming ? inner.node : inner, contents, begin);
        if (inner instanceof Naming) {
          stack.template.define(inner.name, block, end.static);
        }
        else {
          if (end.escape) {
            block.escape = true;
          }
          if (end.optional) {
            block.optional = true;
          }
          stack.template.push(block);
        }

        // If block has contents, we are now ready to begin parsing its contents
        if (begin.open) {
          stack.push(tagId, contents);
        }
      }

      return true;
    }

    return false;
  }

  /*------------------------------------------------------*/

}

