var app = require('./server');
var conn = app.locals.mers.conn;
var Post = conn.model('BlogPost');
var Comment = conn.model('Comment');
var i=0;
function newpost(next){
  new Post({
	title:"Post "+(i++),
        body:'My fine body',
        date:new Date(Date.now() - (i * 864000000)),
        comments:[
		{ title:'Comment'+(i++) }

        ]
   }).save(next);  
}
conn.collections.blogposts.drop(function(){
newpost(newpost(newpost))
});
app.listen(3001);

console.log("Express server listening on port 3001 in %s mode", app.settings.env);
