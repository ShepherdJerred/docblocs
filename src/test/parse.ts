import { parseRaw } from "../exec/parse";
import * as ast from "../ast";
import { ParseError } from "../exec/error";
import { construct, compare } from "./construct";
import should = require('should');

describe('parse function', () => {

  describe('basic blocks', () => {

    it('should parse a single text block', () => {
      let text = 'this is a single [text] block';
      let result = parseRaw(text);
      should(result).be.instanceof(ast.Template);
      result.should.have.property('children').which.is.Array().of.length(1);
      result.children[0].should.equal(text);
    });

    it('should allow multi-line blocks', () => {
      let text = 'this is a\nmulti-line\n\ntext block\n';
      let result = parseRaw(text);
      should(result).be.instanceof(ast.Template);
      result.should.have.property('children').which.is.Array().of.length(1);
      result.children[0].should.equal(text);
    })

    it('should ignore comment blocks', () => {
      let text = 'there is [[# a\n#multi-line#\n comment #]] in [[#this#]] block\n';
      let result = parseRaw(text);
      should(result).be.instanceof(ast.Template);
      result.should.have.property('children').which.is.Array().of.length(3);
      result.children[0].should.equal('there is ');
      result.children[1].should.equal(' in ');
      result.children[2].should.equal(' block\n');
    })

    it('should give an error on incomplete comments', () => {
      let text = 'this text has a [[# incomplete comment block ]]';
      let pieces = text.split('[[#');
      parseRaw.bind(null, text).should.throw(ParseError, {
        line: 1,
        column: pieces[0].length
      })
    })

    it('should throw on invalid blocks', () => {
      let text = 'big [[frickin} whoops';
      parseRaw.bind(null, text).should.throw(ParseError, {
        line: 1,
        column: 'big [[frickin'.length
      })
    })

    it('should parse a block with null', () => {
      let text = `[[null]]`;
      let result = parseRaw(text);
      should(result).be.instanceof(ast.Template);
      result.should.have.property('children').which.is.Array().of.length(1);
      result.children[0].should.be.instanceof(ast.Block);
      let b = <ast.Block>result.children[0];
      b.should.have.property('expr').which.is.an.instanceof(ast.Null);
    })

    it('should parse a block with a boolean', () => {
      for (let value of [true, false]) {
        let text = `[[${value}]]`;
        let result = parseRaw(text);
        should(result).be.instanceof(ast.Template);
        result.should.have.property('children').which.is.Array().of.length(1);
        result.children[0].should.be.instanceof(ast.Block);
        let b = <ast.Block>result.children[0];
        b.should.have.property('expr').which.is.an.instanceof(ast.Boolean);
        let n = <ast.Number>b.expr;
        n.should.have.property('value').equal(value);
      }
    })

    it('should parse a block with a number', () => {
      let text = '[[3.14]]';
      let result = parseRaw(text);
      should(result).be.instanceof(ast.Template);
      result.should.have.property('children').which.is.Array().of.length(1);
      result.children[0].should.be.instanceof(ast.Block);
      let b = <ast.Block>result.children[0];
      b.should.have.property('expr').which.is.an.instanceof(ast.Number);
      let n = <ast.Number>b.expr;
      n.should.have.property('value').equal(3.14);
    })

    it('should parse a block with a string', () => {
      let text = '[["hello, world"]]';
      let result = parseRaw(text);
      should(result).be.instanceof(ast.Template);
      result.should.have.property('children').which.is.Array().of.length(1);
      result.children[0].should.be.instanceof(ast.Block);
      let b = <ast.Block>result.children[0];
      b.should.have.property('expr').which.is.an.instanceof(ast.String);
      let n = <ast.String>b.expr;
      n.should.have.property('value').equal('hello, world');
    })

    it('should parse escape sequences in a string', () => {
      let text = '[["he said,\\\n\\"hello\\\\\\tworld\\"\\n"]]';
      let result = parseRaw(text);
      should(result).be.instanceof(ast.Template);
      result.should.have.property('children').which.is.Array().of.length(1);
      result.children[0].should.be.instanceof(ast.Block);
      let b = <ast.Block>result.children[0];
      b.should.have.property('expr').which.is.an.instanceof(ast.String);
      let n = <ast.String>b.expr;
      n.should.have.property('value').equal('he said,\n"hello\\\tworld"\n');
    })

    it ('should allow ]] in strings', () => {
      let text = '[["]]"]]';
      let result = parseRaw(text);
      should(result).be.instanceof(ast.Template);
      result.should.have.property('children').which.is.Array().of.length(1);
      result.children[0].should.be.instanceof(ast.Block);
      let b = <ast.Block>result.children[0];
      b.should.have.property('expr').which.is.an.instanceof(ast.String);
      let n = <ast.String>b.expr;
      n.should.have.property('value').equal(']]');
    })

    it ('should allow empty strings', () => {
      let text = '[[""]]';
      let result = parseRaw(text);
      should(result).be.instanceof(ast.Template);
      result.should.have.property('children').which.is.Array().of.length(1);
      result.children[0].should.be.instanceof(ast.Block);
      let b = <ast.Block>result.children[0];
      b.should.have.property('expr').which.is.an.instanceof(ast.String);
      let n = <ast.String>b.expr;
      n.should.have.property('value').equal('');
    })

    it('should parse a block with an identifier', () => {
      let text = '[[skippy]]';
      let result = parseRaw(text);
      should(result).be.instanceof(ast.Template);
      result.should.have.property('children').which.is.Array().of.length(1);
      result.children[0].should.be.instanceof(ast.Block);
      let b = <ast.Block>result.children[0];
      b.should.have.property('expr').which.is.an.instanceof(ast.Identifier);
      let n = <ast.Identifier>b.expr;
      n.should.have.property('value').equal('skippy');
    })

    it('should parse multiple blocks', () => {
      let text = 'Hello, [[ name ]]!\n[[#\nwhatever\n#]]\nYou owe [[money(100, "USD")]].\n[[done]]';
      let result = parseRaw(text);
      should(result).be.instanceof(ast.Template);
      result.should.have.property('children').which.is.Array().of.length(7);
      result.children[0].should.be.a.String().equal('Hello, ');
      result.children[1].should.be.instanceof(ast.Block);
      let b = <ast.Block>result.children[1];
      b.should.have.property('expr').which.is.an.instanceof(ast.Identifier)
        .with.property('value').equal('name');

      result.children[2].should.be.a.String().equal('!\n');
      result.children[3].should.be.a.String().equal('\nYou owe ');
      result.children[4].should.be.instanceof(ast.Block);
      b = <ast.Block>result.children[4];
      b.should.have.property('expr').which.is.an.instanceof(ast.Application);
      let app = <ast.Application>b.expr;
      app.fn.should.be.an.instanceof(ast.Identifier).with.property('value').equal('money');
      app.args.should.be.an.Array().of.length(2);
      app.args[0].should.be.an.instanceof(ast.Number).with.property('value').equal(100);
      app.args[1].should.be.an.instanceof(ast.String).with.property('value').equal("USD");

      result.children[5].should.be.a.String().equal('.\n');
      result.children[6].should.be.an.instanceof(ast.Block);
      b = <ast.Block>result.children[6];
      b.should.have.property('expr').which.is.an.instanceof(ast.Identifier)
        .which.has.property('value').equal('done');
    })

    it('should track line and column across blocks', () => {
      let text = 'abc\nde[[# def \n ghi #]] jkl [[x ( 3,\n"f") ]][[nop]]';
      let result = parseRaw(text);
      should(result).be.instanceof(ast.Template);
      result.should.have.property('children').which.is.Array().of.length(4);
      result.children[2].should.be.instanceof(ast.Block);
      let b = (<ast.Block>result.children[2]);
      let x = ' ghi #]] jkl '.length + 1;
      b.should.match({line: 3, column: x});
      b.should.have.property('expr').which.is.an.instanceof(ast.Application);
      let n = <ast.Application>b.expr;
      n.fn.should.match({line: 3, column: x + 2});
      n.args[0].should.match({line: 3, column: x + 6});
      n.args[1].should.match({line: 4, column: 1});
      result.children[3].should.be.instanceof(ast.Block);
      b = <ast.Block>result.children[3];
      x = '"f") ]]'.length + 1;
      b.should.match({line: 4, column: x});
    })
  });

  describe("expressions", () => {

    it('should parse nested expressions', () => {
      let text = '[[(x)]][[(3)]][["hello"]]';
      let result = parseRaw(text);
      should(result).be.instanceof(ast.Template);
      result.should.have.property('children').which.is.Array().of.length(3);

      result.children[0].should.be.instanceof(ast.Block);
      let b = <ast.Block>result.children[0];
      b.should.have.property('expr').which.is.an.instanceof(ast.Identifier)
        .with.property('value').equal('x');

      result.children[1].should.be.instanceof(ast.Block);
      b = <ast.Block>result.children[1];
      b.should.have.property('expr').which.is.an.instanceof(ast.Number)
        .with.property('value').equal(3);

      result.children[2].should.be.instanceof(ast.Block);
      b = <ast.Block>result.children[2];
      b.should.have.property('expr').which.is.an.instanceof(ast.String)
        .with.property('value').equal('hello');
    })

    it('should parse unary operators', () => {
      let text = '[[!x]][[(-x)]][[(+x)]]';
      let result = parseRaw(text);
      should(result).be.instanceof(ast.Template);
      result.should.have.property('children').which.is.Array().of.length(3);

      result.children[0].should.be.instanceof(ast.Block);
      let b = <ast.Block>result.children[0];
      b.should.have.property('expr').which.is.an.instanceof(ast.UnaryOperation);
      let u = <ast.UnaryOperation>b.expr;
      u.should.have.property('op').which.is.equal('!');
      u.should.have.property('right').which.is.an.instanceof(ast.Identifier)
        .with.property('value').equal('x');

      result.children[1].should.be.instanceof(ast.Block);
      b = <ast.Block>result.children[1];
      b.should.have.property('expr').which.is.an.instanceof(ast.UnaryOperation);
      u = <ast.UnaryOperation>b.expr;
      u.should.have.property('op').which.is.equal('-');
      u.should.have.property('right').which.is.an.instanceof(ast.Identifier)
        .with.property('value').equal('x');

      result.children[2].should.be.instanceof(ast.Block);
      b = <ast.Block>result.children[2];
      b.should.have.property('expr').which.is.an.instanceof(ast.UnaryOperation);
      u = <ast.UnaryOperation>b.expr;
      u.should.have.property('op').which.is.equal('+');
      u.should.have.property('right').which.is.an.instanceof(ast.Identifier)
        .with.property('value').equal('x');
    })

    it('should parse binary operators', () => {
      for (let op of ['+', '-', '*', '/', '%', '<', '>', '<=', '>=', '==', '!=', '&&', '||', '|']) {
        let text = `[[x${op}1]]`;
        let result = parseRaw(text);
        should(result).be.instanceof(ast.Template);
        result.should.have.property('children').which.is.Array().of.length(1);
        result.children[0].should.be.instanceof(ast.Block);
        let b = <ast.Block>result.children[0];
        b.should.have.property('expr').which.is.an.instanceof(ast.BinaryOperation);
        let o = <ast.BinaryOperation>b.expr;
        o.should.have.property('op').which.is.equal(op);
        o.should.have.property('left').which.is.an.instanceof(ast.Identifier)
          .with.property('value').equal('x');
        o.should.have.property('right').which.is.an.instanceof(ast.Number)
          .with.property('value').equal(1);
      }
    })

    it('should parse binary operators as left-associative', () => {
      for (let op of (['+', '<', '!='])) {
        let text = `[[w ${op} x ${op} y ${op} z]]`;
        let result = parseRaw(text);
        should(result).be.instanceof(ast.Template);
        result.should.have.property('children').which.is.Array().of.length(1);
        result.children[0].should.be.instanceof(ast.Block);
        let b = <ast.Block>result.children[0];
        b.should.have.property('expr').which.is.an.instanceof(ast.BinaryOperation);

        let o = <ast.BinaryOperation>b.expr;
        o.should.have.property('right')
          .which.is.an.instanceof(ast.Identifier).with.property('value')
          .which.is.equal('z');
        o.should.have.property('left').which.is.an.instanceof(ast.BinaryOperation);

        o = <ast.BinaryOperation>o.left;
        o.should.have.property('right')
          .which.is.an.instanceof(ast.Identifier).with.property('value')
          .which.is.equal('y');
        o.should.have.property('left').which.is.an.instanceof(ast.BinaryOperation);

        o = <ast.BinaryOperation>o.left;
        o.should.have.property('right')
          .which.is.an.instanceof(ast.Identifier).with.property('value')
          .which.is.equal('x');
        o.should.have.property('left')
          .which.is.an.instanceof(ast.Identifier).with.property('value')
          .which.is.equal('w');
      }
    })

    it('should parse binary operators using precedence', () => {
      let text = "[[a * b + c / d == 3 && e > f == true]]";
      let result = parseRaw(text);
      should(result).be.instanceof(ast.Template);
      result.should.have.property('children').which.is.Array().of.length(1);
      result.children[0].should.be.instanceof(ast.Block);
      let b = <ast.Block>result.children[0];
      b.should.have.property('expr').which.is.an.instanceof(ast.BinaryOperation);
      let o = <ast.BinaryOperation>b.expr;

      compare(o,
        construct(
          ["&&",
            ["==",
              ["+",
                ["*", "a", "b"],
                ["/", "c", "d"]
              ],
              3
            ],
            ["==",
              [">", "e", "f"],
              true
            ]
          ]
        )
      );
    })

    it('should parse a block with a function call', () => {
      let text = '[[repeat("abc", 7)]]';
      let result = parseRaw(text);
      should(result).be.instanceof(ast.Template);
      result.should.have.property('children').which.is.Array().of.length(1);
      result.children[0].should.be.instanceof(ast.Block);
      let b = <ast.Block>result.children[0];
      b.should.have.property('expr').which.is.an.instanceof(ast.Application);
      let n = <ast.Application>b.expr;
      n.should.have.property('fn').which.is.an.instanceof(ast.Identifier)
        .with.property('value').equal('repeat');
      n.should.have.property('args').which.is.an.Array().of.length(2);
      n.args[0].should.be.an.instanceof(ast.String).with.property('value').equal('abc');
      n.args[1].should.be.an.instanceof(ast.Number).with.property('value').equal(7);
    })

    it('should make arguments optional on closing function call block', () => {
      let text = '[[+f(3)]]hey[[-f(3)]][[+g(7)]]ho[[-g]]';
      let result = parseRaw(text);
      should(result).be.instanceof(ast.Template);
      result.should.have.property('children').which.is.Array().of.length(2);
      result.children[0].should.be.instanceof(ast.Block);
      let b = <ast.Block>result.children[0];
      b.should.have.property('expr').which.is.an.instanceof(ast.Application);
      let n = <ast.Application>b.expr;
      n.should.have.property('fn').which.is.an.instanceof(ast.Identifier)
        .with.property('value').equal('f');
      n.should.have.property('args').which.is.an.Array().of.length(1);
      n.args[0].should.be.an.instanceof(ast.Number).with.property('value').equal(3);

      b = <ast.Block>result.children[1];
      b.should.have.property('expr').which.is.an.instanceof(ast.Application);
      n = <ast.Application>b.expr;
      n.should.have.property('fn').which.is.an.instanceof(ast.Identifier)
        .with.property('value').equal('g');
      n.should.have.property('args').which.is.an.Array().of.length(1);
      n.args[0].should.be.an.instanceof(ast.Number).with.property('value').equal(7);
    })

    it('should parse extensions', () => {
      let text = '[[o{x: 5}]][[o{y: 7}.y]]';
      let result = parseRaw(text);
      should(result).be.instanceof(ast.Template);
      result.should.have.property('children').which.is.Array().of.length(2);
      result.children[0].should.be.instanceof(ast.Block);

      let b = <ast.Block>result.children[0];
      b.should.have.property('expr').which.is.an.instanceof(ast.Extension);
      let e = <ast.Extension>b.expr;
      e.should.have.property('object').which.is.an.instanceof(ast.Identifier)
        .with.property('value').equal('o');
      e.should.have.property('extension').which.is.an.instanceof(ast.ObjectLiteral)
        .with.property('value').which.is.an.Object()
        .with.property('x').which.is.an.instanceof(ast.Number)
        .with.property('value').equal(5);

      b = <ast.Block>result.children[1];
      b.should.have.property('expr').which.is.an.instanceof(ast.Property);
      let p = <ast.Property>b.expr;
      p.should.have.property('property').which.is.an.instanceof(ast.Identifier)
        .with.property('value').equal('y');
      p.should.have.property('object').which.is.an.instanceof(ast.Extension);
      e = <ast.Extension>p.object;
      e.should.have.property('object').which.is.an.instanceof(ast.Identifier)
        .with.property('value').equal('o');
      e.should.have.property('extension').which.is.an.instanceof(ast.ObjectLiteral)
        .with.property('value').which.is.an.Object()
        .with.property('y').which.is.an.instanceof(ast.Number)
        .with.property('value').equal(7);
    })
  });

  describe("block templates", () => {

    it('should parse opening and closing blocks', () => {
      let text = 'Hello [[+big]]bad[[-big]] world';
      let result = parseRaw(text);
      should(result).be.instanceof(ast.Template);
      result.should.have.property('children').which.is.Array().of.length(3);
      result.children[0].should.be.a.String().equal('Hello ');
      result.children[1].should.be.instanceof(ast.Block);
      let b = <ast.Block>result.children[1];
      b.should.have.property('expr').which.is.an.instanceof(ast.Identifier)
        .with.property('value').equal('big');
      b.should.have.property('contents').which.is.an.instanceof(ast.Template);
      let t = <ast.Template>b.contents;
      t.should.have.property('children').which.is.Array().of.length(1);
      t.children[0].should.be.a.String().equal('bad');
      result.children[2].should.be.a.String().equal(' world');
    })

    it('should throw on missing closing block', () => {
      let text = '[[+one]][[+two]]hello[[-one]]';
      parseRaw.bind(null, text).should.throw(ParseError, {column: '[[+one]][[+two]]hello[[-'.length});
      text = '[[+one]]';
      parseRaw.bind(null, text).should.throw(ParseError, {column: '[[+one]]'.length});
    })

    it('should parse nested blocks', () => {
      let text = '[[+one]][[+two]]hello[[-two]][[-one]]';
      let result = parseRaw(text);
      should(result).be.instanceof(ast.Template);
      result.should.have.property('children').which.is.Array().of.length(1);
      result.children[0].should.be.instanceof(ast.Block);

      let b = <ast.Block>result.children[0];
      b.should.have.property('expr').which.is.an.instanceof(ast.Identifier)
        .with.property('value').which.is.equal('one');
      b.should.have.property('contents').which.is.an.instanceof(ast.Template);

      let t = <ast.Template>b.contents;
      t.should.have.property('children').which.is.Array().of.length(1);
      result.children[0].should.be.instanceof(ast.Block);

      b = <ast.Block>t.children[0];
      b.should.have.property('expr').which.is.an.instanceof(ast.Identifier)
        .with.property('value').which.is.equal('two');
      b.should.have.property('contents').which.is.an.instanceof(ast.Template);

      t = <ast.Template>b.contents;
      t.should.have.property('children').which.is.Array().of.length(1);
      t.children[0].should.equal('hello');
    })


    it('should not throw on missing implicit closing block', () => {
      let text = '[[+one]][[*two]]hello[[-one]]';
      let result = parseRaw(text);
      should(result).be.instanceof(ast.Template);
      result.should.have.property('children').which.is.Array().of.length(1);
      result.children[0].should.be.instanceof(ast.Block);

      let b = <ast.Block>result.children[0];
      b.should.have.property('expr').which.is.an.instanceof(ast.Identifier)
        .with.property('value').which.is.equal('one');
      b.should.have.property('contents').which.is.an.instanceof(ast.Template);

      let t = <ast.Template>b.contents;
      t.should.have.property('children').which.is.Array().of.length(1);
      result.children[0].should.be.instanceof(ast.Block);

      b = <ast.Block>t.children[0];
      b.should.have.property('expr').which.is.an.instanceof(ast.Identifier)
        .with.property('value').which.is.equal('two');
      b.should.have.property('contents').which.is.an.instanceof(ast.Template);

      t = <ast.Template>b.contents;
      t.should.have.property('children').which.is.Array().of.length(1);
      t.children[0].should.equal('hello');
    })

    it('should parse template param list', () => {
      let text = '[[+foo -> x, y, z]][[-foo]]';
      let result = parseRaw(text);
      should(result).be.instanceof(ast.Template);
      result.should.have.property('children').which.is.Array().of.length(1);
      result.children[0].should.be.instanceof(ast.Block);
      let b = <ast.Block>result.children[0];
      b.should.have.property('expr').which.is.an.instanceof(ast.Identifier);
      b.should.have.property('contents').which.is.an.instanceof(ast.Template);

      let t = b.contents as ast.Template;
      t.should.have.property('params').which.is.instanceof(ast.TemplateParams);
      let p = t.params as ast.TemplateParams;
      p.should.have.property('ids').which.is.Array().of.length(3);
      p.ids[0].should.be.an.instanceof(ast.Identifier)
        .with.property('value').equal('x');
      p.ids[1].should.be.an.instanceof(ast.Identifier)
        .with.property('value').equal('y');
      p.ids[2].should.be.an.instanceof(ast.Identifier)
        .with.property('value').equal('z');
    })
  });

  describe("assignments", () => {

    it('should parse assignments', () => {
      let text = '[[pi = 3.14]]';
      let result = parseRaw(text);
      should(result).be.instanceof(ast.Template);
      result.should.have.property('children').which.is.Array().of.length(1);
      result.children[0].should.be.instanceof(ast.Assignment);
      let a = <ast.Assignment>result.children[0];
      a.should.have.property('target').which.is.an.instanceof(ast.Identifier)
        .with.property('value').equal('pi');
      a.should.have.property('operator').which.is.an.instanceof(ast.Token)
        .with.property('value').equal('=');
      a.should.have.property('expr').which.is.an.instanceof(ast.Number)
        .with.property('value').equal(3.14);
    })

    it('should parse implicit assignments', () => {
      let text = '[[=foo]]hello[[-foo]]';
      let result = parseRaw(text);
      should(result).be.instanceof(ast.Template);
      result.should.have.property('children').which.is.Array().of.length(1);
      result.children[0].should.be.instanceof(ast.Assignment);
      let a = <ast.Assignment>result.children[0];
      a.should.have.property('target').which.is.an.instanceof(ast.Identifier)
        .with.property('value').equal('foo');
      a.should.have.property('operator').which.is.an.instanceof(ast.Token)
        .with.property('value').equal('=');
      a.should.have.property('expr').which.is.an.instanceof(ast.Identifier)
        .with.property('value').equal('thisContents');
      a.should.have.property('contents').which.is.an.instanceof(ast.Template);

      let t = a.contents as ast.Template;
      t.should.have.property('children').which.is.Array().of.length(1);
      t.children[0].should.be.String().equal('hello');
    })

    it('should parse parameter injections', () => {
      let text = '[[+foo]][[pi: 3.14]][[-foo]]';
      let result = parseRaw(text);
      should(result).be.instanceof(ast.Template);
      result.should.have.property('children').which.is.Array().of.length(1);
      result.children[0].should.be.instanceof(ast.Block);

      let b = <ast.Block>result.children[0];
      b.should.have.property('injections').which.is.Array().of.length(1);
      b.injections[0].should.be.instanceof(ast.Injection);

      let i = b.injections[0];
      i.should.have.property('target').which.is.instanceof(ast.Identifier)
        .with.property('value').equal('pi');
      i.should.have.property('operator').which.is.instanceof(ast.Token)
        .with.property('value').equal(':');
      i.should.have.property('expr').which.is.instanceof(ast.Number)
        .with.property('value').equal(3.14);
    })

    it('should parse implicit injections', () => {
      let text = '[[+foo]][[:bar]]goodbye[[-bar]][[-foo]]';
      let result = parseRaw(text);
      should(result).be.instanceof(ast.Template);
      result.should.have.property('children').which.is.Array().of.length(1);
      result.children[0].should.be.instanceof(ast.Block);

      let b = <ast.Block>result.children[0];
      b.should.have.property('injections').which.is.Array().of.length(1);
      b.injections[0].should.be.instanceof(ast.Injection);

      let i = b.injections[0];
      i.should.have.property('target').which.is.instanceof(ast.Identifier)
        .with.property('value').equal('bar');
      i.should.have.property('operator').which.is.instanceof(ast.Token)
        .with.property('value').equal(':');
      i.should.have.property('expr').which.is.instanceof(ast.Identifier)
        .with.property('value').equal('thisContents');
    })
  })
});
