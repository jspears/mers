#Mers
 *_Mongoose
 *_Express
 *_Rest
 *_Service
 
    Mers is a plugin for express to expose mongoose finders as simple crud/rest operations.  The
    basic idea being you should just define your model/finders and the rest should be be magic.


## Usage [usage]
```javascript
    var mers = require('mers');
    app.use('/rest', mers({uri:'mongodb://localhost/rest_example_prod'}).rest());
```
Configuration options include:
* `uri:uri://mongoose`  (as shown above)
* `mongoose:mongoose` (your mongoose instance)
* `[error][error]:function` (your custom error handler)
* `responseStream:function` (your custom respost stream. See: lib/streams.js)
* `transformer:function` (your custom transformer factory)


###If you had a schema such as
   ```javascript
var mongoose = require('mongoose'), Schema = mongoose.Schema,
    ObjectId = mongoose.Schema.ObjectId;

var CommentSchema = new Schema({
    title:String, body:String, date:Date
});


var BlogPostSchema = new Schema({
    author:ObjectId, title:String, body:String, buf:Buffer, date:Date, comments:[CommentSchema], meta:{
        votes:Number, favs:Number
    }
});
/**
 * Note this must return a query object.   If it doesn't well, I dunno what it'll do.
 * @param q
 * @param term
 */
BlogPostSchema.statics.findTitleLike = function findTitleLike(q, term) {
    return this.find({'title':new RegExp(q.title || term, 'i')});
}
var Comment = module.exports.Comment = mongoose.model('Comment', CommentSchema);
var BlogPost = module.exports.BlogPost = mongoose.model('BlogPost', BlogPostSchema);
```

you could then access it at
    listing.
    
    http://localhost:3000/rest/blogpost/
    http://localhost:3000/rest/blogpost/$id
    http://localhost:3000/rest/blogpost/$id/comments
    http://localhost:3000/rest/blogpost/$id/comments/$id
    http://localhost:3000/rest/blogpost/$id/comments/0
    http://localhost:3000/rest/blogpost/finder/findTitleLike/term
    
    
###Pagination
Pagination is also supported via skip= and limit= query params.

    http://localhost:3000/rest/blogpost/$id?skip=10&limit=10

###Population
Mongoose populate is supported, but this will be changing shortly to allow for more
fine grained controll over population.  Currently you can do

    http://localhost:3000/rest/blogpost?populate=comments

or to specify particular fields.

    http://localhost:3000/rest/blogpost?skip=10&populate[comments]=title,date



###Filter
Filtering is available for strings. To find all the blog posts with C in the title.

    http://localhost:3000/rest/blogpost?filter[title]=C

Also you can and or nor the filters by using + (and) - (nor)  or nothing or
    http://localhost:3000/rest/blogpost?filter[-title]=C
    http://localhost:3000/rest/blogpost?filter[+title]=C&filter[-body]=A



To filter all String fields that have a C in them

    http://localhost:3000/rest/blogpost?filter=C


###Sorting
Sorting is supported 1 ascending -1 ascending.

  http://localhost:3000/rest/blogpost?sort=title:1,date:-1

###Transformer
Transformers can be registered on startup.  A simple TransformerFactory is
included.  If the function returns a promise, it will resolve the transformer
asynchronously.   The transformers follow the same injection rules.

To transform asynchronously just return a promise from your function.  You can
chain transformers.  Transformers can also inject, but the first argument should
be the object you want to transform.


```javascript

app.use('/rest', require('mers').rest({
    mongoose:mongoose,
    transformers:{
           renameid: function(obj){
                obj.id = obj._id;
                delete obj._id;
                //don't forget to return the object.  Null will filter it from the results.
                return obj;
           },
           /**
            Injects the user into the function, and checks if the
            owner is the same as the current user.  Works with passport.
           */
           checkUser:function(obj, session$user){
              if (obj.owner_id !== session$user._id){
                //returning null, short circuits the other transformers. And will
                //not be included in the response.
                return null;
              }else{
               return obj;
              }

           },
           /**
             Uses injection and async resolution.
           */
           async:function(obj, query$doIt){
             if (query$doIt){
                var p = promise();
                setTimeout(function(){
                    obj.doneIt =true;
                    //Mpromise resolve.  Should work with other promises, or any object with a then function.
                    p.resolve(null, obj);
                },50);
                return p;
             }else{
             return objl
             }

           }
      }
    }));
}
```



