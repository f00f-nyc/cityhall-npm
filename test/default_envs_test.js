var test = require('tape');
var response = require('./response.js');
var helpers = require('./helpers.js');

test('logout works', function(assert) {
   helpers.newSettings(function(settings) {
       response.delete('auth/');

       settings.logout(function() {
           assert.notok(settings.isLoggedIn(), "user shouldn't be logged in anymore");
           assert.end();
       });
   });
});

test('logout twice is no-op', function(assert) {
    helpers.newSettings(function(settings) {
        response.delete('auth/');

        settings.logout(function(err, data) {
            assert.false(err, "No error expected");
            settings.logout(response.error);
            assert.end();
        });
    });
});

test('user should be able to set default environment', function(assert) {
    var test_set_default_environment = function (settings, callback) {
        response.post('auth/user/'+helpers.hostname+'/default/', response.ok, {env: 'qa'});

        settings.setDefaultEnvironment('qa', function (err, data) {
                assert.false(err, "No error expected");

                assert.ok(settings.isLoggedIn(), 'user should be logged in');
                assert.equals('qa', settings.defaultEnvironment());
                callback();
            }
        );
    };

    helpers.newSettings(test_set_default_environment);
    helpers.autoLogsIn(assert, test_set_default_environment);
});

test('error from server is handled', function(assert) {
   helpers.newSettings(function(settings) {
      response.post('auth/user/'+helpers.hostname+'/default/', response.not_ok);
       settings.setDefaultEnvironment('qa', function(err, data) {
               assert.equals(response.not_ok.Message, err);
               assert.end();
           }
       );
   });
});

test('no default environment fails gracefully', function(assert) {
    response.post('auth/', response.ok);
    response.get('auth/user/'+helpers.hostname+'/default/', response.value(null));

    var settings = require('../index.js')(response.url);
    settings.login(function(err, data) {
        assert.false(err, "No error expected");
        assert.equals('', settings.defaultEnvironment());
        assert.end();
    });
});