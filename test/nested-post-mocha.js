var mmongoose = require('mongoose'),
    Schema = mmongoose.Schema,
    objectId = mmongoose.Schema.ObjectId,
    express = require('express'),
    rest = require('../index'),
    request = require('./support/http'),
    mongoose = require('mongoose'),
    should = require('should'),
    Schema = mongoose.Schema,
    json = JSON.stringify,
    app = express();

var EmployeeSchema = new Schema({
    firstname: {
        type: String,
        required: true,
        trim: true
    }});

var DepartmentSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        index: {
            unique: true
        }
    },
    employees: [EmployeeSchema]
});
var mongoose = mmongoose.createConnection();
var Employee = mongoose.model('Employee', EmployeeSchema), Department = mongoose.model('Department', DepartmentSchema), d1;

app.use(express.bodyParser());
app.use(express.methodOverride());
app.use('/rest', rest({ mongoose: mongoose }).rest())
var connected = false;
function insert(done) {
    new Department({name: 'HR', employees: [new Employee({firstname: 'John'}), new Employee({firstname: 'Bob'})]}).save(function (e, o) {
        d1 = o;
        done();
    });
}

before(function onBefore(done) {
    console.log('nested-post onBefore');
    mongoose.on('connected', function(){
        mongoose.db.dropDatabase(function(){
            insert(done);
        })
    });
    mongoose.open('mongodb://localhost/nested_post_test')
});

describe('testing nested', function () {
    it('should post', function (done) {
        console.log('finding ' + d1._id);
        request(app)
            .post('/rest/Department/' + d1._id + '/employees')
            .set('Content-Type', 'application/json')
            .send(json({"firstname": "Richard"})).expect(200).end(function (err, res) {
                console.log('response', err, res);
                res.body.should.have.property('status', 0);
                var payload = res.body.should.have.property('payload').obj;
                payload.should.have.property('firstname', 'Richard');
                payload.should.have.property('_id');
                done();
            })
    })
});
