process.env.NODE_ENV = 'test';
require('should');
var request = require('./support/http'), json = JSON.stringify, express = require('express'), mongoose = require('mongoose'),
    rest = require('../index.js'), compat = require('../lib/compat'), app;

var UserSchema = new mongoose.Schema({
    username: String
});
UserSchema.statics.current = function (session$user) {
    return this.findById(session$user);
}

describe('user like routes', function () {
    var connection;
    before(function onBefore(done) {
        connection = mongoose.createConnection();
        var User = connection.model('usertest', UserSchema), u;
        app = express();
        app.use(compat.bodyParser());
        //fake session.
        app.use(function (req, res, next) {
            var session = req.session || (req.session = {});
            session.user = u._id;
            next();
        });
        app.use('/rest', rest({mongoose: connection}).rest());

        connection.on('connected', function () {

            this.db.dropDatabase(function () {
                u = new User({username: 'bob'});
                u.save(function (e, o) {
                    if (e) {
                        return done(e);
                    }
                    done();
                });

            });
        })
        if (connection.readyState === 1) connection.close();
        connection.open('mongodb://localhost/routes-mocha-user');

    });
    after(function onAfter(done) {
        connection.on('disconnected', function () {
            done();
        });
        connection.close();

    });
    it('should return current', function (done) {
        request(app).get('/rest/usertest/current?name=bob').end(function (err, resp) {
            resp.body.should.have.property('payload');
            resp.body.payload.should.have.property('username', 'bob');
            done();
        })
    });


});
