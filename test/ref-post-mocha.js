var mmongoose = require('mongoose'),
    Schema = mmongoose.Schema,
    OID = mmongoose.Types.ObjectId,
    express = require('express'),

    rest = require('../index'),
    request = require('./support/http'),
    mongoose = require('mongoose'),
    should = require('should'),
    Schema = mongoose.Schema,
    json = JSON.stringify,
    compat = require('../lib/compat'),

    Promise = require('mongoose/node_modules/mpromise'),
    promise = function () {
        return new Promise();
    };
OID.prototype.cast = function (v) {
    return v._id || v;
}
var EmployeeSchema = new Schema({
    firstname: {
        type: String,
        required: true,
        trim: true
    },
    age:Number
});
var GroupSchema = new Schema();

GroupSchema.add({
    name: String,
    employees: [
        {
            type: OID, ref: 'Employee', caster: function (val) {
            return val;
        }
        }
    ]
})

var mongoose = mmongoose.createConnection();
var Employee = mongoose.model('Employee', EmployeeSchema), Group = mongoose.model('Group', GroupSchema), d1;
function makeApp() {
    app = express();
    app.use(compat.bodyParser());
    app.use('/rest', rest({mongoose: mongoose}).rest())
}
var connected = false, group, group2, e1;
function insert(done) {
    group = new Group({
        name: 'my group'

    }), e1 = new Employee({firstname: 'Bobby', age:33});
    e1.save(function () {
        group.save(function () {
            group2 = new Group({name: 'group2', employees: e1._id});
            group2.save(function () {
                done();
            })
        });
    })

}

describe('testing nested refs', function () {

    before(function NestedPostTest$onBefore(done) {
        makeApp();

        console.log('nested-post onBefore');
        mongoose.on('connected', function () {
            mongoose.db.dropDatabase(function () {
                insert(done);
            })
        });
        mongoose.open('mongodb://localhost/nested_post_test')
    });

    after(function NestedPostTest$onAfter(done) {
        mongoose.on('disconnected', function () {
            done();
        })
        mongoose.close();

    });
    it('should post', function (done) {
        console.log('finding ' + group._id);
        request(app)
            .post('/rest/Group/' + group._id + '/employees')
            .set('Content-Type', 'application/json')
            .send(json({"firstname": "Richard"})).expect(200).end(function (err, res) {
                res.body.should.have.property('status', 0);
                var opayload = res.body.should.have.property('payload').obj;
                opayload.should.have.property('firstname', 'Richard');
                opayload.should.have.property('_id');
                request(app).get('/rest/employee/' + opayload._id).set('Content-Type', 'application/json').end(function (err, res) {
                    if (err) return done(err);
                    var payload = res.body.should.have.property('payload').obj;
                    payload.should.have.property('firstname', 'Richard');
                    payload.should.have.property('_id', opayload._id);
                    done();
                });
            })
    });
    it('should put', function (done) {
        request(app)
            .put('/rest/Group/' + group2._id + '/employees/0')
            .set('Content-Type', 'application/json')
            .send(json({"firstname": "Brown"})).expect(200).end(function (err, res) {
                res.body.should.have.property('status', 0);
                var opayload = res.body.should.have.property('payload').obj;
                opayload.should.have.property('firstname', 'Brown');
                opayload.should.have.property('_id');
                opayload.should.have.property('age', 33);

                done();
            })
    })

});
