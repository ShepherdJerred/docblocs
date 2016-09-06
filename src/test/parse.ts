import { Definition, Block, IdentifierNode, StringNode, NumberNode,
  ApplicationNode, ImportNode, Template, TemplateResult } from '../ast';
import { parse } from '../parse';
import { ParseError } from '../base';
import { builtins } from '../builtins';
import should = require('should');
import request = require('supertest');

describe('parse function', () => {

  it('should parse a single data block', () => {
    let text = 'this is a single [data] block';
    let result = parse(text);
    should(result).be.instanceof(Template);
    result.should.have.property('children').which.is.Array().of.length(1);
    result.children[0].should.equal(text);
  })

  it('should allow multi-line blocks', () => {
    let text = 'this is a\nmulti-line\n\ndata block\n';
    let result = parse(text);
    should(result).be.instanceof(Template);
    result.should.have.property('children').which.is.Array().of.length(1);
    result.children[0].should.equal(text);
  })

  it('should ignore comment blocks', () => {
    let text = 'there is [[# a\n#multi-line#\n comment #]] in [[#this#]] block\n';
    let result = parse(text);
    should(result).be.instanceof(Template);
    result.should.have.property('children').which.is.Array().of.length(3);
    result.children[0].should.equal('there is ');
    result.children[1].should.equal(' in ');
    result.children[2].should.equal(' block\n');
  })

  it('should give an error on incomplete comments', () => {
    let text = 'this text has a [[# incomplete comment block ]]';
    let pieces = text.split('[[#');
    parse.bind(null, text).should.throw(ParseError, {
      line: 1,
      column: pieces[0].length + 1
    })
  })

  it('should parse a block with an identifier', () => {
    let text = '[[skippy]]';
    let result = parse(text);
    should(result).be.instanceof(Template);
    result.should.have.property('children').which.is.Array().of.length(1);
    result.children[0].should.be.instanceof(Block);
    let b = <Block>result.children[0];
    b.should.have.property('expr').which.is.an.instanceof(IdentifierNode);
    let n = <IdentifierNode>b.expr;
    n.should.have.property('value').equal('skippy');
  })

  it('should parse a block with a number', () => {
    let text = '[[3.14]]';
    let result = parse(text);
    should(result).be.instanceof(Template);
    result.should.have.property('children').which.is.Array().of.length(1);
    result.children[0].should.be.instanceof(Block);
    let b = <Block>result.children[0];
    b.should.have.property('expr').which.is.an.instanceof(NumberNode);
    let n = <NumberNode>b.expr;
    n.should.have.property('value').equal(3.14);
  })

  it('should parse a block with a string', () => {
    let text = '[["hello, world"]]';
    let result = parse(text);
    should(result).be.instanceof(Template);
    result.should.have.property('children').which.is.Array().of.length(1);
    result.children[0].should.be.instanceof(Block);
    let b = <Block>result.children[0];
    b.should.have.property('expr').which.is.an.instanceof(StringNode);
    let n = <StringNode>b.expr;
    n.should.have.property('value').equal('hello, world');
  })

  it ('should allow ]] in strings', () => {
    let text = '[["]]"]]';
    let result = parse(text);
    should(result).be.instanceof(Template);
    result.should.have.property('children').which.is.Array().of.length(1);
    result.children[0].should.be.instanceof(Block);
    let b = <Block>result.children[0];
    b.should.have.property('expr').which.is.an.instanceof(StringNode);
    let n = <StringNode>b.expr;
    n.should.have.property('value').equal(']]');
  })

  it ('should allow empty strings', () => {
    let text = '[[""]]';
    let result = parse(text);
    should(result).be.instanceof(Template);
    result.should.have.property('children').which.is.Array().of.length(1);
    result.children[0].should.be.instanceof(Block);
    let b = <Block>result.children[0];
    b.should.have.property('expr').which.is.an.instanceof(StringNode);
    let n = <StringNode>b.expr;
    n.should.have.property('value').equal('');
  })

  it('should parse a block with a function call', () => {
    let text = '[[repeat("abc", 7)]]';
    let result = parse(text);
    should(result).be.instanceof(Template);
    result.should.have.property('children').which.is.Array().of.length(1);
    result.children[0].should.be.instanceof(Block);
    let b = <Block>result.children[0];
    b.should.have.property('expr').which.is.an.instanceof(ApplicationNode);
    let n = <ApplicationNode>b.expr;
    n.should.have.property('fn').which.is.an.instanceof(IdentifierNode)
      .with.property('value').equal('repeat');
    n.should.have.property('args').which.is.an.Array().of.length(2);
    n.args[0].should.be.an.instanceof(StringNode).with.property('value').equal('abc');
    n.args[1].should.be.an.instanceof(NumberNode).with.property('value').equal(7);
  })

  it('should throw on invalid blocks', () => {
    let text = 'big [[frickin} whoops';
    parse.bind(null, text).should.throw(ParseError, {
      line: 1,
      column: 'big [[frickin'.length + 1
    })
  })

  it('should track line and column across blocks', () => {
    let text = 'abc\nde[[# def \n ghi #]] jkl [[x ( 3,\n"f") ]][[nop]]';
    let result = parse(text);
    should(result).be.instanceof(Template);
    result.should.have.property('children').which.is.Array().of.length(4);
    result.children[2].should.be.instanceof(Block);
    let b = (<Block>result.children[2]);
    let x = ' ghi #]] jkl '.length + 1;
    b.should.match({line: 3, column: x});
    b.should.have.property('expr').which.is.an.instanceof(ApplicationNode);
    let n = <ApplicationNode>b.expr;
    n.fn.should.match({line: 3, column: x + 2});
    n.args[0].should.match({line: 3, column: x + 6});
    n.args[1].should.match({line: 4, column: 1});
    result.children[3].should.be.instanceof(Block);
    b = <Block>result.children[3];
    x = '"f") ]]'.length + 1;
    b.should.match({line: 4, column: x});
  })

  it('should parse multiple blocks', () => {
    let text = 'Hello, [[ name ]]!\n[[#\nwhatever\n#]]\nYou owe [[money(100, "USD")]].\n[[done]]';
    let result = parse(text);
    should(result).be.instanceof(Template);
    result.should.have.property('children').which.is.Array().of.length(7);
    result.children[0].should.be.a.String().equal('Hello, ');
    result.children[1].should.be.instanceof(Block);
    let b = <Block>result.children[1];
    b.should.have.property('expr').which.is.an.instanceof(IdentifierNode)
      .with.property('value').equal('name');

    result.children[2].should.be.a.String().equal('!\n');
    result.children[3].should.be.a.String().equal('\nYou owe ');
    result.children[4].should.be.instanceof(Block);
    b = <Block>result.children[4];
    b.should.have.property('expr').which.is.an.instanceof(ApplicationNode);
    let app = <ApplicationNode>b.expr;
    app.fn.should.be.an.instanceof(IdentifierNode).with.property('value').equal('money');
    app.args.should.be.an.Array().of.length(2);
    app.args[0].should.be.an.instanceof(NumberNode).with.property('value').equal(100);
    app.args[1].should.be.an.instanceof(StringNode).with.property('value').equal("USD");

    result.children[5].should.be.a.String().equal('.\n');
    result.children[6].should.be.an.instanceof(Block);
    b = <Block>result.children[6];
    b.should.have.property('expr').which.is.an.instanceof(IdentifierNode)
      .which.has.property('value').equal('done');
  })

  it('should parse opening and closing blocks', () => {
    let text = 'Hello [[+big]]bad[[-big]] world';
    let result = parse(text);
    should(result).be.instanceof(Template);
    result.should.have.property('children').which.is.Array().of.length(3);
    result.children[0].should.be.a.String().equal('Hello ');
    result.children[1].should.be.instanceof(Block);
    let b = <Block>result.children[1];
    b.should.have.property('expr').which.is.an.instanceof(IdentifierNode)
      .with.property('value').equal('big');
    b.should.have.property('contents').which.is.an.instanceof(Template);
    let t = b.contents;
    t.should.have.property('children').which.is.Array().of.length(1);
    t.children[0].should.be.a.String().equal('bad');
    result.children[2].should.be.a.String().equal(' world');
  })

  it('should throw on missing closing block', () => {
    let text = '[[+one]][[+two]][[-one]]';
    parse.bind(null, text).should.throw(ParseError, {column: '[[+one]][[+two]][[-'.length + 1});
    text = '[[+one]]';
    parse.bind(null, text).should.throw(ParseError, {column: '[[+one]]'.length + 1});
  })

  it('should parse block param list', () => {
    let text = '[[+foo -> x, y, z]][[-foo]]';
    let result = parse(text);
    should(result).be.instanceof(Template);
    result.should.have.property('children').which.is.Array().of.length(1);
    result.children[0].should.be.instanceof(Block);
    let b = <Block>result.children[0];
    b.should.have.property('expr').which.is.an.instanceof(IdentifierNode);
    b.should.have.property('contents').which.is.an.instanceof(Template);
    b.contents.should.have.property('params').which.is.Array().of.length(3);
    b.contents.params[0].should.be.a.String().equal('x');
    b.contents.params[1].should.be.a.String().equal('y');
    b.contents.params[2].should.be.a.String().equal('z');
  })

  it('should parse local templates', () => {
    let text = '[[=+fee]]hello[[-fee]]abc[[=+fie]]goodbye[[-fie]]';
    let result = parse(text);
    should(result).be.instanceof(Template);
    result.should.have.property('children').which.is.Array().of.length(1);
    result.children[0].should.be.a.String().equal('abc');
    result.should.have.property('members').which.is.an.Array().of.length(2);

    result.members[0].should.be.an.instanceof(Definition);
    let d = result.members[0];
    d.should.have.property('name').which.is.an.instanceof(IdentifierNode)
      .with.property('value').equal('fee');
    d.should.have.property('block').which.is.an.instanceof(Block);
    d.block.should.have.property('expr').which.is.an.instanceof(IdentifierNode)
      .with.property('value').equal('blockContents');
    d.block.should.have.property('contents').which.is.an.instanceof(Template);
    let t = d.block.contents;
    t.should.have.property('children').which.is.an.Array().of.length(1);
    t.children[0].should.equal('hello');

    result.members[1].should.be.an.instanceof(Definition);
    d = result.members[1];
    d.should.have.property('name').which.is.an.instanceof(IdentifierNode)
      .with.property('value').equal('fie');
    d.should.have.property('block').which.is.an.instanceof(Block);
    d.block.should.have.property('expr').which.is.an.instanceof(IdentifierNode)
      .with.property('value').equal('blockContents');
    d.block.should.have.property('contents').which.is.an.instanceof(Template);
    t = d.block.contents;
    t.should.have.property('children').which.is.an.Array().of.length(1);
    t.children[0].should.equal('goodbye');
  })

  it('should parse nested function calls', () => {
    let text = '[[abc(123, def("ghi", 456), "jkl", mno())]]';
    let result = parse(text);
    should(result).be.instanceof(Template);
    result.should.have.property('children').which.is.Array().of.length(1);
    result.children[0].should.be.instanceof(Block);
    let b = <Block>result.children[0];
    b.should.have.property('expr').which.is.an.instanceof(ApplicationNode);
    let a = <ApplicationNode>b.expr;

    a.should.have.property('fn').which.is.an.instanceof(IdentifierNode)
      .with.property('value').equal('abc');
    a.should.have.property('args').which.is.an.Array().of.length(4);


    should(a.args[0]).be.instanceof(NumberNode).with.property('value').equal(123);
    should(a.args[1]).be.instanceof(ApplicationNode);

    let aa = <ApplicationNode>a.args[1];
    aa.should.have.property('fn').which.is.an.instanceof(IdentifierNode)
      .with.property('value').equal('def');
    aa.should.have.property('args').which.is.Array().of.length(2);
    should(aa.args[0]).be.instanceof(StringNode).with.property('value').equal('ghi');
    should(aa.args[1]).be.instanceof(NumberNode).with.property('value').equal(456);

    should(a.args[2]).be.instanceof(StringNode).with.property('value').equal('jkl');
    should(a.args[3]).be.instanceof(ApplicationNode);

    aa = <ApplicationNode>a.args[3];
    aa.should.have.property('fn').which.is.an.instanceof(IdentifierNode)
      .with.property('value').equal('mno');
    aa.should.have.property('args').which.is.Array().of.length(0);
  })

  it('should parse definitions', () => {
    let text = '[[pi = 3.14]]';
    let result = parse(text);
    should(result).be.instanceof(Template);
    result.should.have.property('members').which.is.Array().of.length(1);
    result.members[0].should.be.instanceof(Definition);
    let d = <Definition>result.members[0];
    d.should.have.property('name').which.is.an.instanceof(IdentifierNode)
      .with.property('value').equal('pi');
    d.should.have.property('block').which.is.an.instanceof(Block);
    d.block.should.have.property('expr').which.is.an.instanceOf(NumberNode);
    should(d.static).not.be.ok();
  })

  it('should parse static definitions', () => {
    let text = '[[pi = 3.14 s]]';
    let result = parse(text);
    should(result).be.instanceof(Template);
    result.should.have.property('members').which.is.Array().of.length(1);
    result.members[0].should.be.instanceof(Definition);
    let d = <Definition>result.members[0];
    should(d.static).be.ok();
  })

  it('should translate import statements to definitions', () => {
    let text = '[[@abc]]';
    let result = parse(text);
    should(result).be.instanceof(Template);
    result.should.have.property('members').which.is.Array().of.length(1);
    result.members[0].should.be.instanceof(Definition);
    let d = <Definition>result.members[0];
    d.should.have.property('name').which.is.an.instanceof(IdentifierNode)
      .with.property('value').equal('abc');
    d.should.have.property('block').which.is.an.instanceof(Block);
    d.block.should.have.property('expr').which.is.an.instanceOf(ImportNode);
    let i = <ImportNode>d.block.expr;
    i.should.have.property('id').which.is.an.instanceof(IdentifierNode)
      .with.property('value').equal("abc");
    should(d.static).be.ok();
  })

  it('should allow closing tag to reference import', () => {
    let text = '[[+@def]]Hello[[-@def]]';
    let result = parse(text);
    should(result).be.an.instanceof(Template);
    result.should.have.property('children').which.is.Array().of.length(1);
    result.children[0].should.be.instanceof(Block);
    let b = <Block>result.children[0];
    b.should.have.property('expr').which.is.an.instanceof(ImportNode);
    let i = <ImportNode>b.expr;
    i.should.have.property('id').which.is.an.instanceof(IdentifierNode)
      .with.property('value').equal('def');
  })
})
