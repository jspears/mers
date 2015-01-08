var w = require('../lib/when');
describe('mpromise spec', function(){

    it('should not call the success handler when failed', function(done){
        var p = w.promise();
        p.resolve(1);
        var failed;
        p.then(function(o){
            failed = new Error('should not be executed');
        }, function(e){
            failed = false;
        });

        setTimeout(function(){
            if (failed){
                done(failed);
            }else if (failed === false){
                done();
            }else{
                done(new Error("should not execute"));
            }
        }, 500);
    })

})