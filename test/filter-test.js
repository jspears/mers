var express = require('express'),
    rest = require('../index'),
    request = require('./support/http'),
    mongoose = require('mongoose'),
    should = require('should'),
    Schema = mongoose.Schema,
    json = JSON.stringify,
    app = express(),
    testCase = require('nodeunit').testCase;
;

var UserSchema = new Schema({
    username: {type: String, required: true, unique: true, index: true},
    count: {type: Number},
    meta: {
        created: {
            type: Date
        }
    }
});

var User = mongoose.model('User', UserSchema);
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use('/rest', rest({ mongoose: mongoose }).rest())
var connection = mongoose.connection;

module.exports.var
d = new Date();
function date(offset) {
    return new Date(d.getTime() + offset);
}
var score = 0;
var usernames = ['abc', 'def', 'acc', 'dff']

var isSetup = false;
function insert(done) {
    var us = [].concat(usernames);
    var save = function (username) {
        var u = new User({
            username:username,
            count: score++,
            meta: {
                created: date(-10000 * score)
            }
        });
        console.log('saving ', u.username);
        u.save(doneSave);
    }

    var doneSave = function (err, obj) {
        if (err) {
            console.log('error', err);
        }
        if (us.length == 0) {
            console.log('done');
            done();
        } else {
            save(us.shift());
        }

    }
    save(us.shift());
}
module.exports = {
    setUp: function (done) {
        console.log('setup');
        if (isSetup){
           return done();
        }
        mongoose.connect('mongodb://localhost/user_example_rest', function () {
            console.log('connected');
            mongoose.connection.db.dropDatabase(function () {
                console.log('dropped');
                isSetup = true;
                insert(done);

            });
        });
    },

    testFilterString: function (test) {
        request(app)
            .get('/rest/User?filter[username]=>abc')
            .expect(200).end(function (err, res) {
                console.log('response', res.body);
                res.body.should.have.property('status', 0);
                var payload = res.body.should.have.property('payload').obj;

                test.done();

            })
    },
    testFilterGtNumber: function (test) {
        request(app)
            .get('/rest/User?filter[count]=>1')
            .expect(200).end(function (err, res) {
                console.log('response', res.body);
                res.body.should.have.property('status', 0);
                var payload = res.body.should.have.property('payload').obj;

                test.done();

            })
    },
    testFilterltNumber: function (test) {
        request(app)
            .get('/rest/User?filter[count]=<1')
            .expect(200).end(function (err, res) {
                console.log('response', res.body);
                res.body.should.have.property('status', 0);
                var payload = res.body.should.have.property('payload').obj;

                test.done();

            })
    },
    testFilterltDate: function (test) {
        request(app)
            .get("/rest/User?filter[meta][created]=<" + (date(-10000 *3).toJSON()))
            .expect(200).end(function (err, res) {
                if (err){
                    console.log('Error',res, err);
                    test.fail();
                }
                console.log('response', res.body);
                res.body.should.have.property('status', 0);
                var payload = res.body.should.have.property('payload').obj;
                payload.should.have.length(2);

                test.done();

            })
    }

}

