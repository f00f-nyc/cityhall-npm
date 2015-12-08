var test = require('tape');
var response = require('./response.js');
var helpers = require('./helpers.js');

test('undefined path yields error', function (assert) {
    helpers.newSettings(function (settings) {
        settings.getVal(undefined, function (data) {
            assert.equals('must specify value to get', data);
        }, response.error);
        settings.getVal({}, function (data) {
            assert.equals('must specify value to get', data);
        }, response.error);
        settings.getVal({value1: {override: 'user2'}}, function (data) {
            assert.equals('must specify value to get (value1)', data);
        }, response.error);
        settings.getVal({value1: {url: '/some_app'}, value2: {override: 'user2'}},
            function (data) { assert.equals('must specify value to get (value2)', data);},
            response.error);
        assert.end();
    });
});

test('can get a value by path', function (assert) {
    var get_value = function (settings, callback) {
        response.get('env/dev/some_app/value1/', response.value('100'));

        settings.getVal('some_app/value1', response.error, function (data) {
            assert.equals('100', data);
            callback();
        });
    };

    helpers.newSettings(get_value);
    helpers.autoLogsIn(assert, get_value);
});

test('can get a value by url', function (assert) {
   var get_with_url = function (settings, callback) {
       response.get('env/dev/app/', response.value('100'));
       settings.getVal({url:'app'}, response.error, callback);
   };

    helpers.newSettings(get_with_url);
    helpers.autoLogsIn(assert, get_with_url);
});

test('can specify environment', function (assert) {
    helpers.newSettings(function (settings) {
        response.get('env/qa/app2/', response.value('200'));
        var obj = {environment: 'qa', url: 'app2'};
        settings.getVal(obj, response.error, function () { assert.end(); });
    });
});

test('can specify override', function (assert) {
   helpers.newSettings(function (settings) {
       response.get('env/dev/app2/?override=user2', response.value('300'));
       var obj = {override: 'user2', url: 'app2'};
       settings.getVal(obj, response.error, function () { assert.end(); });
   });
});