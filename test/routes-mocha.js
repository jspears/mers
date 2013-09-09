process.env.NODE_ENV = 'test';
require('should');
var app = require('../example/server.js'), request = require('./support/http'), mongoose = require('mongoose'), _u = require('underscore');
var assert = require('assert');
var json = JSON.stringify;

before(function onBefore(done) {
    var connection = mongoose.connection
    connection.on('open', function () {
        connection.db.dropDatabase(function () {
            console.log('dropped database [' + connection.name + ']');
            done();
        });
    });

});

describe('rest', function () {
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
                title:'Test Blog 1',
                body:'Some blogged goodness',
                date:new Date()
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
        var cid;
        it('should add 2 comments to the blog post', function (done) {

            request(app)
                .put('/rest/blogpost/' + id)
                .set('Content-Type', 'application/json')
                .send(json({
                comments:[
                    {title:'Very Cool Thing You Have', body:'Do you like my body?'},
                    {title:'I dunno I\'m bored', body:'if you think i\'m sexy'}
                ]
            })).end(function (err, res) {
                    if (err)
                        console.log('ERROR', arguments);
                    res.should.have.status(200);
                    res.should.have.property('body');
                    res.body.should.have.property('payload');
                    res.body.payload.should.have.property('comments');
                    res.body.payload.comments.should.have.lengthOf(2);
                    cid = res.body.payload.comments[1]._id;
                    done();

                });

        });
        it('put comments[1] to the blogpost', function (done) {

            request(app)
                .put('/rest/blogpost/' + id+'/comments/1')
                .set('Content-Type', 'application/json')
                .send(json(
                        {title:'Yup', body:'Do you like my body?'}
                )).end(function (err, res) {
                    if (err)
                        console.log('ERROR', err.message, err.stack);

                    res.should.have.status(200);
                    res.should.have.property('body');
                    res.body.should.have.property('payload');
                    res.body.payload.should.have.property('comments');
                    res.body.payload.comments.should.have.lengthOf(2);
                    res.body.payload.comments[1].should.have.property('title', 'Yup');
                    cid = res.body.payload.comments[1]._id;

                    done();

                });

        });
        it('should be accessible from an url', function (done) {
            request(app).get('/rest/blogpost/' + id + '/comments/' + cid).end(function (err, res) {

                res.should.have.status(200);
                res.should.have.property('body');
                res.body.should.have.property('payload');
                res.body.payload.should.have.lengthOf(1);
                res.body.payload[0].should.have.property("_id", cid);
                done();
            });

        });
        it('should be accessible from an url with an index', function (done) {
            request(app).get('/rest/blogpost/' + id + '/comments/1').end(function (err, res) {

                res.should.have.status(200);
                res.should.have.property('body');
                res.body.should.have.property('payload');
                res.body.payload.should.have.lengthOf(1);
                res.body.payload[0].should.have.property("_id", cid);
                done();
            });

        });
        it('should be accessible from an url with an index and use a transformer', function (done) {
            request(app).get('/rest/blogpost/' + id + '/comments/1?transform=labelval').end(function (err, res) {


                res.should.have.status(200);
                res.should.have.property('body');
                res.body.should.have.property('payload');
                res.body.payload.should.have.lengthOf(1);
                res.body.payload[0].should.have.property("val", cid);
                done();
            });

        });
        it('should be accessible from an url with an index and use a transformer and single mode is false', function (done) {
            request(app).get('/rest/blogpost/' + id + '/comments/1?transform=labelval&single=false').end(function (err, res) {

                res.should.have.status(200);
                res.should.have.property('body');
                res.body.should.have.property('payload');
                res.body.payload.should.have.lengthOf(1);
                res.body.payload[0].should.have.property("val", cid);
                done();
            });

        });
        it('should be accessible from an url with an index and use a transformer and single mode is true', function (done) {
            request(app).get('/rest/blogpost/' + id + '/comments/1?transform=labelval&single=true').end(function (err, res) {

                res.should.have.status(200);
                res.should.have.property('body');
                res.body.should.have.property('payload');
                res.body.payload.should.have.property("val", cid);
                done();
            });

        });
        it('should be accessible from an url with an index and use a transform FUNCTION in the request', function (done) {
            request(app).get('/space/test/').end(function (err, res) {
                if (err)
                    console.log('ERROR', err, res.body);
                //res.should.be.json
                res.should.have.status(200);
                res.should.have.property('body');
                res.body.should.have.property('payload');
                res.body.payload[0].should.have.property("junk", true);
                done();
            });

        });
//        it('should be possible to populate comments', function (done) {
//            request(app).get('/rest/blogpost/' + id + '?populate[comments]=title,_id').end(function (res) {
//
//                res.should.have.status(200);
//                res.body.should.have.property('payload');
//                res.body.payload[0].should.have.property("_id");
//                res.body.payload[0].should.have.property("comments");
//                res.body.payload[0].comments[0].should.have.property("title", 'Very Cool Thing You Have');
//                done();
//            });
//
//        });
    });
    describe('DELETE /rest/blogpost/$id', function () {
        it('should delete the created blog posting', function (done) {
            request(app).del('/rest/blogpost/' + id).end(function (err, res) {

                res.should.have.status(200);
                res.should.have.property('body');
                res.body.should.have.property('status', 0);
                done();
            });
        });

        it('should be null because it was deleted', function (done) {
            request(app).get('/rest/blogpost/' + id).end(function (err, res) {

                res.should.have.status(200);
                res.should.have.property('body');
                //TODO - technically this should return null, however the get part can't really tell if the query is nothing or expecting a return changing this to ?single=true would fix it
                //res.body.should.have.property('payload').eql(null);
                res.body.should.have.property('status', 0);
                done();
            });
        });

    });
    describe('GET /rest/blogpost with search options', function () {
        var pids = [];
        it('sets up post A for testing', function (done) {
            createPost({title:'Post A', body:'A'}, function (e) {
                pids.push(e.payload._id);
                done();
            });
        });
        it('sets up post B for testing', function (done) {
            createPost({title:'Post B', body:'B'}, function (e) {
                pids.push(e.payload._id);
                done();
            });
        });
        it('sets up post C for testing', function (done) {
            createPost({title:'Post C', body:'C'}, function (e) {
                pids.push(e.payload._id);
                done();
            });
        });
        it('sets up post C for testing with date', function (done) {
            createPost({title:'Post C', date:new Date(150000000000)}, function (e) {
                pids.push(e.payload._id);
                done();
            });
        });

        it('should be able to skip and limit', function (done) {
            request(app).get('/rest/blogpost?skip=1&limit=1').end(function (err, res) {

                res.should.have.status(200);
                res.should.have.property('body');
                res.body.should.have.property('payload').with.lengthOf(1);
                res.body.payload[0].should.have.property('_id', pids[1]);
                done();
            });
        });
        it('should come back in reverse title order', function (done) {
            request(app).get('/rest/blogpost?sort=title:-1').end(function (err, res) {

                res.should.have.status(200);
                res.should.have.property('body');
                res.body.should.have.property('payload').with.lengthOf(4);
                res.body.payload[0].should.have.property('_id', pids[pids.length - 2]);
                done();
            });

        });
        it('2 should come back in reverse title order filtered by C', function (done) {
            request(app).get('/rest/blogpost?sort=title:-1,date:1&filter[title]=C').end(function (err, res) {

                res.should.have.status(200);
                res.should.have.property('body');
                res.body.payload.should.have.lengthOf(2);
                res.body.payload[0].should.have.property('date', '1974-10-03T02:40:00.000Z');
                done();
            });

        });
        it('2 should come back in reverse title order filtered by C in label in labelval form', function (done) {
            request(app).get('/rest/blogpost?sort=title:-1,date:1&filter[title]=C&transform=labelval').end(function (err, res) {

                res.should.have.status(200);
                res.should.have.property('body');
                res.body.payload.should.have.lengthOf(2);
                res.body.payload[0].should.have.property('label', 'Post C');
                res.body.payload[1].should.have.property('label', 'Post C');
                res.body.should.have.property('total', 4);
                res.body.should.have.property('filterTotal', 2);

                done();
            });

        });
        it('1 should come back in reverse title order filtered by -title=C and body=A', function (done) {
            request(app).get('/rest/blogpost?sort=title:-1,date:1&filter[-title]=C&filter[body]=A').end(function (err, res) {


                res.should.have.status(200);
                res.body.payload.should.have.lengthOf(1);
                res.body.payload[0].should.have.property('title', 'Post A');
             //   res.body.payload[1].should.have.property('label', 'Post B');
                res.body.should.have.property('total', 4);
                res.body.should.have.property('filterTotal', 1);

                done();
            });

        });

        it('should return post c ', function (done) {
            request(app).get('/rest/blogpost/finder/findTitleLike?title=c').end(function (err, res) {

                res.should.have.status(200);
                res.should.have.property('body');
                res.body.payload.should.have.lengthOf(2);
                res.body.payload[0].should.have.property('title', 'Post C');
                res.body.payload[1].should.have.property('title', 'Post C');
                res.body.should.have.property('total', 2);

                done();
            });
        })
        it('should return post c ', function (done) {
            request(app).get('/rest/blogpost/finder/findTitleLike?title=Post&filter[title]=C').end(function (err, res) {

                res.should.have.status(200);
                res.should.have.property('body');
                res.body.payload.should.have.lengthOf(2);
                res.body.payload[0].should.have.property('title', 'Post C');
                res.body.payload[1].should.have.property('title', 'Post C');
                res.body.should.have.property('total', 4);
                res.body.should.have.property('filterTotal', 2);
                done();
            });
        })
        it('should return post c using resty interface ', function (done) {
            request(app).get('/rest/blogpost/finder/findTitleLike/Post?filter[title]=C').end(function (err, res) {

                res.should.have.status(200);
                res.should.have.property('body');
                res.body.payload.should.have.lengthOf(2);
                res.body.payload[0].should.have.property('title', 'Post C');
                res.body.payload[1].should.have.property('title', 'Post C');
                res.body.should.have.property('total', 4);
                res.body.should.have.property('filterTotal', 2);
                done();
            });
        })

        describe('should handle errors without crashing when calling an invalid id', function () {
            it('should not crash', function (done) {
                request(app).get('/rest/blogpost/junk').end(function (err, res) {
                    res.should.have.status(200);
                    res.body.should.have.property('status', 1)
                    res.body.should.have.property('error');
                    done();
                });
            })
            it('should not crash', function (done) {
                request(app).get('/rest/blogpost/').end(function (err, res) {
                    res.should.have.status(200);

                    done();
                });
            })
        })

        describe('make a raw mongodb call', function () {
            it('should not crash', function (done) {
                request(app).get('/rest/blogpost/finder/findRaw').end(function (err, res) {
                    if (err)
                        console.log('err', err, res);
                    res.should.have.status(200);
                    res.body.should.have.property('status', 0)

                    done();
                });
            })

        })
    });
    var t = 0;

    function createPost(opts, cb) {
        if (!cb) {
            cb = opts;
            opts = { title:'Test ' + (t), body:'default body for ' + t}
            t++;
        }

        request(app)
            .post('/rest/blogpost')
            .set('Content-Type', 'application/json')
            .send(json(_u.extend({ date:new Date() }, opts))).end(
            function (err, res) {
                cb(res.body);
            });
    }

});
