var test = require('tape');
var response = require('./response.js');
var helpers = require('./helpers.js');

test('should be able to get info about a user', function(assert) {
    var test_get_user = function(settings, callback) {
        response.get('auth/user/test_user/', response.test_user);

        settings.getUser('test_user', function(err, user) {
                assert.false(err, "No error expected");
                assert.deepEqual(user, response.test_user.Environments);
                callback();
            }
        );
    };

    helpers.newSettings(test_get_user);
    helpers.autoLogsIn(assert, test_get_user);
});

test('should be able to create a user', function(assert) {
    var test_create_user = function(settings, callback) {
        response.post('auth/user/user2/', response.ok, {passhash: ''});
        settings.createUser('user2', '', callback);
    };

    helpers.newSettings(test_create_user);
    helpers.autoLogsIn(assert, test_create_user);
});

test('should be able to update your own password', function(assert) {
    var test_update_password = function(settings, callback) {
        response.put('auth/user/'+helpers.hostname+'/', {passhash: ''});
        settings.updatePassword('', callback);
    };

    helpers.newSettings(test_update_password);
    helpers.autoLogsIn(assert, test_update_password);
});

test('should be able to delete user', function(assert) {
    var test_delete_user = function (settings, callback) {
        response.delete('auth/user/user2/');
        settings.deleteUser('user2', callback);
    };

    helpers.newSettings(test_delete_user);
    helpers.autoLogsIn(assert, test_delete_user);
});