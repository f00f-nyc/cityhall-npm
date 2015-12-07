var test = require('tape');
var response = require('./response.js');
var helpers = require('./helpers.js');

test('rights are validated before being called with', function(assert) {
    helpers.newSettings(function (settings) {
        settings.grant(undefined, undefined, undefined, function (data) {
            assert.equals('rights are undefined', data);
        }, response.error);
        settings.grant(undefined, undefined, settings.Rights.None-1, function (data) {
            assert.equals('rights out of range: -1', data);
        }, response.error);
        settings.grant(undefined, undefined, settings.Rights.Grant+1, function (data) {
            assert.equals('rights out of range: 5', data);
        }, response.error);
        settings.grant(undefined, 'dev', settings.Rights.Read, function (data) {
            assert.equals('user is undefined', data);
        }, response.error);
        settings.grant('user2', undefined, settings.Rights.Read, function (data) {
            assert.equals('environment is undefined', data);
        }, response.error);
    });

    assert.end();
});

test('a user can grant rights to another', function(assert) {
    var test_grant_rights = function(settings, callback) {
        response.post('auth/grant/', response.ok, {env: 'dev', user: 'user2', rights: 2 });
        settings.grant('user2', 'dev', settings.Rights.ReadProtected, response.error, callback);
    };

    helpers.newSettings(test_grant_rights);
    helpers.autoLogsIn(assert, test_grant_rights);
});