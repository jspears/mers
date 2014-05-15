var mongoose = require('mongoose'),
    Schema = mongoose.Schema ;

var CommentSchema = new Schema({
    title:{type: String}, body: {type:String}
});


var BlogPostSchema = new Schema({
    title: String, body: String, comments: [CommentSchema]
});
module.exports.BlogPost = mongoose.model('BlogPost', BlogPostSchema);
module.exports.Comment = mongoose.model('Comment', CommentSchema);
