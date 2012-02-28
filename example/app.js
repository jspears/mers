var app = require('./server');
app.listen(3001);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
