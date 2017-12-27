import { template, templateResult } from "../render";
import * as should from "should";

describe("render function", () => {

  describe("basic blocs", () => {

    it ("should render plain text", () => {
      let text = "this is a single [text] bloc";
      return templateResult(text).then(result => {
        should(result).be.a.String().equal(text);
      });
    })

    it("should render null", () => {
      let text = "watch out for [[null]] pointers";
      return templateResult(text).then(result => {
        should(result).be.a.String().equal("watch out for  pointers");
      });
    });

    it("should render undefined", () => {
      let text = "this is not [[undefined]] behavior";
      return templateResult(text).then(result => {
        should(result).be.a.String().equal("this is not  behavior");
      });
    })

    it("should render boolean literals", () => {
      let text = "How [[true]] it is!";
      return templateResult(text).then(result => {
        should(result).be.a.String().equal("How true it is!");
      })
    })

    it("should render number literals", () => {
      let text = "Pi = [[3.14159]]";
      return templateResult(text).then(result => {
        should(result).be.a.String().equal("Pi = 3.14159");
      })
    })

    it("should render string literals", () => {
      let text = 'Hello, [["world"]]!';
      return templateResult(text).then(result => {
        should(result).be.a.String().equal("Hello, world!");
      })
    })

    it("should render identifiers", () => {
      let text = "Hello, [[name]]!";
      return templateResult(text, { name: "Fred" }).then(result => {
        should(result).be.a.String().equal("Hello, Fred!");
      })
    })

    it("should render multiple blocs", () => {
      let text = '[[123]] [[x]] [["hello"]]';
      return templateResult(text, { x: "???" }).then(result => {
        should(result).be.a.String().equal("123 ??? hello");
      })
    })
  })

  describe("expressions", () => {
    it("should evaluate unary operators", () => {
      let text = "[[ -3]] [[ -x]] [[!y]] [[ +5]]";
      let context = { x: 8, y: false };
      return templateResult(text, context).then(result => {
        should(result).be.a.String().equal("-3 -8 true 5");
      })
    })

    it("should evaluate binary operators", () => {
      let text = "[[3 + 4 * 5]] and [[3 - 4 - 5 > 0 == 7 * 6 > 6 * 7]]";
      return templateResult(text).then(result => {
        should(result).be.a.String().equal("23 and true");
      })
    })

    it("should evaluate properties", () => {
      let text = "Hello, [[user.stats.age]] year-old [[user.name]]";
      let context = {
        user: {
          name: "Fred",
          stats: { age: 50 }
        }
      };
      return templateResult(text, context).then(result => {
        should(result).be.a.String().equal("Hello, 50 year-old Fred");
      })
    })

    it("should evalutate array indexes", () => {
      let text = "Hello [[name[0]]], [[name[1]]], and [[name[2]]]";
      let context = {
        name: [ "larry", "curly", "moe" ]
      };
      return templateResult(text, context).then(result => {
        should(result).be.a.String().equal("Hello larry, curly, and moe");
      })
    })

    it("should evaluate function calls", () => {
      let text = "[[f()]]+[[g(3, 4)]]";
      let context = {
        f: () => 6,
        g: (x: number, y: number) => x + y
      };
      return templateResult(text, context).then(result => {
        should(result).be.a.String().equal("6+7");
      })
    })
  })

  describe("handling undefined", () => {

    it("should render undefined identifiers", () => {
      let text = "Hello, [[name]]!";
      return templateResult(text).then(result => {
        should(result).be.a.String().equal("Hello, !");
      });
    })

    it("should render properties of undefined values", () => {
      let text = "-[[undefined.foo]]-[[null.foo]]-[[goo.foo]]-[[fee.fie.foe.fum]]-";
      return templateResult(text, { goo: { }, fee: { fie: { } } }).then(result => {
        should(result).be.a.String().equal("-----");
      });
    })

    it("should render indices of undefined values", () => {
      let text = "=[[undefined[3]]]=[[null[2]]]=[[goo[2]]]=[[fee[1][2][3]]]=";
      return templateResult(text, { goo: [ ], fee: [[ ], [ ]] }).then(result => {
        should(result).be.a.String().equal("=====");
      })
    })

    it("should render applications of undefined values", () => {
      let text = ".[[undefined()]].[[undefined(1, 2, 3)]].";
      return templateResult(text).then(result => {
        should(result).be.a.String().equal("...");
      })
    })

  })

  describe("helpers", () => {

    it("should call helpers", () => {
      let text = "[[fee]]";
      let context = { fee: () => "Hello, world" };
      return templateResult(text, context).then(result => {
        should(result).be.a.String().equal("Hello, world");
      })
    })

    it("should call helpers from curried functions", () => {
      let text = "abc [[fee(3, 4)]] xyz";
      let context = { fee: (x: number, y: number) => (() => x + y) };
      return templateResult(text, context).then(result => {
        should(result).be.a.String().equal("abc 7 xyz");
      })
    })

    it("should pass the context to helpers", () => {
      let text = "[[fee]]";
      let context = { fee: (ctx: any) => ctx.fum, fum: "Howdy" };
      return templateResult(text, context).then(result => {
        should(result).be.a.String().equal("Howdy");
      })
    })

    it("should pass the bloc dictionary to helpers", () => {
      let text = '[[+fee]][[fum: "Whatever"]][[-fee]]';
      let context = { fee: (ctx: any, bloc: any) => bloc.fum };
      return templateResult(text, context).then(result => {
        should(result).be.a.String().equal("Whatever");
      })
    })

    it("should render a template as a helper", () => {
      let text = "[[fee]]";
      let context = {
        fee: template("abc [[3 + 4]] [[x]]"),
        x: "Zippity doo dah"
      };
      return templateResult(text, context).then(result => {
        should(result).be.a.String().equal("abc 7 Zippity doo dah");
      })
    })

    it("should refer to bloc dictionary using this", () => {
      let text = "[[+ 2 * this.pi * this.r]][[pi: 3.14159]][[r: 10]][[- 2 * this.pi * this.r]]";
      return templateResult(text).then(result => {
        should(result).be.a.String().equal(String(3.14159*20));
      })
    })

    it("should refer to containing bloc properties as bloc", () => {
      let text = '[[+fee]][[fum: "Hello, world!"]][[-fee]]';
      let context = { fee: template("abc [[bloc.fum]] xyz") };
      return templateResult(text, context).then(result => {
        should(result).be.a.String().equal("abc Hello, world! xyz");
      })
    })

  })

  describe("nested templates", () => {
    it("should store nested templates as contents", () => {
      let text = "[[+fee]]Bing [[x]] bong[[-fee]]";
      let context = {
        fee: (ctx: any, bloc: any) => { return bloc.contents({ x: "bang" }) }
      };
      return templateResult(text, context).then(result => {
        should(result).be.a.String().equal("Bing bang bong");
      })
    })

    it("should allow templates to access bloc properties", () => {
      let text = '[[+this.contents]][[name: "Joe"]]Hello, [[bloc.name]][[-this.contents]]';
      return templateResult(text).then(result => {
        should(result).be.a.String().equal("Hello, Joe");
      })
    })

    it("should allow templates to render bloc contents", () => {
      let text = "[[+fee]]Hello, [[name]][[-fee]]";
      let context = {
        name: "Fred",
        fee: template("<div>[[bloc.contents]]</div>")
      };
      return templateResult(text, context).then(result => {
        should(result).be.a.String().equal("<div>Hello, Fred</div>");
      })
    })

    it("should allow templates to render bloc properties", () => {
      let text = "[[+fee]]abc[[*:fum]]xyz[[-fee]]";
      let context = {
        name: "Fred",
        fee: template("[[bloc.contents]]/[[bloc.fum]]")
      };
      return templateResult(text, context).then(result => {
        should(result).be.a.String().equal("abc/xyz");
      })
    })
  })

})