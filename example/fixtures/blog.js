var _id = require('mongodb').BSONNative.ObjectID;
var c1 = {
        title: 'Not Bad',
        _id: _id()
    },
    c2 = {
        title: 'Really Bad',
        _id: _id()
    },
    c3 = {
        title: 'So So',
        _id: _id()
    };

exports.BlogPost = [
    {
        title: 'Really Nice',
        body: 'Body is presented here',
        date: new Date('2013-12-31T17:42:56.156Z'),
        comments: [ c1, c2],
        meta: {
            votes: 10,
            favs: 4
        }
    },
    {
        title: 'Really Not Nice',
        body: 'Body is presented here',
        date: new Date('2013-12-30T15:42:56.156Z'),
        comments: [ c1, c2],
        meta: {
            votes: 1,
            favs: 41
        }
    },
    {
        title: 'I\'m ok your ok',
        body: 'Body is presented here',
        date: new Date('2013-11-30T17:42:56.156Z'),
        comments: [ c1, c2],
        meta: {
            votes: 0,
            favs: 0
        }
    }


];

exports.Comment = [c1, c2, c3];