to get results transformered just add

     http://localhost:3000/rest/blogpost?transform=renameid



It handles  get/put/post/delete I'll add some docs on that some day, but pretty much as you expect, or I expect anyways.
see tests/routes-mocha.js for examples.

###Static Finders
It should also be able to be used with Class finders. Now handles class finders. Note: They must return  a query object.
They are passed the query object and the rest of the url. All of the populate's, filters, transforms should work.

```javascript

/**
 * Note this must return a query object.
 * @param q
 * @param term
 */
BlogPostSchema.statics.findTitleLike = function findTitleLike(q, term) {
    return this.find({'title':new RegExp(q.title || term, 'i')});
}
```

So you can get the url


```
http://localhost:3000/rest/blogpost/finder/findTitleLike?title=term
```

or

```
http://localhost:3000/rest/blogpost/finder/findTitleLike/term
```

#### Callbacks with finders
Occassionally you may want to do something like a double query within a finder.   Mers has got your back.

```javascript
   BlogPostSchema.statics.findByCallback = function onFindByCallback(q) {
        var self = this, id = q.id;
        //Note pass the callback into exec, this is a typical mongoose function(err, success);
        return function onFindByCallback$Callback(cb) {
            self.findById(id).exec(cb);
        }
    }

```


### [Error Handling][error]
To create a custom error handler

```javascript

   app.use('/rest, rest({
         error : function(err, req, res, next){
               res.send({
                   status:1,
                   error:err && err.message
               });
           }).rest());

```

### Custom Transformers
You can transform your results by adding a custom transformer and or adding a new TransformerFactory

```javascript

   app.use('/rest, rest({
         transformers :{
          cooltranform:function(Model, label){
             return function(obj){
                    obj.id = obj._id;
                    delete obj._id;
                    return obj; //returning null removes it from the output
             }
          } }).rest());

```

### Selecting
Selecting support is upcoming, but for now you can do it in finders

```javascript
 var User = new Schema({
   username:String,
   birthdate:Date
 });
 User.statics.selectJustIdAndUsername  = function(){
  this.find({}).select('_id username');
 }

```


### Custom ResultStream
You can create your own result stream. It needs to subclass Stream and be writable.  This can allow
for other formats, and preventing the wrapping of data in the payload.


##Method
You can invoke a method on a model.  This useful to expose more complicated things
that can't just be filtered.   Of course you can return nested nestings too...


###Returning an Object
This one just returns an object, from /department/<id>/hello

```javascript
DepartmentSchema.methods.hello = function DepartmentSchema$hello(){
    return {name:'hello '+this.name};
}
```

###Returning a Promise.
This is returns a promise from /department/<id>/promises.  Really you just
need to return an object with an then function.  So any promise library should work.

```javascript
DepartmentSchema.methods.promises = function (data){
    var p = promise();
    setTimeout(p.resolve.bind(p, null, {name:'hello '+this.name}), 100);
    return p;
}
```

### Returning a Query object.
This is returns a query from /department/<id>/superDo

```javascript
DepartmentSchema.methods.superDo = function DepartmentSchema$hello(data){
   return Department.find({
       _id:this._id
   });
}
```

##Examples.
An example of a customized rest service can be found at

    https://github.com/jspears/backbone-directory


##Parameter injection
When invoking a method you often need data from the request to process.  To do this
we have an injection system.   

It resolves the prefix of the parameter name deliminated by $ to the scope.  The built in resolvers are
session,
param,
query,
body,
args,
require

```
url: http://localhost/rest/department/finders/byName?name=Stuff
```


```javascript
DepartmentSchema.static.byName = function DepartmentSchema$hello(query$name){
   return Department.find({
        name:query$name
       });
}
```

works on instances to...

```
url: http://localhost/rest/department/<id>/hello/?name=STuff
```


```javascript
DepartmentSchema.method.hello = function DepartmentSchema$hello(query$name, session$user){
    //session.user === session$user
   return Department.find({
        name:query$name
       });
       
}
```


