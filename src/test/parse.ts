import { parse, ParseError } from "../parse";
import * as ast from "../ast";
import should = require("should");

describe("parse function", () => {

  describe("text and basic comments", () => {

    it("should parse a single text block", () => {
      let text = "this is a single [text] block";
      let result = parse(text);
      should(result).deepEqual(
        ast.Template({line: 1, char: 1}, undefined, [text])
      );
    });

    it("should allow multi-line blocks", () => {
      let text = "this is a\nmulti-line\n\ntext block\n";
      let result = parse(text);
      should(result).deepEqual(
        ast.Template({line: 1, char: 1}, undefined, [text])
      );
    });

    it("should ignore comment blocks", () => {
      let text = "there is [[# a\n#multi-line#\n comment #]] in [[#this#]] block\n";
      let result = parse(text);
      should(result).deepEqual(
        ast.Template({line: 1, char: 1}, undefined, [
          "there is ",
          " in ",
          " block\n"
        ])
      )
    });

    it("should give an error on incomplete comments", () => {
      let text = "this text has a [[# incomplete comment block ]]";
      parse.bind(null, text, "fee.bloc").should.throw(ParseError, {
        fileName: "fee.bloc",
        lineNumber: 1,
        charNumber: "this text has a ".length + 1
      })
    });

    it("should throw on invalid blocks", () => {
      let text = "big [[frickin}} whoops";
      parse.bind(null, text).should.throw(ParseError, {
        lineNumber: 1,
        charNumber: "big [[frickin".length + 1
      })
    });
  });

  describe("basic data", () => {
    it("should parse a block with undefined", () => {
      let text = `[[undefined]]`;
      let result = parse(text);
      should(result).deepEqual(
        ast.Template({line: 1, char: 1}, undefined, [
          ast.Bloc({line: 1, char: 1}, ast.Undefined({line: 1, char: 3}))
        ])
      );
    });

    it("should parse a block with null", () => {
      let text = `[[null]]`;
      let result = parse(text);
      should(result).deepEqual(
        ast.Template({line: 1, char: 1}, undefined, [
          ast.Bloc({line: 1, char: 1}, ast.Null({line: 1, char: 3}))
        ])
      );
    });

    it("should parse a block with a boolean", () => {
      for (let value of [true, false]) {
        let text = `[[${value}]]`;
        let result = parse(text);
        should(result).deepEqual(
          ast.Template({line: 1, char: 1}, undefined, [
            ast.Bloc({line: 1, char: 1}, ast.Boolean({line: 1, char: 3}, value))
          ])
        );
      }
    });

    it("should parse a block with a number", () => {
      for (let value of [0, 1, 3.14, 0.834, 123e123, 321e-321]) {
        let text = `[[${value}]]`;
        let result = parse(text);
        should(result).deepEqual(
          ast.Template({line: 1, char: 1}, undefined, [
            ast.Bloc({line: 1, char: 1}, ast.Number({line: 1, char: 3}, value))
          ])
        );
      }
    });

    it("should parse a block with a string", () => {
      for (let value of ["hello", "", "hello\t\\there\ngoodbye", "[[whoops]]"]) {
        let text = `[[${JSON.stringify(value)}]]`;
        let result = parse(text);
        should(result).deepEqual(
          ast.Template({line: 1, char: 1}, undefined, [
            ast.Bloc({line: 1, char: 1}, ast.String({line: 1, char: 3}, value))
          ])
        );
      }
    });

    it("should parse a block with an identifier", () => {
      for (let value of ["x", "abc123", "hello_there", "_GoOdBye_37"]) {
        let text = `[[${value}]]`;
        let result = parse(text);
        should(result).deepEqual(
          ast.Template({line: 1, char: 1}, undefined, [
            ast.Bloc({line: 1, char: 1}, ast.Identifier({line: 1, char: 3}, value))
          ])
        );
      }
    });

    it("should parse a bloc with an array construction", () => {
      let text = '[[[1, 2, 3, ["a", "b", "c"], 4, 5, []]]]';
      let result = parse(text);
      should(result).deepEqual(
        ast.Template({line: 1, char: 1}, undefined, [
          ast.Bloc({line: 1, char: 1}, ast.ArrayConstruction({line: 1, char: 3}, [
            ast.Number({line: 1, char: 4}, 1),
            ast.Number({line: 1, char: 7}, 2),
            ast.Number({line: 1, char: 10}, 3),
            ast.ArrayConstruction({line: 1, char: 13}, [
              ast.String({line: 1, char: 14}, "a"),
              ast.String({line: 1, char: 19}, "b"),
              ast.String({line: 1, char: 24}, "c"),
            ]),
            ast.Number({line: 1, char: 30}, 4),
            ast.Number({line: 1, char: 33}, 5),
            ast.ArrayConstruction({line: 1, char: 36}, [])
          ])),
        ])
      );
    });

    it("should parse a bloc with an object construction", () => {
      let text = '[[{abc: 1, def: "z", ghi: {jkl: 2}, mno: {}}]]';
      let result = parse(text);
      should(result).deepEqual(
        ast.Template({line: 1, char: 1}, undefined, [
          ast.Bloc({line: 1, char: 1}, ast.ObjectConstruction({line: 1, char: 3}, {
            abc: ast.Number({line: 1, char: 9}, 1),
            def: ast.String({line: 1, char: 17}, "z"),
            ghi: ast.ObjectConstruction({line: 1, char: 27}, {
              jkl: ast.Number({line: 1, char: 33}, 2)
            }),
            mno: ast.ObjectConstruction({line: 1, char: 42}, { })
          }))
        ])
      );
    });

    it("should parse multiple blocks", () => {
      let text = 'Hello, [["Fred"]]!\n[[#\nwhatever\n#]]\nYou owe $[[3.5e2]].\n[[\ndone]]';
      let result = parse(text);
      should(result).deepEqual(
        ast.Template({line: 1, char: 1}, undefined, [
          "Hello, ",
          ast.Bloc({line: 1, char: 8}, ast.String({line: 1, char: 10}, "Fred")),
          "!\n",
          "\nYou owe $",
          ast.Bloc({line: 5, char: 10}, ast.Number({line: 5, char: 12}, 3.5e2)),
          ".\n",
          ast.Bloc({line: 6, char: 1}, ast.Identifier({line: 7, char: 1}, "done"))
        ])
      );
    })

  });

  describe("expressions", () => {

    it("should parse a function call", () => {
      let text = '[[greeting()]]';
      let result = parse(text);
      should(result).deepEqual(
        ast.Template({line: 1, char: 1}, undefined, [
          ast.Bloc({line: 1, char: 1},
            ast.Application({line: 1, char: 11},
              ast.Identifier({line: 1, char: 3}, "greeting"),
              []
            ))
        ])
      );
    });

    it("should parse a function call with an argument", () => {
      let text = '[[greeting("Joe")]]';
      let result = parse(text);
      should(result).deepEqual(
        ast.Template({line: 1, char: 1}, undefined, [
          ast.Bloc({line: 1, char: 1},
            ast.Application({line: 1, char: 11},
              ast.Identifier({line: 1, char: 3}, "greeting"),
              [ ast.String({line: 1, char: 12}, "Joe") ]
            ))
        ])
      );
    });

    it("should parse a function call with multiple arguments", () => {
      let text = '[[repeat(5, ", ", greeting)]]';
      let result = parse(text);
      should(result).deepEqual(
        ast.Template({line: 1, char: 1}, undefined, [
          ast.Bloc({line: 1, char: 1},
            ast.Application(
              {line: 1, char: 9},
              ast.Identifier({line: 1, char: 3}, "repeat"),
              [ ast.Number({line: 1, char: 10}, 5),
                ast.String({line: 1, char: 13}, ", "),
                ast.Identifier({line: 1, char: 19}, "greeting")
              ]
            ))
        ])
      );
    });

    it("should parse a property", () => {
      let text = '[[fee.fie]]';
      let result = parse(text);
      should(result).deepEqual(
        ast.Template({line: 1, char: 1}, undefined, [
          ast.Bloc({line: 1, char: 1},
            ast.Property({line: 1, char: 6},
              ast.Identifier({line: 1, char: 3}, "fee"),
              ast.Identifier({line: 1, char: 7}, "fie")
            )
          )
        ])
      );
    });

    it("should parse an index", () => {
      let text = '[[fee["abc"]]]';
      let result = parse(text);
      should(result).deepEqual(
        ast.Template({line: 1, char: 1}, undefined, [
          ast.Bloc({line: 1, char: 1},
            ast.Index({line: 1, char: 6},
              ast.Identifier({line: 1, char: 3}, "fee"),
              ast.String({line: 1, char: 7}, "abc")
            )
          )
        ])
      );
    });

    // it("should parse nested expressions", () => {
    //   let text = '[[(x)]][[(3)]][[("hello")]]';
    //   let result = parse(text);
    //   should(result).be.instanceof(ast.Template);
    //   result.should.have.property("children").which.is.Array().of.length(3);
    //
    //   result.children[0].should.be.instanceof(ast.Block);
    //   let b = <ast.Block>result.children[0];
    //   b.should.have.property("expr").which.is.an.instanceof(ast.Identifier)
    //     .with.property("value").equal("x");
    //
    //   result.children[1].should.be.instanceof(ast.Block);
    //   b = <ast.Block>result.children[1];
    //   b.should.have.property("expr").which.is.an.instanceof(ast.Number)
    //     .with.property("value").equal(3);
    //
    //   result.children[2].should.be.instanceof(ast.Block);
    //   b = <ast.Block>result.children[2];
    //   b.should.have.property("expr").which.is.an.instanceof(ast.String)
    //     .with.property("value").equal("hello");
    // })

    it("should parse unary operators", () => {
      let text = "[[!x]][[ -x]][[ +x]]";
      let result = parse(text);
      should(result).deepEqual(
        ast.Template({line: 1, char: 1}, undefined, [
          ast.Bloc({line: 1, char: 1},
            ast.UnaryOperation({line: 1, char: 3}, "!",
              ast.Identifier({line: 1, char: 4}, "x")
            )
          ),
          ast.Bloc({line: 1, char: 7},
            ast.UnaryOperation({line: 1, char: 10}, "-",
              ast.Identifier({line: 1, char: 11}, "x")
            )
          ),
          ast.Bloc({line: 1, char: 14},
            ast.UnaryOperation({line: 1, char: 17}, "+",
              ast.Identifier({line: 1, char: 18}, "x")
            )
          )
        ])
      );
    })

  //   it("should parse binary operators", () => {
  //     for (let op of ["+", "-", "*", "/", "%", "<", ">", "<=", ">=", "==", "!=", "&&", "||", "|"]) {
  //       let text = `[[x${op}1]]`;
  //       let result = parseRaw(text);
  //       should(result).be.instanceof(ast.Template);
  //       result.should.have.property("children").which.is.Array().of.length(1);
  //       result.children[0].should.be.instanceof(ast.Block);
  //       let b = <ast.Block>result.children[0];
  //       b.should.have.property("expr").which.is.an.instanceof(ast.BinaryOperation);
  //       let o = <ast.BinaryOperation>b.expr;
  //       o.should.have.property("op").which.is.equal(op);
  //       o.should.have.property("left").which.is.an.instanceof(ast.Identifier)
  //         .with.property("value").equal("x");
  //       o.should.have.property("right").which.is.an.instanceof(ast.Number)
  //         .with.property("value").equal(1);
  //     }
  //   })
  //
  //   it("should parse binary operators as left-associative", () => {
  //     for (let op of (["+", "<", "!="])) {
  //       let text = `[[w ${op} x ${op} y ${op} z]]`;
  //       let result = parseRaw(text);
  //       should(result).be.instanceof(ast.Template);
  //       result.should.have.property("children").which.is.Array().of.length(1);
  //       result.children[0].should.be.instanceof(ast.Block);
  //       let b = <ast.Block>result.children[0];
  //       b.should.have.property("expr").which.is.an.instanceof(ast.BinaryOperation);
  //
  //       let o = <ast.BinaryOperation>b.expr;
  //       o.should.have.property("right")
  //         .which.is.an.instanceof(ast.Identifier).with.property("value")
  //         .which.is.equal("z");
  //       o.should.have.property("left").which.is.an.instanceof(ast.BinaryOperation);
  //
  //       o = <ast.BinaryOperation>o.left;
  //       o.should.have.property("right")
  //         .which.is.an.instanceof(ast.Identifier).with.property("value")
  //         .which.is.equal("y");
  //       o.should.have.property("left").which.is.an.instanceof(ast.BinaryOperation);
  //
  //       o = <ast.BinaryOperation>o.left;
  //       o.should.have.property("right")
  //         .which.is.an.instanceof(ast.Identifier).with.property("value")
  //         .which.is.equal("x");
  //       o.should.have.property("left")
  //         .which.is.an.instanceof(ast.Identifier).with.property("value")
  //         .which.is.equal("w");
  //     }
  //   })
  //
  //   it("should parse binary operators using precedence", () => {
  //     let text = "[[a * b + c / d == 3 && e > f == true]]";
  //     let result = parseRaw(text);
  //     should(result).be.instanceof(ast.Template);
  //     result.should.have.property("children").which.is.Array().of.length(1);
  //     result.children[0].should.be.instanceof(ast.Block);
  //     let b = <ast.Block>result.children[0];
  //     b.should.have.property("expr").which.is.an.instanceof(ast.BinaryOperation);
  //     let o = <ast.BinaryOperation>b.expr;
  //
  //     compare(o,
  //       construct(
  //         ["&&",
  //           ["==",
  //             ["+",
  //               ["*", "a", "b"],
  //               ["/", "c", "d"]
  //             ],
  //             3
  //           ],
  //           ["==",
  //             [">", "e", "f"],
  //             true
  //           ]
  //         ]
  //       )
  //     );
  //   })
  //
  //   it("should parse extensions", () => {
  //     let text = "[[o{x: 5}]][[o{y: 7}.y]]";
  //     let result = parseRaw(text);
  //     should(result).be.instanceof(ast.Template);
  //     result.should.have.property("children").which.is.Array().of.length(2);
  //     result.children[0].should.be.instanceof(ast.Block);
  //
  //     let b = <ast.Block>result.children[0];
  //     b.should.have.property("expr").which.is.an.instanceof(ast.Extension);
  //     let e = <ast.Extension>b.expr;
  //     e.should.have.property("object").which.is.an.instanceof(ast.Identifier)
  //       .with.property("value").equal("o");
  //     e.should.have.property("extension").which.is.an.instanceof(ast.ObjectLiteral)
  //       .with.property("value").which.is.an.Object()
  //       .with.property("x").which.is.an.instanceof(ast.Number)
  //       .with.property("value").equal(5);
  //
  //     b = <ast.Block>result.children[1];
  //     b.should.have.property("expr").which.is.an.instanceof(ast.Property);
  //     let p = <ast.Property>b.expr;
  //     p.should.have.property("property").which.is.an.instanceof(ast.Identifier)
  //       .with.property("value").equal("y");
  //     p.should.have.property("object").which.is.an.instanceof(ast.Extension);
  //     e = <ast.Extension>p.object;
  //     e.should.have.property("object").which.is.an.instanceof(ast.Identifier)
  //       .with.property("value").equal("o");
  //     e.should.have.property("extension").which.is.an.instanceof(ast.ObjectLiteral)
  //       .with.property("value").which.is.an.Object()
  //       .with.property("y").which.is.an.instanceof(ast.Number)
  //       .with.property("value").equal(7);
  //   })
  // });
  //
  // describe("block templates", () => {
  //
  //   it("should parse opening and closing blocks", () => {
  //     let text = "Hello [[+big]]bad[[-big]] world";
  //     let result = parseRaw(text);
  //     should(result).be.instanceof(ast.Template);
  //     result.should.have.property("children").which.is.Array().of.length(3);
  //     result.children[0].should.be.a.String().equal("Hello ");
  //     result.children[1].should.be.instanceof(ast.Block);
  //     let b = <ast.Block>result.children[1];
  //     b.should.have.property("expr").which.is.an.instanceof(ast.Identifier)
  //       .with.property("value").equal("big");
  //     b.should.have.property("contents").which.is.an.instanceof(ast.Template);
  //     let t = <ast.Template>b.contents;
  //     t.should.have.property("children").which.is.Array().of.length(1);
  //     t.children[0].should.be.a.String().equal("bad");
  //     result.children[2].should.be.a.String().equal(" world");
  //   })
  //
  //   it("should throw on missing closing block", () => {
  //     let text = "[[+one]][[+two]]hello[[-one]]";
  //     parseRaw.bind(null, text).should.throw(ParseError, {column: "[[+one]][[+two]]hello[[-".length});
  //     text = "[[+one]]";
  //     parseRaw.bind(null, text).should.throw(ParseError, {column: "[[+one]]".length});
  //   })
  //
  //   it("should parse nested blocks", () => {
  //     let text = "[[+one]][[+two]]hello[[-two]][[-one]]";
  //     let result = parseRaw(text);
  //     should(result).be.instanceof(ast.Template);
  //     result.should.have.property("children").which.is.Array().of.length(1);
  //     result.children[0].should.be.instanceof(ast.Block);
  //
  //     let b = <ast.Block>result.children[0];
  //     b.should.have.property("expr").which.is.an.instanceof(ast.Identifier)
  //       .with.property("value").which.is.equal("one");
  //     b.should.have.property("contents").which.is.an.instanceof(ast.Template);
  //
  //     let t = <ast.Template>b.contents;
  //     t.should.have.property("children").which.is.Array().of.length(1);
  //     result.children[0].should.be.instanceof(ast.Block);
  //
  //     b = <ast.Block>t.children[0];
  //     b.should.have.property("expr").which.is.an.instanceof(ast.Identifier)
  //       .with.property("value").which.is.equal("two");
  //     b.should.have.property("contents").which.is.an.instanceof(ast.Template);
  //
  //     t = <ast.Template>b.contents;
  //     t.should.have.property("children").which.is.Array().of.length(1);
  //     t.children[0].should.equal("hello");
  //   })
  //
  //
  //   it("should not throw on missing implicit closing block", () => {
  //     let text = "[[+one]][[*two]]hello[[-one]]";
  //     let result = parseRaw(text);
  //     should(result).be.instanceof(ast.Template);
  //     result.should.have.property("children").which.is.Array().of.length(1);
  //     result.children[0].should.be.instanceof(ast.Block);
  //
  //     let b = <ast.Block>result.children[0];
  //     b.should.have.property("expr").which.is.an.instanceof(ast.Identifier)
  //       .with.property("value").which.is.equal("one");
  //     b.should.have.property("contents").which.is.an.instanceof(ast.Template);
  //
  //     let t = <ast.Template>b.contents;
  //     t.should.have.property("children").which.is.Array().of.length(1);
  //     result.children[0].should.be.instanceof(ast.Block);
  //
  //     b = <ast.Block>t.children[0];
  //     b.should.have.property("expr").which.is.an.instanceof(ast.Identifier)
  //       .with.property("value").which.is.equal("two");
  //     b.should.have.property("contents").which.is.an.instanceof(ast.Template);
  //
  //     t = <ast.Template>b.contents;
  //     t.should.have.property("children").which.is.Array().of.length(1);
  //     t.children[0].should.equal("hello");
  //   })
  //
  //   it("should parse template param list", () => {
  //     let text = "[[+foo -> x, y, z]][[-foo]]";
  //     let result = parseRaw(text);
  //     should(result).be.instanceof(ast.Template);
  //     result.should.have.property("children").which.is.Array().of.length(1);
  //     result.children[0].should.be.instanceof(ast.Block);
  //     let b = <ast.Block>result.children[0];
  //     b.should.have.property("expr").which.is.an.instanceof(ast.Identifier);
  //     b.should.have.property("contents").which.is.an.instanceof(ast.Template);
  //
  //     let t = b.contents as ast.Template;
  //     t.should.have.property("params").which.is.instanceof(ast.TemplateParams);
  //     let p = t.params as ast.TemplateParams;
  //     p.should.have.property("ids").which.is.Array().of.length(3);
  //     p.ids[0].should.be.an.instanceof(ast.Identifier)
  //       .with.property("value").equal("x");
  //     p.ids[1].should.be.an.instanceof(ast.Identifier)
  //       .with.property("value").equal("y");
  //     p.ids[2].should.be.an.instanceof(ast.Identifier)
  //       .with.property("value").equal("z");
  //   })
  // });
  //
  // describe("assignments", () => {
  //
  //   it("should parse assignments", () => {
  //     let text = "[[pi = 3.14]]";
  //     let result = parseRaw(text);
  //     should(result).be.instanceof(ast.Template);
  //     result.should.have.property("children").which.is.Array().of.length(1);
  //     result.children[0].should.be.instanceof(ast.Assignment);
  //     let a = <ast.Assignment>result.children[0];
  //     a.should.have.property("target").which.is.an.instanceof(ast.Identifier)
  //       .with.property("value").equal("pi");
  //     a.should.have.property("operator").which.is.an.instanceof(ast.Token)
  //       .with.property("value").equal("=");
  //     a.should.have.property("expr").which.is.an.instanceof(ast.Number)
  //       .with.property("value").equal(3.14);
  //   })
  //
  //   it("should parse implicit assignments", () => {
  //     let text = "[[=foo]]hello[[-foo]]";
  //     let result = parseRaw(text);
  //     should(result).be.instanceof(ast.Template);
  //     result.should.have.property("children").which.is.Array().of.length(1);
  //     result.children[0].should.be.instanceof(ast.Assignment);
  //     let a = <ast.Assignment>result.children[0];
  //     a.should.have.property("target").which.is.an.instanceof(ast.Identifier)
  //       .with.property("value").equal("foo");
  //     a.should.have.property("operator").which.is.an.instanceof(ast.Token)
  //       .with.property("value").equal("=");
  //     a.should.have.property("expr").which.is.an.instanceof(ast.Identifier)
  //       .with.property("value").equal("thisContents");
  //     a.should.have.property("contents").which.is.an.instanceof(ast.Template);
  //
  //     let t = a.contents as ast.Template;
  //     t.should.have.property("children").which.is.Array().of.length(1);
  //     t.children[0].should.be.String().equal("hello");
  //   })
  //
  //   it("should parse parameter injections", () => {
  //     let text = "[[+foo]][[pi: 3.14]][[-foo]]";
  //     let result = parseRaw(text);
  //     should(result).be.instanceof(ast.Template);
  //     result.should.have.property("children").which.is.Array().of.length(1);
  //     result.children[0].should.be.instanceof(ast.Block);
  //
  //     let b = <ast.Block>result.children[0];
  //     b.should.have.property("injections").which.is.Array().of.length(1);
  //     b.injections[0].should.be.instanceof(ast.Injection);
  //
  //     let i = b.injections[0];
  //     i.should.have.property("target").which.is.instanceof(ast.Identifier)
  //       .with.property("value").equal("pi");
  //     i.should.have.property("operator").which.is.instanceof(ast.Token)
  //       .with.property("value").equal(":");
  //     i.should.have.property("expr").which.is.instanceof(ast.Number)
  //       .with.property("value").equal(3.14);
  //   })
  //
  //   it("should parse implicit injections", () => {
  //     let text = "[[+foo]][[:bar]]goodbye[[-bar]][[-foo]]";
  //     let result = parseRaw(text);
  //     should(result).be.instanceof(ast.Template);
  //     result.should.have.property("children").which.is.Array().of.length(1);
  //     result.children[0].should.be.instanceof(ast.Block);
  //
  //     let b = <ast.Block>result.children[0];
  //     b.should.have.property("injections").which.is.Array().of.length(1);
  //     b.injections[0].should.be.instanceof(ast.Injection);
  //
  //     let i = b.injections[0];
  //     i.should.have.property("target").which.is.instanceof(ast.Identifier)
  //       .with.property("value").equal("bar");
  //     i.should.have.property("operator").which.is.instanceof(ast.Token)
  //       .with.property("value").equal(":");
  //     i.should.have.property("expr").which.is.instanceof(ast.Identifier)
  //       .with.property("value").equal("thisContents");
  //   })
  })
});
