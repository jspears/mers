var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    objectId = mongoose.Schema.ObjectId,
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
var Employee, Department, d1;
var connection = mongoose.connection;
function connect(done){
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use('/rest', rest({ mongoose:mongoose }).rest())
    Employee = mongoose.model('Employee', EmployeeSchema);
    Department = mongoose.model('Department', DepartmentSchema);
    var e1 = new Employee({firstname:'John'}), e2 = new Employee({firstname:'Bob'});
    d1 = new Department({name:'HR', employees:[e1,e2]});
    d1.save(done);

}
module.exports.setUp = function (done) {
    mongoose.connect('mongodb://localhost/post_deep')
    connection.on('open', function () {
        connection.db.dropDatabase(function () {
            console.log('dropped database [' + connection.name + ']');
            connect(done);
        });
    })

}
module.exports.tearDown = function(done){
    mongoose.disconnect(function(){
        console.log('disconnecting');
        done();
        setTimeout(function(){
        process.exit(0);
        }, 200);
    });
}
module.exports.testPut = function (test) {
    console.log('/rest/Department/'+d1._id+'/employees');
    request(app)
        .put('/rest/Department/'+d1._id+'/employees')
        .set('Content-Type', 'application/json')
        .send(json({"firstname":"Richard"})).expect(200).end(function (err, res) {
            console.log('response', err, res);
            res.body.should.have.property('status', 0);
            var payload = res.body.should.have.property('payload').obj;
            payload.should.have.property('employees');
            test.done();

        })
};
