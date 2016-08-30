import { render } from "../render";
import { parse } from "../parse";
import { Template, TemplateClosure } from "../ast";
import should = require('should');
import request = require('supertest');

describe('rendering functions', () => {

  it('should render string literals', () => {
    let text = 'Hello, [["world"]]!';
    let final = render(text);
    should(final).be.a.String().equal('Hello, world!');
  })

  it('should render number literals', () => {
    let text = 'Pi = [[3.14159]]';
    let final = render(text);
    should(final).be.a.String().equal('Pi = 3.14159');
  })

  it('should render identifiers', () => {
    let text = 'Hello, [[name]]!';
    let final = render(text, {name: 'Fred'});
    should(final).be.a.String().equal('Hello, Fred!');
  })

  it('should render dotted identifiers', () => {
    let text = 'Hello, [[user.stats.age]] year old [[user.name]]!';
    let final = render(text, {user: {name: 'Fred', stats: {age: 50}}});
    should(final).be.a.String().equal('Hello, 50 year old Fred!');
  })

  it('should return "undefined" for undefined identifiers', () => {
    let text = 'Hello, [[stats.age]] year old [[adj]] [[alt.color]] [[name]]!';
    let final = render(text, {adj:null});
    should(final).be.a.String().equal('Hello, undefined year old null undefined undefined!');
  })

  it('should call functions from the context', () => {
    function money(num: number, prefix: string): string {
      return prefix + num.toFixed(2);
    }
    let text = 'total = [[money(12.3456, "$")]]';
    let final = render(text, {money: money});
    should(final).be.a.String().equal('total = $12.35');
  })

  it('should render multiple blocks', () => {
    let text = 'abc [[def]] ghi [[klm(nop, 26, "qrs")]] tuv';
    let final = render(text, {def: "pop", nop: "bob", klm: (a: number, b: number, c: number) => c + (b + 11) + a});
    should(final).be.a.String().equal('abc pop ghi qrs37bob tuv');
  })

  it('should render enclosing blocks', () => {
    let text = 'abc [[+]]def[[-]] ghi';
    let final = render(text);
    should(final).be.a.String().equal('abc def ghi');
  })

  it('should render "with" blocks', () => {
    let text = '[[+with("Fred") -> name]]Hello, [[name]][[-with]] [[name]]';
    let final = render(text, {name: 'Jones'});
    should(final).be.a.String().equal('Hello, Fred Jones');
  })

  it('should render "if" blocks', () => {
    let text = 'hello [[+if(x)]]big [[-if]]world';
    let final = render(text);
    should(final).be.a.String().equal('hello world');

    final = render(text, {x: true});
    should(final).be.a.String().equal('hello big world');
  })

  // it('should render "case" blocks', () => {
  //   let text = 'hello [[+case]]' +
  //   '[[+when a]]small[[-when]]' +
  //   '[[+when b]]medium[[-when]]' +
  //   '[[+when c]]large[[-when]]' +
  //   '[[+otherwise]]nondescript[[-otherwise]]' +
  //   '[[-case]] world';
  //   let tmpl = parse(text);
  //   should(tmpl).be.an.instanceof(Template);
  //   let final = render(tmpl, {a: true});
  //   should(final).be.a.String().equal('hello small world');
  //   final = render(tmpl, {b: true});
  //   should(final).be.a.String().equal('hello medium world');
  //   final = render(tmpl, {c: true});
  //   should(final).be.a.String().equal('hello large world');
  //   final = render(tmpl);
  //   should(final).be.a.String().equal('hello nondescript world');
  // })

  it('should render "forEach" blocks for arrays', () => {
    let text = '[[x]][[+forEach(xs) -> x, i]]<[[i]]: [[x]]>[[-forEach]][[x]]';
    let final = render(text, {x: 'bar', xs: ['fee', 'fie', 'foe', 'fum']});
    should(final).be.a.String().equal('bar<0: fee><1: fie><2: foe><3: fum>bar');
  })

  it('should render "forEach" blocks for objects', () => {
    let text = '[[x]][[+forEach(xs) -> x, i]]<[[i]]: [[x]]>[[-forEach]][[x]]';
    let final = render(text, {x: 'bar', xs: {one: 1, two: 2, three: 3}});
    should(final).be.a.String().equal('bar<one: 1><two: 2><three: 3>bar');
  })

  it('should support value definition', () => {
    let text = '[[name = "Sue"]]Hello, [[name]]';
    let final = render(text);
    should(final).be.a.String().equal('Hello, Sue');
  })

  it('should render local blocks', () => {
    let text = '[[=+fee]]world[[-fee]]hello [[fee()]]';
    let final = render(text);
    should(final).be.a.String().equal('hello world');
  })

  it('should render local blocks with parameters', () => {
    let text = '[[=+fee -> name]]hello [[name]][[-fee]][[fee("Fred")]]';
    let final = render(text);
    should(final).be.a.String().equal('hello Fred');
  })

  it('should maintain the closure of local blocks', () => {
    let text = 'Hello, [[name]]';
    let tmpl = parse(text).closure({name: 'Fred'});

    text = '[[+with("Jane") -> name]][[name]] [[greet()]] [[name]][[-with]]'
    let final = render(text, {greet: tmpl});
    should(final).be.a.String().equal('Jane Hello, Fred Jane');
  })

  it('should localize any changes made by the block to the contents', () => {
    let text = '[[fum]] [[+fee()]][[fum]][[-fee]] [[fum]]';
    let final = render(text, {
      fum: 'foo',
      fee: function (contents: TemplateClosure) {
        this.fum = 'bar';
        return contents.invoke();
      }
    });
    should(final).be.a.String().equal('foo bar foo');
  })

  it('should render import blocks', () => {
    let text = '[[@hello]][[hello()]]';
    let final = render(text, {settings: {views: './src/test/fixtures'}});
    return (<any>should(final)).eventually.equal('Hello, world!');
  })

  it('should let import blocks render their contents', () => {
    let text = '[[@helloContents]][[+helloContents()]]Howdy, world![[-helloContents]]';
    let final = render(text, {settings: {views: './src/test/fixtures'}});
    return (<any>should(final)).eventually.equal('<big>Howdy, world!</big>');
  })

  it('should let import blocks take parameters', () => {
    let text = '[[@helloBlock]][[helloBlock("Suzy")]]';
    let final = render(text, {settings: {views: './src/test/fixtures'}});
    return (<any>should(final)).eventually.equal('Hello, Suzy!');
  })

  it('should translate dots in import blocks to subdirectories', () => {
    let text = '[[@obscure.goodbye]][[goodbye()]]';
    let final = render(text, {settings: {views: './src/test/fixtures'}});
    return (<any>should(final)).eventually.equal('Goodbye, world!');
  })

  it('should allow import block to automatically invoke', () => {
    let text = '[[@helloBlock("Nancy")]] [[helloBlock]]';
    let final = render(text, {settings: {views: './src/test/fixtures'}});
    return (<any>should(final)).eventually.equal('Hello, Nancy! undefined');
  })

  it('should allow access to locals of invoked imports', () => {
    let text = '[[@helloBlock]][[hb = helloBlock("George")]][[hb.someLocal()]]';
    let final = render(text, {settings: {views: './src/test/fixtures'}});
    return (<any>should(final)).eventually.equal('This is local George');
  })

  it('should access local templates with dot notation', () => {
    let text = '[[+=fee]]Hello[[+=fum]]Goodbye[[-fum]][[-fee]][[fie = fee()]][[fie]] [[fie.fum()]]';
    let final = render(text);
    should(final).be.a.String().equal('Hello Goodbye');
  })

  it('should support "then" and "else" in an "if" block', () => {
    let text = 'hello [[+if(x)]][[+=then]]big[[-then]][[+=else]]small[[-else]][[-if]] world';
    let final = render(text);
    should(final).be.a.String().equal('hello small world');
    final = render(text, {x: true});
    should(final).be.a.String().equal('hello big world');
  })

  it('should support trimming following whitespace', () => {
    let text = '[[abc~]]   \n  world';
    let final = render(text, {abc: "What's up "});
    should(final).be.a.String().equal("What's up world");
  })

  it('should support timming leading whitespace', () => {
    let text = 'greetings   \n   [[~abc]]';
    let final = render(text, {abc: " people"});
    should(final).be.a.String().equal("greetings people");
  })

  // it('should do whitespace trimming', () => {
  //   let text =
  //     'hello\n' +
  //     '  [[~+case~]]\n' +
  //     '    [[+when a]] small [[-when~]]\n' +
  //     '    [[+when b]] medium [[-when~]]\n' +
  //     '    [[+when c]] large [[-when~]]\n' +
  //     '    [[+otherwise]] nondescript [[-otherwise~]]\n' +
  //     '  [[-case~]]\n' +
  //     'world';
  //     let tmpl = parse(text);
  //     should(tmpl).be.an.instanceof(Template);
  //     let final = render(tmpl, {a: true});
  //     should(final).be.a.String().equal('hello small world');
  //     final = render(tmpl, {b: true});
  //     should(final).be.a.String().equal('hello medium world');
  //     final = render(tmpl, {c: true});
  //     should(final).be.a.String().equal('hello large world');
  //     final = render(tmpl, {});
  //     should(final).be.a.String().equal('hello nondescript world');
  // }),

  it('should trim whitespace around comments', () => {
    let text = 'hunky  \n  [[~# look, a comment! #~]]  \n \n  dory';
    let final = render(text);
    should(final).be.a.String().equal("hunkydory");
  })

  it('should escape HTML characters', () => {
    let text = '[[foo!]]';
    let final = render(text, {foo: '<b>"Q&A"</b>'});
    should(final).be.a.String().equal("&lt;b&gt;&quot;Q&amp;A&quot;&lt;/b&gt;");
  })

  it('should render nested applications', () => {
    let text = '[[foo(bar(5, 4), bar(foo(3, 2), 1))]]';
    let final = render(text, {foo: (a: number, b: number) => a + b, bar: (a: number, b: number) => a - b});
    should(final).be.a.String().equal('5')
  })

})
