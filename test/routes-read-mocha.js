process.env.NODE_ENV = 'test';
require('should');
var request = require('./support/http'), assert = require('assert'), mongoose, _u = require('underscore'), json = JSON.stringify;
var app;
var d = 0;
var pids = [];

var data = [
    {title: 'Post A', body: 'A'},
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

describe('read only mers routes', function () {
    var connection;
    this.timeout(50000);
    before(function onBefore(done) {
        console.log('before routes-mocha');
        var mongoose = connection = require('mongoose').createConnection();
        app = require('../example/server.js')(mongoose);
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
        mongoose.open('mongodb://localhost/routes-mocha-read');
    });
    after(function onAfter(done) {
        connection.on('disconnected', function () {
            done();
        });
        connection.close();

    });

    it('should allow for nested arrays of things', function (done) {
        request(app).get('/rest/blogpost/' + data[5]._id + '/comments/0/posts/1/posts/0').end(function (err, resp) {
            console.log(resp.body);
            resp.body.should.have.property('payload');
            resp.body.payload.should.have.property('body', 'world3-3');
            done();
        })
    });
    it('make a raw mongodb call should not crash', function (done) {
        request(app).get('/rest/blogpost/finder/findRaw').end(function (err, res) {
            if (err) {
                console.log('err', err, res);
                return done(err);
            }
            res.should.have.property('statusCode', 200);
            res.body.should.have.property('status', 0)

            done();
        });
    });

    describe('GET /rest/blogpost with search options', function () {
        it('should be able to skip and limit', function (done) {
            request(app).get('/rest/blogpost?skip=1&limit=1').end(function (err, res) {

                res.should.have.property('statusCode', 200);
                res.should.have.property('body');
                res.body.should.have.property('payload').with.lengthOf(1);
                //    res.body.payload[0].should.have.property('_id', pids[1]);
                done();
            });
        });


        describe('should handle errors without crashing when calling an invalid id', function () {
            it('should not crash with invalid id', function (done) {
                request(app).get('/rest/blogpost/junk').end(function (err, res) {
                    res.should.have.property('statusCode', 200);
                    res.body.should.have.property('status', 1)
                    res.body.should.have.property('error');
                    done();
                });
            })
            it('should not crash with null end', function (done) {
                request(app).get('/rest/blogpost/').end(function (err, res) {
                    res.should.have.property('statusCode', 200);

                    done();
                });
            })
        })


        describe('it should be accessible', function () {
            it('should be accessible from an url with an index', function (done) {
                request(app).get('/rest/blogpost/' + data[5]._id + '/comments/1').end(function (err, res) {

                    res.should.have.property('statusCode', 200);
                    res.should.have.property('body');
                    res.body.should.have.property('payload');

                    res.body.payload.should.have.property("body", 'comment2');
                    done();
                });

            });
            it('should be accessible from an url with an index and use a transformer', function (done) {
                request(app).get('/rest/blogpost/' + data[5]._id + '/comments/1?transform=labelval').end(function (err, res) {


                    res.should.have.property('statusCode', 200);
                    res.should.have.property('body');
                    res.body.should.have.property('payload');

                    res.body.payload.should.have.property("label", 'comment 2');
                    done();
                });

            });
            it('should be accessible from an url with an index and use a transformer and single mode is false', function (done) {
                request(app).get('/rest/blogpost/' + data[5]._id + '/comments/1?transform=labelval&single=false').end(function (err, res) {

                    res.should.have.property('statusCode', 200);
                    res.should.have.property('body');
                    res.body.should.have.property('payload');
                    res.body.payload.should.have.property('length');
                    //    res.body.payload[0].should.have.property("val", cid);
                    done();
                });

            });
            it('should be accessible from an url with an index and use a transformer and single mode is true', function (done) {
                request(app).get('/rest/blogpost/' + data[5]._id + '/comments/1?transform=labelval&single=true').end(function (err, res) {

                    res.should.have.property('statusCode', 200);
                    res.should.have.property('body');
                    res.body.should.have.property('payload');
                    done();
                });

            });
            it('should be accessible from an url with an index and use a transform FUNCTION in the request', function (done) {
                request(app).get('/space/test/').end(function (err, res) {
                    if (err)
                        console.log('ERROR', err, res.body);
                    //res.should.be.json
                    res.should.have.property('statusCode', 200);
                    res.should.have.property('body');
                    res.body.should.have.property('payload');
                    res.body.payload[0].should.have.property("junk", true);
                    done();
                });

            });

        });
        it('should be able to skip and limit', function (done) {
            request(app).get('/rest/blogpost?skip=1&limit=1').end(function (err, res) {

                res.should.have.property('statusCode', 200);
                res.should.have.property('body');
                res.body.should.have.property('payload').with.lengthOf(1);
                //    res.body.payload[0].should.have.property('_id', pids[1]);
                done();
            });
        });
        it('should come back in reverse title order', function (done) {
            request(app).get('/rest/blogpost?sort=title:-1').end(function (err, res) {

                res.should.have.property('statusCode', 200);
                var body = res.body.should.have.property('payload').obj;
                res.body.should.have.property('payload').with.lengthOf(6);
                var id = data[data.length - 1]._id;
                body[0].should.have.property('_id', id);
                done();
            });

        });
        it('2 should come back in reverse title order filtered by C', function (done) {
            request(app).get('/rest/blogpost?sort=title:-1,date:1&filter[title]=C').end(function (err, res) {

                res.should.have.property('statusCode', 200);
                res.should.have.property('body');
                res.body.payload.should.have.lengthOf(2);
                res.body.payload[0].should.have.property('date');

                done();
            });

        });
        it('2 should come back in reverse title order filtered by C in label in labelval form', function (done) {
            request(app).get('/rest/blogpost?sort=title:-1,date:1&filter[title]=C&transform=labelval').end(function (err, res) {

                res.should.have.property('statusCode', 200);
                res.should.have.property('body');
                res.body.payload.should.have.lengthOf(2);
                res.body.payload.should.matchEach(function (v) {
                    return /Post C/.test(v.label);
                })
                //      res.body.should.have.property('total', 4);
                res.body.should.have.property('filterTotal', 2);

                done();
            });

        });
        it('1 should come back in reverse title order filtered by -title=C and body=A', function (done) {
            request(app).get('/rest/blogpost?sort=title:-1,date:1&filter[body]=A').end(function (err, res) {


                res.should.have.property('statusCode', 200);
                res.body.payload.should.have.lengthOf(1);
                res.body.payload[0].should.have.property('title', 'Post A');
                //   res.body.payload[1].should.have.property('label', 'Post B');
                res.body.should.have.property('total', 6);
                res.body.should.have.property('filterTotal', 1);

                done();
            });

        });

        it('should return post c ', function (done) {
            request(app).get('/rest/blogpost/finder/findTitleLike?title=c').end(function (err, res) {

                res.should.have.property('statusCode', 200);
                res.should.have.property('body');
                res.body.payload.should.have.lengthOf(2);
                res.body.payload.should.matchEach(function (v) {
                    return /Post C/.test(v.title);
                })
                res.body.should.have.property('total', 2);

                done();
            });
        })
        it('should return post c and filter by title', function (done) {
            request(app).get('/rest/blogpost/finder/findTitleLike?title=Post&filter[title]=C').end(function (err, res) {

                res.should.have.property('statusCode', 200);
                res.should.have.property('body');
                res.body.payload.should.have.lengthOf(2);
                res.body.payload.should.matchEach(function (v) {
                    return /Post C/.test(v.title);
                })

                //TODO - Fix and reenable
                //  res.body.should.have.property('total', 6);
                // res.body.should.have.property('filterTotal', 2);
                done();
            });
        })
        it('should return post c using resty interface ', function (done) {
            request(app).get('/rest/blogpost/finder/findTitleLike/Post?filter[title]=C').end(function (err, res) {

                res.should.have.property('statusCode', 200);
                res.should.have.property('body');
                res.body.payload.should.have.lengthOf(2);
//                res.body.payload[0].should.title.should('title', 'Post C');
//                res.body.payload[1].should.have.property('title', 'Post CD');
                res.body.payload.should.matchEach(function (v) {
                    return /Post C/.test(v.title);
                })
                done();
            });
        })
    });
});