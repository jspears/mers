process.env.NODE_ENV = 'test';
require('should');
var app, request = require('./support/http'), mongoose = require('mongoose'), _u = require('underscore');
var assert = require('assert');
var json = JSON.stringify;
var d = 0;
var connection = mongoose.createConnection();
before(function onBefore(done) {
    console.log('before routes-mocha');
    connection.on('connected', function () {

        console.log('connected routes-mocha');
        app = require('../example/server.js')(connection);
        done();
    });
    connection.open('mongodb://localhost/routes_mocha');
});
beforeEach(function (done) {
    connection.db.dropDatabase(function () {
        console.log('dropped routes-mocha');
        done();
    });
});

describe('routes', function () {
    function setup(done) {
        console.log('setup called');
        done();
    }

    describe('GET /rest/blogpost', function () {
        it('should return empty list', function (done) {
            request(app).get('/rest/blogpost')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    if (err)
                        console.log('ERROR', arguments);


                    res.should.have.property('body');
                    res.body.should.have.property('payload').with.lengthOf(0);
                    res.body.should.have.property('total', 0);

                    done();
                });
        });

    });
    var id;
    describe('POST /rest/blogpost', function () {
        it('should create a new blogpost and return it', function (done) {
            request(app)
                .post('/rest/blogpost')
                .set('Content-Type', 'application/json')
                .send(json({
                    title: 'Test Blog 1',
                    body: 'Some blogged goodness',
                    date: new Date()
                })).expect(200).end(function (err, res) {
                    if (err)
                        console.log('ERROR', arguments);

                    res.should.have.property('body');
                    res.body.should.have.property('payload');
                    res.body.payload.should.have.property('title', 'Test Blog 1');
                    res.body.payload.should.have.property('body', 'Some blogged goodness');
                    id = res.body.payload._id;
                    done();

                });

        });
    });

    describe('testing  /rest/blogpost', function () {
        it('should add 2 comments to the blog post', function (done) {
            createPost(function (post) {
                request(app)
                    .put('/rest/blogpost/' + post._id)
                    .set('Content-Type', 'application/json')
                    .send(json({
                        comments: [
                            {title: 'Very Cool Thing You Have', body: 'Do you like my body?'},
                            {title: 'I dunno I\'m bored', body: 'if you think i\'m sexy'}
                        ]
                    })).end(function (err, res) {
                        if (err)
                            console.log('ERROR', arguments);
                        res.should.have.status(200);
                        res.should.have.property('body');
                        res.body.should.have.property('payload');
                        res.body.payload.should.have.property('comments');
                        res.body.payload.comments.should.have.lengthOf(2);
                        res.body.payload.comments[1].should.have.property('title', 'I dunno I\'m bored');
                        done();

                    });
            })
        });
        it('put comments[1] to the blogpost', function (done) {
            createPost({ title: 'put', body: 'stuff', comments: [
                {title: '123'},
                {title: '345'},
                {title: '456'}
            ] }, function (post) {
                request(app)
                    .put('/rest/blogpost/' + post._id + '/comments/1')
                    .set('Content-Type', 'application/json')
                    .send(json(
                        {title: 'Yup', body: 'Do you like my body?'}
                    )).end(function (err, res) {
                        if (err)
                            console.log('ERROR', err.message, err.stack);

                        res.should.have.status(200);
                        res.should.have.property('body');
                        res.body.should.have.property('payload');
                        res.body.payload.should.have.property('title', 'Yup');
                        res.body.payload.should.have.property('_id');
                        done();

                    });
            });

        });
        it('post comments to the blogpost', function (done) {
            createPost(function (post) {
                request(app)
                    .post('/rest/blogpost/' + post._id + '/comments/')
                    .set('Content-Type', 'application/json')
                    .send(json(
                        {title: 'YupYup', body: 'Do you like my body?'}
                    )).end(function (err, res) {
                        if (err)
                            console.log('ERROR', err.message, err.stack);

                        res.should.have.status(200);
                        res.should.have.property('body');
                        res.body.should.have.property('payload');
                        //            res.body.payload.should.have.lengthOf(3);
                        res.body.payload.should.have.property('title', 'YupYup');

                        done();

                    });
            });

        });
        it('should not crash on invalid PUT', function (done) {
            createPost(function (post) {
                request(app)
                    .put('/rest/blogpost/' + post._id)
                    .set('Content-Type', 'application/json')
                    .send(json(
                        {title: 'No'}
                    )).end(function (err, res) {
                        res.should.have.status(200);
                        res.body.should.have.property('status', 1);
                        res.body.should.have.property('message', 'Validation failed');
                        done();
                    });
            });
        });
        it('should be accessible from an url', function (done) {
            createPost({ title: 'Yup',
                body: 'Do you like my body?',
                comments: [
                    {body: 'Do you like my body?'}
                ]
            }, function (post) {
                request(app).get('/rest/blogpost/' + post._id + '/comments/' + post.comments[0]._id).end(function (err, res) {

                    res.should.have.status(200);
                    res.should.have.property('body');
                    res.body.should.have.property('payload');
                    res.body.payload.should.have.property("body", 'Do you like my body?');
                    done();
                });
            });
        });
    });
    describe('DELETE /rest/blogpost/$id', function () {
        it('should delete the created blog posting', function (done) {
            createPost(function (post) {
                request(app).del('/rest/blogpost/' + post._id).end(function (err, res) {

                    res.should.have.status(200);
                    res.should.have.property('body');
                    res.body.should.have.property('status', 0);

                    request(app).get('/rest/blogpost/' + post._id).end(function (err, res) {

                        res.should.have.status(200);
                        res.should.have.property('body');
                        //TODO - technically this should return null, however the get part can't really tell if the query is nothing or expecting a return changing this to ?single=true would fix it
                        //res.body.should.have.property('payload').eql(null);
                        res.body.should.have.property('status', 0);
                        done();

                    });

                })
            });
        });
    });


    describe('should handle errors without crashing when calling an invalid id', function () {
        it('should not crash invalid id', function (done) {
            request(app).get('/rest/blogpost/junk').end(function (err, res) {
                res.should.have.status(200);
                res.body.should.have.property('status', 1);
                res.body.should.have.property('error');
                done();
            });
        });
        it('should not crash no id', function (done) {
            request(app).get('/rest/blogpost/').end(function (err, res) {
                res.should.have.status(200);

                done();
            });
        });
    });

    describe('make a raw mongodb call', function () {
        it('should not crash', function (done) {
            request(app).get('/rest/blogpost/finder/findRaw').end(function (err, res) {
                if (err)
                    console.log('err', err, res);
                res.should.have.status(200);
                res.body.should.have.property('status', 0);

                done();
            });
        });
    });

    describe('update a nested array', function () {
        it('put should update a nested array', function (done) {
            createPost({
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
                                },
                                {
                                    title: 'hello3-4', body: 'world3-4'
                                }
                            ]
                        }
                    ]
                    },
                    { title: 'comment 2', body: 'comment2'}
                ]

            }, function (post) {
                request(app).put('/rest/blogpost/' + post._id + '/comments/0/posts/1').set('Content-Type', 'application/json')
                    .send(json(
                        {title: 'YupYup', body: 'Do you like my body?'}
                    )).end(function (err, res) {
                        request(app).get('/rest/blogpost/' + post._id + '/comments/0/posts/').end(function (err, res) {
                            var payload = res.body.should.have.property('payload').obj;
                            payload.should.have.lengthOf(2);
                            payload[1].should.have.property('title', 'YupYup');
                            done();

                        });
                    });
            });
        });
        it('post should insert a nested array', function (done) {
            createPost({
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
                                },
                                {
                                    title: 'hello3-4', body: 'world3-4'
                                }
                            ]
                        }
                    ]
                    },
                    { title: 'comment 2', body: 'comment2'}
                ]

            }, function (post) {
                request(app).post('/rest/blogpost/' + post._id + '/comments/0/posts/').set('Content-Type', 'application/json')
                    .send(json(
                        {title: 'YupYup', body: 'Do you like my body?'}
                    )).end(function (err, res) {
                        request(app).get('/rest/blogpost/' + post._id + '/comments/0/posts/').end(function (err, res) {
                            var payload = res.body.should.have.property('payload').obj;
                            payload.should.have.lengthOf(3);
                            payload[2].should.have.property('title', 'YupYup');
                            done();

                        });
                    });
            });
        });
    });
});
var t = 0;

function createPost(opts, cb) {
    if (!cb) {
        cb = opts;
        opts = { title: 'Test ' + (t), body: 'default body for ' + t};
        t++;
    }

    request(app)
        .post('/rest/blogpost')
        .set('Content-Type', 'application/json')
        .send(json(_u.extend({ date: new Date() }, opts))).end(
        function (err, res) {
            cb(res.body.payload);
        });
}

