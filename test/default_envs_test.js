var test = require('tape');
var response = require('./response.js');
var helpers = require('./helpers.js');

test('logout works', function(assert) {
   helpers.newSettings(function(settings) {
       response.delete('auth/');

       settings.logout(response.error, function() {
           assert.notok(settings.isLoggedIn(), "user shouldn't be logged in, anymore");
           assert.end();
       });
   });
});

test('logout twice is no-op', function(assert) {
    helpers.newSettings(function(settings) {
        response.delete('auth/');

        settings.logout(response.error, function() {
            settings.logout(response.error, response.error);
            assert.end();
        });
    });
});

test('not logged in will log in', function(assert) {
    response.post('auth/', response.ok);
    response.get('auth/user/'+helpers.hostname+'/default/', response.value('dev'));
    response.post('auth/user/'+helpers.hostname+'/default/', response.ok, {env: 'qa'});

    var settings = require('../index.js')(response.url);
    settings.setDefaultEnvironment(
        'qa', response.error,
        function () {
            assert.ok(settings.isLoggedIn(), 'should be automatically logged in');
            assert.equals('qa', settings.defaultEnvironment());
            assert.end();
        }
    );
});

test('error from server is handled', function(assert) {
   helpers.newSettings(function(settings) {
      response.post('auth/user/'+helpers.hostname+'/default/', response.not_ok);
       settings.setDefaultEnvironment(
           'qa',
           function(err) {
               assert.equals(response.not_ok.Message, err);
               assert.end();
           },
           response.error
       );
   });
});