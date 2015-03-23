process.env.NODE_ENV = 'test';
require('should');
var request = require('./support/http'), json = JSON.stringify, express = require('express'),
    mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    rest = require('../index.js'), compat = require('../lib/compat'), app;


var UserSchema = new Schema({
    username: String,
    groups: [{type: Schema.Types.ObjectId, ref: 'grouptest', deleteRef: true}],
    stuff: [
        String
    ],
    noDeleteRef: [{type: Schema.Types.ObjectId, ref: 'grouptest', deleteRef: false}]
});
UserSchema.statics.current = function (session$user) {
    return this.findById(session$user);
}

var GroupSchema = new Schema({
    name: String
});
var uid;
describe('user like routes', function () {
    var connection;
    before(function onBefore(done) {
        connection = mongoose.createConnection();
        var User = connection.model('usertest', UserSchema),
            Group = connection.model('grouptest', GroupSchema),
            u;
        app = express();
        app.use(compat.bodyParser());
        //fake login session.
        app.use(function (req, res, next) {
            var session = req.session || (req.session = {});
            uid = session.user = u._id;
            next();
        });
        app.use('/rest', rest({mongoose: connection}).rest());

        connection.on('connected', function () {

            this.db.dropDatabase(function () {

                var g = new Group({
                    name: 'No Delete'
                });
                g.save(function (e, o) {
                    u = new User({username: 'bob', stuff: ['stuff', 'then stuff', 'other stuff'], noDeleteRef:[g]});
                    u.save(function (e, o) {
                        if (e) {
                            return done(e);
                        }
                        done();
                    });
                });
            });
        });

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
        request(app).get('/rest/usertest/current').end(function (err, resp) {
            resp.body.should.have.property('payload');
            resp.body.payload.should.have.property('username', 'bob');
            done();
        })
    });
    it('should put current', function (done) {
        request(app).put('/rest/usertest/current').set('Content-Type', 'application/json')
            .send(json({"username": "Robert"})).end(function (err, resp) {
                resp.body.should.have.property('payload');
                resp.body.payload.should.have.property('username', 'Robert');
                done();
            })
    });
    it('should post current refs', function (done) {
        request(app).post('/rest/usertest/current/groups').set('Content-Type', 'application/json')
            .send(json({"name": "G1"})).end(function (err, resp) {
                resp.body.should.have.property('payload');
                resp.body.payload.should.have.property('name', 'G1');
                done();
            })
    });
    it('should delete stuff', function (done) {
        request(app).delete('/rest/usertest/current/stuff/1').set('Content-Type', 'application/json')
            .end(function (err, resp) {
                var payload = resp.body.should.have.property('payload').obj;
                request(app).get('/rest/usertest/current').set('Content-Type', 'application/json').end(function (e, o) {
                    o.body.should.have.property('status', 0);
                    var obj = o.body.should.have.property('payload').obj;
                    obj.stuff.should.have.property('length', 2);
                    obj.stuff.should.have.property('0', "stuff");
                    obj.stuff.should.have.property('1', "other stuff");

                    done();
                })

            })
    });
    it('should delete current without deleting ref', function (done) {
        request(app).delete('/rest/usertest/current/noDeleteRef/0').set('Content-Type', 'application/json')
            .end(function (err, resp) {
                var payload = resp.body.should.have.property('payload').obj;
                payload.should.have.property('name', 'No Delete');
                var gid = payload._id;
                request(app).get('/rest/usertest/current?populate=noDeleteRef').set('Content-Type', 'application/json').end(function (e, o) {
                    o.body.should.have.property('status', 0);
                    payload = o.body.should.have.property('payload').obj;
                    var groups = payload.should.have.property('noDeleteRef').obj;
                    groups.should.have.property('length', 0);
                    request(app).get('/rest/grouptest/' + gid).set('Content-Type', 'application/json').end(function (e, o) {
                        payload = o.body.should.have.property('payload').obj;
                        payload.should.have.property('_id', gid);
                        done();
                    });
                })
                // resp.body.should.have.property('payload');
                // resp.body.payload.should.have.property('name', 'G1');
//                done();
            })
    });
    it('should delete current group 0', function (done) {
        request(app).delete('/rest/usertest/current/groups/0').set('Content-Type', 'application/json')
            .end(function (err, resp) {
                var payload = resp.body.should.have.property('payload').obj;
                payload.should.have.property('name', 'G1');
                var gid = payload._id;
                request(app).get('/rest/usertest/current?populate=groups').set('Content-Type', 'application/json').end(function (e, o) {
                    o.body.should.have.property('status', 0);
                    payload = o.body.should.have.property('payload').obj;
                    var groups = payload.should.have.property('groups').obj;
                    groups.should.have.property('length', 0);
                    request(app).get('/rest/grouptest/' + gid).set('Content-Type', 'application/json').end(function (e, o) {
                        o.should.not.have.property('payload');
                        done();
                    });
                })
                // resp.body.should.have.property('payload');
                // resp.body.payload.should.have.property('name', 'G1');
//                done();
            })
    });
    it('should delete current', function (done) {
        request(app).delete('/rest/usertest/current').set('Content-Type', 'application/json')
            .end(function (err, resp) {
                var payload = resp.body.should.have.property('payload').obj;
                payload.should.have.property('_id', uid + '');
                request(app).get('/rest/usertest/current').set('Content-Type', 'application/json').end(function (e, o) {
                    o.body.should.have.property('status', 0);
                    done();
                })
                // resp.body.should.have.property('payload');
                // resp.body.payload.should.have.property('name', 'G1');
//                done();
            })
    })


});
