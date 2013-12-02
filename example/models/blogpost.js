var mongoose = require('mongoose'), Schema = mongoose.Schema, CallbackQuery = require('../../lib/callback-query');
ObjectId = mongoose.Schema.ObjectId;

var CommentSchema = new Schema({
    title:String, body:String, comment:String, date:Date
});


var BlogPostSchema = new Schema({
    title: {
        type: String,
        match: new RegExp('^.{3,}$')
    },
    body:String,
    buf: Buffer,
    date: Date,
    comments: [CommentSchema],
    meta:{
        votes:Number, favs:Number
    }
});
/**
 * Note this must return a query object.   If it doesn't well, I dunno what it'll do.
 * @param q
 * @param term
 */
BlogPostSchema.statics.findTitleLike = function findTitleLike(q, term) {
    var search = term || q && q.title;
    if (!search)
        return this.find({_id:null});


    return this.find({title:new RegExp(search, 'i')});
}

BlogPostSchema.methods.findCommentsLike = function (q, term) {
    var search = term || q.title;
    return this.find({comments:new RegExp(search, 'i')});
}

/**
 * Shows how to create a raw mongodb query and use it within mers.  This
 * could also be used to use a non mongodb data source.
 * @param q
 * @return {Function}
 */
BlogPostSchema.statics.findRaw = function onFindRaw(q) {
    var collection = this.collection;
    return new CallbackQuery(function (cb) {
        collection.find(function (err, cursor) {
            if (err) return cb(err);
            cursor.toArray(function (err, docs) {
                cb(err, docs);
            });
        });

    });
}
/**
 * This is just an example, if this proves useful, may make it part of mers.
 * @param q
 * @param collection
 * @constructor
 */

var Comment = module.exports.Comment = mongoose.model('Comment', CommentSchema);
var BlogPost = module.exports.BlogPost = mongoose.model('BlogPost', BlogPostSchema);
