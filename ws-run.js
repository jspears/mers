var Mocha = require('mocha'),
    path = require('path'),
    fs = require('fs');

var mocha = new Mocha({
    reporter: 'dot',
    ui: 'bdd',
    timeout: 999999
});

var testDir = './test';

var mochaRe = /.*-mocha\.js$/;
fs.readdir(testDir, function (err, files) {
    if (err) {
        console.log(err);
        return;
    }
    files.forEach(function (file) {
        if (mochaRe.test(file)) {
            console.log('adding test file: %s', file);
            mocha.addFile(path.join(testDir , file));
        }
    });

    var runner = mocha.run(function () {
        console.log('finished');
    });

    runner.on('pass', function (test) {
        console.log('... %s passed', test.title);
    });

    runner.on('fail', function (test) {
        console.log('... %s failed', test.title);
    });
});

