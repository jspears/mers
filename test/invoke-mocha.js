var invoker = require('../lib/invoke'), assert = require('assert'), slice = Function.call.bind(Array.prototype.slice);
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
        invoker.invoke(obj, path, callback);
    } catch (e) {
        console.log(c, 'failed', description, e.message)
    }
    assert.ok(this.invoked, "callback not invoked");
}
describe('invoker', function () {
    it('should invoke stuff', function () {
        test(obj, "deep/fail", "hello", "test failure handling", function (description, value, err, v) {
            assert.ok(err != null, "err should not be null");
            assert.equal(err.message, value, description);
        });
        test(obj, "nullvalue", null, "testing nullity");
        test(obj, "func/1/abc", 1, "test function");
        test(obj, "stuff/abc/c", 1, "test by id");
        test(obj, "property", 1, "test property");
        test(obj, "nested/property", 1, "test nested property");
        test(obj, 'array/0', 1, "test array direct");
        test(obj, 'stuff/0/a', 1, "test array than object");
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
                return [b,a];
            }, count: 0
        };
        var args = invoker.injectBind(scope.me, scope, {a: 1, d: 1})({c: 2}, {b: 2});


        assert.strictEqual(args[0], 2, "injected arg 1");
        assert.strictEqual(args[1], 1, "injected arg 1");
        //test for correct scope binding.
        assert.strictEqual(scope.count, 1, "injected arg 1");
    });
    it('should resolve arguments', function(){
       var scope = {
           query:{a:1},
           session:{a:2, b:1},
           body:{a:3, du:3, b:2}
       }
       var args = invoker.resolve(function(query$a, session$a, body$du, none, query$none, any$b, b, require$$$test$support$junk){
           return slice(arguments);
       }, scope);
        assert.strictEqual(args[0], 1, "resolved query$a");
        assert.strictEqual(args[1], 2, "resolved session$a");
        assert.strictEqual(args[2], 3, "resolved body$du");
        assert.strictEqual(args[3], void(0), "resolved none");
        assert.strictEqual(args[4], void(0), "resolved query$none");
        assert.strictEqual(args[5], 2, "resolved any$b");
        assert.strictEqual(args[6], 2, "resolved any b");
        assert.strictEqual(args[7].junk, 1, "resolved module.junk ");

    });
});
