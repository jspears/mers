var express = require('express'),
    rest = require('../index'),
    request = require('./support/http'),
    mongoose = require('mongoose'),
    should = require('should'),
    Schema = mongoose.Schema,
    json = JSON.stringify,
    app = express();

var UserSchema = new Schema({
    username: {type: String, required: true, unique: true, index: true},
    score: {type: Number},
    meta: {
        created: {
            type: Date
        }
    }
});

var User = mongoose.model('User', UserSchema);
module.exports.setUp = function (done) {

    var connection = mongoose.connection;
    mongoose.connect('mongodb://localhost/user_example_rest');
    create(create(create(create(create(function () {
        console.log('done creating users')
        done();
    })))));

    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use('/rest', rest({ mongoose: mongoose }).rest())


}
var d = new Date();
function date(offset) {
    return new Date(d.getTime() + offset);
}
var score = 0;
var usernames = ['abc', 'def', 'acc', 'dff']
function create(done) {
    return function () {
        var u = new User({
            username: usernames[score % usernames.length],
            score: score++,
            meta: {
                created: date(-10000 * score)
            }
        });
        mongoose.save(u, done);
    }
}

module.exports.tearDown = function (done) {
    mongoose.disconnect(function () {
        console.log('disconnecting');
        done();
//        process.exit(0);
    });
}

module.exports.testFilterString = function (test) {
    request(app)
        .get('/rest/User?filter[username]=>abc')
        .expect(200).end(function (err, res) {
            console.log('response', res.body);
            res.body.should.have.property('status', 0);
            var payload = res.body.should.have.property('payload').obj;

            test.done();

        })
};
module.exports.testFilterGtNumber = function (test) {
    request(app)
        .get('/rest/User?filter[count]=>1')
        .expect(200).end(function (err, res) {
            console.log('response', res.body);
            res.body.should.have.property('status', 0);
            var payload = res.body.should.have.property('payload').obj;
            test.ok(true);
            test.done();

        });
};
module.exports.testFilterltNumber = function (test) {
    request(app)
        .get('/rest/User?filter[count]=<1')
        .expect(200).end(function (err, res) {
            console.log('response', res.body);
            res.body.should.have.property('status', 0);
            var payload = res.body.should.have.property('payload').obj;

            test.done();

        })
};
module.exports.testFilterltDate = function (test) {
    request(app)
        .get("/rest/User?filter[meta][created]=<" + (new Date().toJSON()))
        .expect(200).end(function (err, res) {
            console.log('response', res.body);
            res.body.should.have.property('status', 0);
            var payload = res.body.should.have.property('payload').obj;

            test.done();

        })
};
