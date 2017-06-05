import { parse } from "../exec/parse";
import { render } from "../exec/render";
import * as ast from "../ast";
import { FunctionHelper } from "../exec/function";
import should = require('should');

describe('render function', () => {

  describe('basic blocks', () => {

    it('should render plain text', () => {
      let text = 'Hello, world!';
      let result = render(text);
      should(result).be.a.String().equal('Hello, world!');
    })

    it('should render boolean literals', () => {
      let text = "How [[true]] it is!";
      let result = render(text);
      should(result).be.a.String().equal('How true it is!');
    })

    it('should render number literals', () => {
      let text = 'Pi = [[3.14159]]';
      let final = render(text);
      should(final).be.a.String().equal('Pi = 3.14159');
    })

    it('should render string literals', () => {
      let text = 'Hello, [["world"]]!';
      let result = render(text);
      should(result).be.a.String().equal('Hello, world!');
    })

    it('should render identifiers', () => {
      let text = 'Hello, [[name]]!';
      let final = render(text, {name: 'Fred'});
      should(final).be.a.String().equal('Hello, Fred!');
    })

    it('should render multiple blocks', () => {
      let text = '[[123]] [[x]] [["hello"]]';
      let final = render(text, {x: '???'});
      should(final).be.a.String().equal('123 ??? hello');
    })

    it('should render undefined and null as empty string', () => {
      let text = 'Hello, [[adj]] [[age]] year old [[name]]!';
      let final = render(text, {age: 0, name: null});
      should(final).be.a.String().equal('Hello,  0 year old !');
    })

  })

  describe('expressions', () => {

    it('should evaluate operators', () => {
      let text = '[[3 + 4 * 5]] and [[3 - 4 - 5 > 0 == 7 * 6 > 6 * 7]]';
      let final = render(text);
      should(final).be.a.String().equal('23 and true');
    })

    it('should evaluate properties', () => {
      let text = 'Hello, [[user.stats.age]] year old [[user.name]]!';
      let final = render(text, {user: {name: 'Fred', stats: {age: 50}}});
      should(final).be.a.String().equal('Hello, 50 year old Fred!');
    })

    it('should evaluate array indexes', () => {
      let text = 'Hello [[name[0]]], [[name[1]]], and [[name[2]]]!';
      let final = render(text, {name: ['larry', 'curly', 'moe']});
      should(final).be.a.String().equal('Hello larry, curly, and moe!');
    })

    it('should evaluate function calls', () => {
      let text = '[[fee(3)]] and [[fie(fee(3))]]';
      let final = render(text, {
        fee: (x: number) => x + 1,
        fie: (y: number) => y * 2
      })
      should(final).be.a.String().equal('4 and 8');
    })

    it('should evaluate extensions', () => {
      let text = '[[o.x]] and [[o{y: 7}.y]]';
      let final = render(text, {o: {x: 5}});
      should(final).be.a.String().equal('5 and 7');
    })

  })

  describe('block templates', () => {

    it('should insert templates', () => {
      let greeting = parse('Hello, world!');
      let text = 'begin [[greeting]] end';
      let final = render(text, {greeting});
      should(final).be.a.String().equal('begin Hello, world! end');
    })

    it('should insert inline templates', () => {
      let text = `[[=greeting]]Hello, world![[-greeting]]begin [[greeting]] end`;
      let final = render(text);
      should(final).be.a.String().equal('begin Hello, world! end');
    })

    it('should supply context to inline templates', () => {
      let text = `[[=greeting]]Hello, [[name]]![[-greeting]]begin [[greeting]] end`;
      let final = render(text, {name: "Fred"});
      should(final).be.a.String().equal('begin Hello, Fred! end');
    })

    it('should supply embeddedContents to templates', () => {
      let text = `[[=greeting]]Hello, [[embeddedContents]]![[-greeting]]
begin [[+greeting]]Jeff[[-greeting]] end`;
      let final = render(text);
      should(final).be.a.String().equal('\nbegin Hello, Jeff! end');
    })

    it('should accept explicit injection parameters', () => {
      let text = `[[=greeting -> name]]Hello, [[name]]![[-greeting]]
begin [[greeting {name: "Joe"}]] end`;
      let final = render(text);
      should(final).be.a.String().equal('\nbegin Hello, Joe! end');
    })

    it('should accept function-call injection parameters', () => {
      let text = `[[=greeting -> name]]Hello, [[name]]![[-greeting]]
begin [[greeting("Sue")]] end`;
      let final = render(text);
      should(final).be.a.String().equal('\nbegin Hello, Sue! end');
    })

    it('should accept block injection parameters', () => {
      let text = `[[=greeting -> name]]Hello, [[name]]![[-greeting]]
begin [[+greeting]][[name: "Bob"]][[-greeting]] end`;
      let final = render(text);
      should(final).be.a.String().equal('\nbegin Hello, Bob! end');
    })

    it('should take missing parameters from the context', () => {
      let text = `[[=greeting -> name]]Hello, [[name]]![[-greeting]]
begin [[greeting]] end`;
      let final = render(text, {name: "Ann"});
      should(final).be.a.String().equal('\nbegin Hello, Ann! end');
    })

    it('should override context variables with parameters', () => {
      let text = `[[=greeting -> name]]Hello, [[name]]![[-greeting]]
begin [[greeting("Jack")]] and [[name]]! end`;
      let final = render(text, {name: "Jill"});
      should(final).be.a.String().equal('\nbegin Hello, Jack! and Jill! end');
    })

    it('should accept parameters for thisContents', () => {
      let text = `[[+thisContents("abc") -> bing]][[bing]][[-thisContents]]`
      let final = render(text);
      should(final).be.a.String().equal('abc');
    })

    it('should take nested parameter values over context values', () => {
      let text = `[[=greeting -> name]][[=text]]Hello, [[name]]![[-text]]<h1>[[text]]</h1>[[-greeting]]
begin [[greeting("Jack")]] and [[name]]! end`;
      let final = render(text, {name: "Jill"});
      should(final).be.a.String().equal('\nbegin <h1>Hello, Jack!</h1> and Jill! end');
    })

  })

  describe('function helpers', () => {

    it('should render function helpers', () => {
      let text = 'begin [[foo]] end';
      function foo() {
        return `(${this.get("bip")})`;
      }
      let final = render(text, {foo: new FunctionHelper(foo),
                                bip: "howdy"});
      should(final).be.a.String().equal('begin (howdy) end');
    })

    it('should accept function helper arguments', () => {
      let text = 'begin [[foo("doody")]] end';
      function foo(bap: string) {
        return `(${this.get("bip")} + ${bap})`;
      }
      let final = render(text, {foo: new FunctionHelper(foo, ['bap']),
                                bip: "howdy"});
      should(final).be.a.String().equal('begin (howdy + doody) end');
    })

    it('should accept function helper extensions', () => {
      let text = 'begin [[foo{bap: "doody"}]] end';
      function foo(bap: string) {
        return `(${this.get("bip")} + ${bap})`;
      }
      let final = render(text, {foo: new FunctionHelper(foo, ['bap']),
                                bip: "howdy"});
      should(final).be.a.String().equal('begin (howdy + doody) end');
    })

    it('should accept function helper injections', () => {
      let text = 'begin [[+foo]][[bap: "doody"]][[-foo]] end';
      function foo(bap: string) {
        return `(${this.get("bip")} + ${bap})`;
      }
      let final = render(text, {foo: new FunctionHelper(foo, ['bap']),
                                bip: "howdy"});
      should(final).be.a.String().equal('begin (howdy + doody) end');
    })

    describe('the let helper', () => {
      it('should pass arguments to parameters', () => {
        let text = `[[*let(3.14, "hello", 7) -> a, b, c]]\
[[a]], [[b]], [[c + 1]]`;
        let final = render(text);
        should(final).be.a.String().equal('3.14, hello, 8');
      })
    })

    describe('the if helper', () => {
      it('should render contents on true', () => {
        let final = render(`([[+if(true)]]Yay![[-if]])`);
        should(final).be.a.String().equal('(Yay!)');
      })

      it('should not render contents on false', () => {
        let final = render(`([[+if(false)]]Boo![[-if]])`);
        should(final).be.a.String().equal('()');
      })

      it('should render then on true', () => {
        let text = `([[+if(foo)]][[:then]]Fee[[-then]][[:else]]Fie![[-else]][[-if]])`;
        let final = render(text, {foo: true});
        should(final).be.a.String().equal('(Fee)');
      })

      it('should render else on true', () => {
        let text = `([[+if(foo)]][[:then]]Fee[[-then]][[:else]]Fie[[-else]][[-if]])`;
        let final = render(text, {foo: false});
        should(final).be.a.String().equal('(Fie)');
      })

    })

    describe('the each helper', () => {
      it ('should iterate over items in an array', () => {
        let text = `[[+each(items) -> item]][[item]]\n[[-each]]`;
        let final = render(text, {items: [3, "howdy", 12.5]});
        should(final).be.a.String().equal('3\nhowdy\n12.5\n');
      })
      it ('should create private variable for loop variable', () => {
        let text = `[[item = 77]][[item]]\n[[+each(items) -> item]][[item]]\n[[-each]][[item]]`;
        let final = render(text, {items: [3, "howdy", 12.5]});
        should(final).be.a.String().equal('77\n3\nhowdy\n12.5\n77');
      })
      it ('should provide loop index', () => {
        let text = `[[+each(items) -> item, idx]]([[idx + 1]])[[item]]\n[[-each]]`;
        let final = render(text, {items: [3, "howdy", 12.5]});
        should(final).be.a.String().equal('(1)3\n(2)howdy\n(3)12.5\n');
      })
    })

    describe('the include helper', () => {
      it('should return fragment contents', () => {
        let text = '[[*include("hello.blx") -> hello]][[hello]]';
        let final = render(text);
        return should(final).be.a.Promise().fulfilledWith('What up, world?');
      })

      it('should evaluate blocks in fragment', () => {
        let text = '[[*include("if-else.blx") -> ifelse]][[ifelse]]'
        let final = render(text);
        return should(final).be.a.Promise().fulfilledWith('\n\n  Hello, world!\n\n');
      })
    })

  })

  describe('assignments', () => {
    it('should render assignments', () => {
      let text = '[[name = "Joe"]]Hello, [[name]]!';
      let final = render(text);
      should(final).be.a.String().equal('Hello, Joe!');
    })

    it('should render block assignments', () => {
      let text = '[[=name]]Suzy[[-name]]Hello, [[name]]!';
      let final = render(text);
      should(final).be.a.String().equal('Hello, Suzy!');
    })
  });

})
