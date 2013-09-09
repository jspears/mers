var mongoose = require('mongoose'),
    Schema = mongoose.Schema ;

var CommentSchema = new Schema({
    title:{type: String}, body: {type:String}
});


var BlogPostSchema = new Schema({
    title: String, body: String, comments: [CommentSchema]
});
var BlogPost = mongoose.model('BlogPost', BlogPostSchema);
var Comment = mongoose.model('Comment', CommentSchema);
var connection = mongoose.connection;
var blog = new BlogPost({
    title: 'Hello',
    body: 'goodbye',
    comments: [
        {title: 'Comment 1', body: 'Body Comment 1'},
        {title: 'Comment 2', body: 'Body Comment 2'}
    ]
});
/* new User({
 username:'hello',
 groups:[{groupName:'Yes'}, {groupName:'No'}]
 })*/
var id;
module.exports.setUp = function (done) {
    connection.on('open', function () {
        connection.db.dropDatabase(function () {
            console.log('dropped database [' + connection.name + ']');
            blog.save(function (err, obj) {
                console.log('all done with saving user', obj);
                id = obj._id;
                done();
            });
        });
    })
    mongoose.connect('mongodb://localhost/deepexample', function () {
        console.log('connected');

    });
}
module.exports.tearDown = function (done) {
    mongoose.disconnect(function () {
        console.log('disconnecting');
        done();

    });
}

module.exports['findById and update using set'] = function (test) {
    BlogPost.findOne({_id:id}, function (err, obj) {
        if (err) {
            console.log('err ' + id, err)
            test.done(err);
        }
//If you switch these two lines it works.
//       obj.comments[1].title = 'Nope';

        obj.set('comments.1', {title: 'Nope'})
        obj.save(function (err, obj) {
            if (err) {
                console.log('Error', err.message, err.stack);
                test.ok(false);
                return test.done();
            }
            console.log('got', obj);
            test.equals(obj.comments[1].title, 'Nope');
            test.done();

        })
    })

}