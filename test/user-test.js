var express = require('express'),
    rest = require('../index'),
    request = require('./support/http'),
    mongoose = require('mongoose'),
    should = require('should'),
    Schema = mongoose.Schema,
    json = JSON.stringify,
    app = express();

var PermSchema = new Schema({
    name: {type: 'String'}
});

var GroupSchema = new Schema({
    name: {type: String},
    perms: [PermSchema],
    def:PermSchema,
    nice:[{name:String}]
});

var UserSchema = new Schema({
    username: {type: String, required: true, unique: true, index: true},
    groups: [GroupSchema]
});

var User = mongoose.model('User', UserSchema);
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use('/rest', rest({ mongoose: mongoose }).rest())
var connection = mongoose.connection;

module.exports.setUp = function (done) {
    connection.on('open', function () {
        connection.db.dropDatabase(function () {
            console.log('dropped database [' + connection.name + ']');
            done();
        });
    })
    mongoose.connect('mongodb://localhost/user_example_rest')
}
module.exports.tearDown = function (done) {
    mongoose.disconnect(function () {
        console.log('disconnecting');
        done();
//        process.exit(0);
    });
}
module.exports.testPut = function (test) {
    request(app)
        .post('/rest/User')
        .set('Content-Type', 'application/json')
        .send(json({"username": "Richard"})).expect(200).end(function (err, res) {
            console.log('response', res.body);
            res.body.should.have.property('status', 0);
            var payload = res.body.should.have.property('payload').obj;
            payload.should.have.property('username', 'Richard')
            payload.should.have.property('_id');
            test.done();

        })
};
