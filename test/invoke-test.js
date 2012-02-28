var invoker = require('../lib/invoke'), assert = require('assert');


var obj = {
    property:1,
    stuff:[
        {a:1},
        {b:2},
        {c:{
            f:function () {
                return 1;
            }
        }},
        {_id:'abc', c:1 }

    ],
    func:function (str) {
        return {
            abc:str
        }
    },
    nullvalue:null,
    nested:{
        property:1
    },
    array:[1, 2, 3],
    deep:{fail:function onFailDeep() {
        throw new Error("hello");
    }}

}
var c = 0, s = 0;

function test(obj, path, value, description, asserter) {
    asserter = asserter || function(description, value, err, v){
        assert.equal(value, v, description);
        assert.ok( err == null, "error is null check");
    }
    c++;
    var callback = function onTestCallback(err, v) {
        this.invoked = true;
        asserter.apply(this, [description, value,err,v]);
        console.log(c, "success", description);
    }
    try {
        invoker.invoke(obj, path, callback);
    } catch (e) {
        console.log(c, 'failed', description, e.message)
    }
    assert.ok(this.invoked, "callback not invoked");
}

test(obj, "deep/fail", "hello", "test failure handling", function(description, value, err, v){
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
