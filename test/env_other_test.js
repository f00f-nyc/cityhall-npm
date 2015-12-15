var test = require('tape');
var response = require('./response.js');
var helpers = require('./helpers.js');

test('incomplete history query yields error', function (assert) {
    helpers.newSettings(function (settings) {
        settings.getHistory(undefined, function (err) {
            assert.equals('missing fully qualified path', err);
        });
        settings.getHistory({}, function (err) {
            assert.equals('must specify environment, path, and override', err);
        });
        settings.getHistory({path: 'app'}, function (err) {
            assert.equals('must specify environment, path, and override', err);
        });
        settings.getHistory({path: 'app', environment: 'qa'}, function (err) {
            assert.equals('must specify environment, path, and override', err);
        })
        settings.getHistory({override: 'user2', environment: 'qa'}, function (err) {
            assert.equals('must specify environment, path, and override', err);
        });
        settings.getHistory({path: 'app', override: 'user2'}, function (err) {
            assert.equals('must specify environment, path, and override', err);
        });
        assert.end();
    });
});

test('can get history', function (assert) {
    var get_history = function (settings, callback) {
        response.get('env/qa/app1/?override=user2&viewhistory=true', response.history);
        settings.getHistory(
            {path: 'app1', environment: 'qa', override: 'user2'},
            function (err, data) {
                assert.false(err, "No error expected");
                assert.deepEqual(response.history.History, data);
                callback();
            }
        );
    };

    helpers.newSettings(get_history);
    helpers.autoLogsIn(assert, get_history);
});

test('incomplete get children query yields error', function (assert) {
    helpers.newSettings(function (settings) {
        settings.getChildren(undefined, undefined, function (err) {
            assert.equals('Must specify environment and path', err);
        });
        settings.getChildren(undefined, 'app1', function (err) {
            assert.equals('Must specify environment and path', err);
        });
        settings.getChildren('', 'app1', function (err) {
            assert.equals('Must specify environment and path', err);
        });
        settings.getChildren('', '', function (err) {
            assert.equals('Must specify environment and path', err);
        });
        settings.getChildren('qa', undefined, function (err) {
            assert.equals('Must specify environment and path', err);
        });
        settings.getChildren('qa', '', function (err) {
            assert.equals('Must specify environment and path', err);
        });
        settings.getChildren('', '', function (err) {
            assert.equals('Must specify environment and path', err);
        });
        assert.end();
    });
});

test('can get children', function (assert) {
    var get_children = function (settings, callback) {
        response.get('env/qa/app1/?viewchildren=true', response.children);
        settings.getChildren('qa', 'app1',
            function (err, data) {
                assert.false(err, "No error expected");
                assert.deepEqual(response.children.children, data.children);
                assert.equals(response.children.path, data.path);
                callback();
            }
        );
    };

    helpers.newSettings(get_children);
    helpers.autoLogsIn(assert, get_children);
});