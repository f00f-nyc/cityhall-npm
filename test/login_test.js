var test = require('tape');
var md5 = require('md5');
var response = require('./response.js');
var helpers = require('./helpers.js');

test('Url is required', function(assert) {
    assert.throws(require('../index.js'));
    assert.end();
});

test('Hash of empty password is empty', function(assert) {
    var lib = require('../lib.js')(response.url);
    assert.equals('', lib.hash(''));
    assert.equals('', lib.hash());
    assert.end();
});

test('Non empty passwords should be hashed', function (assert) {
    var lib = require('../lib.js')(response.url);
    assert.notEquals('', lib.hash('some password'));
    assert.end();
});

test('Username and password are passed through', function (assert) {
    var username = 'some_user';

    // the login call will authenticate, then get the default environment
    response.post('auth/', response.ok, {username: username, passhash: ''});
    response.get('auth/user/'+username+'/default/', response.value('dev'));

    var settings = require('../index.js')(response.url, username, '');
    settings.login(
        function(err, data) {
            assert.false(err, "No error expected");
            assert.equal('dev', settings.defaultEnvironment());
            assert.end();
        }
    );
});

test('Calling login twice is a No-op', function(assert) {
    var username = 'some_user';
    response.post('auth/', response.ok);
    response.get('auth/user/'+username+'/default/', response.value('dev'));
    var settings = require('../index.js')(response.url, username, '');

    settings.login(
        function(err, data) {
            assert.false(err, "No error expected");

            settings.login(response.error);
            assert.true(settings.isLoggedIn(), 'user is logged in');
            assert.equals(username, settings.userName());
            assert.end();
        }
    );
});

test('No username will use machine name', function(assert) {

    // the login call will authenticate, then get the default environment
    response.post('auth/', response.ok, {username: helpers.hostname, passhash: ''});
    response.get('auth/user/'+helpers.hostname+'/default/', response.value('dev'));

    var settings = require('../index.js')(response.url);
    settings.login(
        function(err, data) {
            assert.false(err, "No error expected");
            assert.equal(helpers.hostname, settings.userName());
            assert.end();
        }
    );
});