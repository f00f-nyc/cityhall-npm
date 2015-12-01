var test = require('tape');
var response = require('./response.js');
var helpers = require('./helpers.js');

test('user should be able to get environment details', function(assert) {

    var test_get_env_details = function(settings, callback) {
        response.get('auth/env/dev/', response.dev_environment);

        settings.viewUsers('dev', response.error, function(env) {
            assert.deepEqual(env, response.dev_environment.Users);
            callback();
        });
    };

    helpers.newSettings(test_get_env_details);
    helpers.autoLogsIn(assert, test_get_env_details);
});

test('user should be able to create environment', function(assert) {
    var test_user_create_env = function (settings, callback) {
        response.post('auth/env/qa/', response.ok);
        settings.createEnvironment('qa', response.error, callback);
    };

    helpers.newSettings(test_user_create_env);
    helpers.autoLogsIn(assert, test_user_create_env);
});