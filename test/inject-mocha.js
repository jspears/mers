var invoker = require('../lib/inject'), assert = require('assert'), slice = Function.call.bind(Array.prototype.slice), when = require('../lib/when').when;
var obj = {
    property: 1,
    stuff: [
        {a: 1},
        {b: 2},
        {
            c: {
                f: function () {
                    return 1;
                }
            }
        },
        {_id: 'abc', c: 1}

    ],
    func: function (str) {
        return {
            abc: str
        }
    },
    nullvalue: null,
    nested: {
        property: 1
    },
    array: [1, 2, 3],
    deep: {
        fail: function onFailDeep() {
            throw new Error("hello");
        }
    }

}
var c = 0, s = 0;

function test(obj, path, value, description, asserter) {
    asserter = asserter || function (description, value, err, v) {
        assert.equal(value, v, description);
        assert.ok(err == null, "error is null check");
    }
    c++;
    var callback = function onTestCallback(err, v) {
        this.invoked = true;
        asserter.apply(this, [description, value, err, v]);
        console.log(c, "success", description);
    }
    try {
        var p = invoker.invoke(obj, path, {}, callback);
    } catch (e) {
        console.log(c, 'failed', description, e.message)
    }
    return p;
}
describe('inject', function () {
    it('should extract a single parameter', function () {
        var ret = invoker.extractArgNames(function (query$name) {
        });
        ret.should.have.property(0, 'query$name');
    });
    it('should extract a single parameter with a named function', function () {
        var ret = invoker.extractArgNames(function query$name(query$name) {
        });
        ret.should.have.property(0, 'query$name');
    });


    it('should resolve function parameter names', function () {
        var args = invoker.injectArgs(function (a, b) {
        }, {b: 1, a: 1}, [{a: 2}], {b: 2});
        assert.strictEqual(args[0], 1, "injected arg 1");
        assert.strictEqual(args[1], 2, "injected arg 1");
    });
    it('should resolve function parameter names and bind', function () {
        var scope = {
            me: function (b, a) {
                this.count++;
                return [b, a];
            }, count: 0
        };
        var args = invoker.injectBind(scope.me, scope, {a: 1, d: 1})({c: 2}, {b: 2});


        assert.strictEqual(args[0], 2, "injected arg 1");
        assert.strictEqual(args[1], 1, "injected arg 1");
        //test for correct scope binding.
        assert.strictEqual(scope.count, 1, "injected arg 1");
    });
    it('should resolve arguments', function (done) {
        // this.timeout(400000);
        var scope = {
            query: {a: 1},
            session: {a: 2, b: 1},
            body: {a: 3, du: 3, b: 2}
        }
        invoker.resolve(function aFineQuery$here(query$a, session$a, body$du, none, query$none, any$b, b, require$$$test$support$junk) {
            return slice(arguments).concat(this);
        }, {junk: 1}, scope).then(function (args) {
            assert.strictEqual(args[0], 1, "resolved query$a");
            assert.strictEqual(args[1], 2, "resolved session$a");
            assert.strictEqual(args[2], 3, "resolved body$du");
            assert.strictEqual(args[3], void(0), "resolved none");
            assert.strictEqual(args[4], void(0), "resolved query$none");
            assert.strictEqual(args[5], void(0), "resolved any$b");
            //     assert.strictEqual(args[6], 2, "resolved any b");
            assert.strictEqual(args[8].junk, 1, "resolved module.junk ");
            done();
        }, function (e) {
            done(new Error(e));
        });
    });
    it('should inject args for non resolved patterns', function (done) {

        var scope = {
            query: {a: 1},
            session: {a: 2, b: 1},
            body: {a: 4, du: 4, b: 2}
        }
        invoker.resolve(function aFineQuery$here(query$a, a1, a2, body$a, a3) {
            return slice(arguments).concat(this);
        }, {junk: 1}, scope, 0, 2, 3).then(function (args) {
            assert.strictEqual(args[0], 1, "resolved query$a");
            assert.strictEqual(args[1], 2, "resolved args$a1");
            assert.strictEqual(args[2], 3, "resolved args$a2");
            assert.strictEqual(args[3], 4, "resolved body$a");
            assert.strictEqual(args[4], void(0), "resolved a3");
            //     assert.strictEqual(args[6], 2, "resolved any b");
            assert.strictEqual(args[5].junk, 1, "resolved module.junk ");
            done();
        });
    })
});
