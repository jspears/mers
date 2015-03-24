process.env.NODE_ENV = 'test';
require('should');
var request = require('./support/http'),
    mers = require('../index'),
    assert = require('assert'),
    json = JSON.stringify, express = require('express'),
    bodyParser = require('body-parser');
var app;
var d = 0;
var pids = [];

var data = [
    {title: 'Post A', body: 'A', owner:'abc'},
    {title: 'Post B', body: 'B'},
    {title: 'Post C', body: 'C', date: new Date(140000000000)},
    {title: 'Post CD', body: 'CD', date: new Date(150000000000)},
    {title: 'Post E', body: 'E', date: new Date(156000000000)},

    {
        title: 'Post F',
        body: 'Should be deep',
        comments: [
            {
                title: 'hello', body: 'world', comment: 'im here', posts: [
                {
                    title: 'hello2', body: 'world2', comment: 'im here',
                    posts: [
                        {
                            title: 'hello2-3', body: 'world2-3', comment: 'im here'
                        }
                    ]
                },
                {
                    title: 'hello3', body: 'world3', comment: 'im here',
                    posts: [
                        {
                            title: 'hello3-3', body: 'world3-3', comment: 'im here'
                        }
                    ]
                }
            ]
            },
            {title: 'comment 2', body: 'comment2'}
        ]

    }


]

describe('transformers routes', function () {
    var connection;
    this.timeout(50000);
    before(function onBefore(done) {
        var mongoose = connection = require('mongoose').createConnection();
        require('../example/models/blogpost')(mongoose);
        app = express();
        app.use(bodyParser.json());
        //fake login session.
        app.use(function (req, res, next) {
            var session = req.session || (req.session = {});
            session.user = {_id: 'abc'};
            next();
        })
        app.use('/rest', mers({
            mongoose: connection,
            transformers: {
                renameId: function (obj) {
                    obj = obj.toJSON();
                    obj.id = obj._id + '';
                    delete obj._id;
                    //don't forget to return the object.  Null will filter it from the results.
                    return obj;
                },

               /**
                *  Injects the user into the function, and checks if the
                *  owner is the same as the current user.  Works with passport.
                */

                checkOwner: function (obj, session$user) {
                    if (obj.owner === session$user._id) {
                        //returning null, short circuits the other transformers. And will
                        //not be included in the response.
                        return obj;
                    } else {
                        return null;
                    }

                }
            }
        }).rest());

        mongoose.on('connected', function () {
            var db = mongoose.db;
            db.dropDatabase(function () {
                var count = 0;

                var BlogPost = mongoose.model('BlogPost');
                data.forEach(function (d, i) {
                    new BlogPost(d).save(function (e, o) {
                        if (e) return done();
                        pids[i] = o._id;
                        d._id = o._id + "";
                        if (data.length === ++count) {

                            done();

                        }
                    });
                });
            });
        })
        if (mongoose.readyState === 1) mongoose.close();
        mongoose.open('mongodb://localhost/routes-mocha-transform');
    });
    after(function onAfter(done) {
        connection.on('disconnected', function () {
            done();
        });
        connection.close();

    });
    it('should rename id', function (done) {
        request(app).get('/rest/blogpost?transform=renameId')
            .end(function (e, o) {
                if (e)return done(e);
                var payload = o.body.should.have.property('payload').obj;
                payload.should.have.property('length', 6);
                payload[0].should.have.property('id');
                payload[0].should.not.have.property('_id');
                done();
            });

    });
    it('should reject non-owners id', function (done) {
        request(app).get('/rest/blogpost?transform=checkOwner')
            .end(function (e, o) {
                if (e)return done(e);
                var payload = o.body.should.have.property('payload').obj;
                payload.should.have.property('length', 1);

                payload[0].should.have.property('owner', 'abc');
                done();
            });

    });


});
