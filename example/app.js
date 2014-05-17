
var connection = require('mongoose').createConnection('mongodb://localhost/rest_example_rest', function (db) {
    require('pow-mongoose-fixtures').load(__dirname + '/fixtures', connection);
    var app = require('./server')(connection);

    app.listen(3001);

    console.log("Express server listening on port 3001 in %s mode", app.settings.env);
});


