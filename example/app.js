var app = require('./server');
app.listen(3001);
console.log("Express server listening on port 3001 in %s mode", app.settings.env);
