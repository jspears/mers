var mongoose = require('mongoose'), Promise = require('bluebird');

function Setup(opts) {
    opts = opts || {};
    this.name = opts.name;
    var self = this;
    this.setup = function () {
        return self.drop().then(function () {
            self.open();
            return self.loadModelsAsync(opts.models);
        });
    }
    this.teardown = function () {
        return self.closeAsync();
    }

}

Setup.prototype = Promise.promisifyAll({
    drop: function (cb) {
        this.connection = mongoose.createConnection();

        connection.on('connected', function () {
            connection.db.dropDatabase(function () {
                done();
            });
        });
    },

    open: function (name) {
        var connection = this.connection;
        if (connection.readyState === 1) connection.close();
        connection.open('mongodb://localhost/test-mocha-' + name);
        return connection;
    },
    close: function (connection, done) {
        this.connection.on('close', function () {
            done();
        });
        this.connection.close();
    },
    loadModels: function (cb) {
        var models = opts.models, connection = this.connection;
        var resolve = {}
        Object.keys(models).forEach(function (k) {
            var Model = connection.model(k);
            resolve[k] = Promise.all((Array.isArray(models[k]) ? models[k] : [models[k]]).map(function (d) {
                var m = new Model(d);
                return Promise.promisify(m.save, m);
            }));
        });
        return Promise.map(resolve);
    }
})
;