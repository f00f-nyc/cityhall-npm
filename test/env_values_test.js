var test = require('tape');
var response = require('./response.js');
var helpers = require('./helpers.js');

test('undefined path yields error for getVal', function (assert) {
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
        settings.getVal({value1: {path: '/some_app'}, value2: {override: 'user2'}},
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

test('can get a value by path', function (assert) {
   var get_with_path = function (settings, callback) {
       response.get('env/dev/app/', response.value('100'));
       settings.getVal({path:'app'}, response.error, callback);
   };

    helpers.newSettings(get_with_path);
    helpers.autoLogsIn(assert, get_with_path);
});

test('can specify environment', function (assert) {
    helpers.newSettings(function (settings) {
        response.get('env/qa/app2/', response.value('200'));
        var obj = {environment: 'qa', path: 'app2'};
        settings.getVal(obj, response.error, function () { assert.end(); });
    });
});

test('can specify override', function (assert) {
   helpers.newSettings(function (settings) {
       response.get('env/dev/app2/?override=user2', response.value('300'));
       var obj = {override: 'user2', path: 'app2'};
       settings.getVal(obj, response.error, function () { assert.end(); });
   });
});

test('can specify default override', function (assert) {
   helpers.newSettings(function (settings) {
       response.get('env/dev/app2/?override=', response.value('301'));
       var obj = {override: '', path: 'app2'};
       settings.getVal(obj, response.error, function () { assert.end(); });
   });
});

test('can specify return raw response', function (assert) {
   helpers.newSettings(function (settings) {
       response.get('env/dev/app2/', response.value('400'));
       var obj = {raw: true, path:'app2'};
       settings.getVal(obj, response.error, function(data) {
           assert.deepEqual(response.value('400'), data);
           assert.end();
       });
   });
});

test('can specify all optional items', function (assert) {
    helpers.newSettings(function (settings) {
        response.get('env/qa/app2/?override=user2', response.value('500'));
        var obj = {raw: true, override: 'user2', environment: 'qa', path:'app2'};
        settings.getVal(obj, response.error, function(data) {
            assert.deepEqual(response.value('500'), data);
            assert.end();
        });
    });
});

test('can specify value-object pair', function (assert) {
    helpers.newSettings(function (settings) {
        response.get('env/dev/app1/', response.value('101'));
        var obj = {value: {path: 'app1'}};

        settings.getVal(obj, response.error, function(data) {
            assert.ok(data.hasOwnProperty('value'), 'the object coming back should have a value which matches the object passed in');
            assert.equals('101', data.value);
            assert.end();
        });
    });
});

test('can specify multiple value-object pairs', function(assert) {
    helpers.newSettings(function (settings) {
        response.get('env/dev/app1/', response.value('dev/app1'));
        response.get('env/qa/app2/', response.value('qa/app2'));
        response.get('env/uat/app3/?override=user2', response.value('uat/app3'));

        var obj = {
            value1: {path: 'app1'},
            value2: {path: 'app2', environment: 'qa'},
            value3: {path: 'app3', environment: 'uat', override: 'user2'}
        };

        settings.getVal(obj, response.error, function(data) {
            assert.ok(data.hasOwnProperty('value1'), 'the object coming back should have a value which matches the object passed in');
            assert.ok(data.hasOwnProperty('value2'), 'the object coming back should have a value which matches the object passed in');
            assert.ok(data.hasOwnProperty('value3'), 'the object coming back should have a value which matches the object passed in');

            assert.equals('dev/app1', data.value1);
            assert.equals('qa/app2', data.value2);
            assert.equals('uat/app3', data.value3);
            assert.end();
        });
    });
});

test('incomplete set yields error', function (assert) {
    helpers.newSettings(function (settings) {
        settings.setVal(undefined, '', function (data) {
            assert.equals('missing fully qualified path', data);
        }, response.error);
        settings.setVal({}, '', function (data) {
            assert.equals('must specify environment, path, and override', data);
        }, response.error);
        settings.setVal({path: 'app'}, '', function (data) {
            assert.equals('must specify environment, path, and override', data);
        }, response.error);
        settings.setVal({path: 'app', environment: 'qa'}, '', function (data) {
            assert.equals('must specify environment, path, and override', data);
        }, response.error);
        settings.setVal({override: 'user2', environment: 'qa'}, '', function (data) {
            assert.equals('must specify environment, path, and override', data);
        }, response.error);
        settings.setVal({path: 'app', override: 'user2'}, '', function (data) {
            assert.equals('must specify environment, path, and override', data);
        }, response.error);
        settings.setVal({path: 'app', override: 'user2', environment: 'qa'}, undefined, function (data) {
            assert.equals('must specify value to set', data);
        }, response.error);

        var multiple_vals = [
            {environment: 'qa', path: 'app1', override: 'user2', value: '100'},
            {environment: 'qa', path: 'app2', override: 'user2'},
            {environment: 'qa', path: 'app1', override: 'user2', protect: true}
        ];
        settings.setVal(undefined, multiple_vals, function (data) {
            assert.equals('must specify value to set (1)', data);
        }, response.error);

        multiple_vals = [
            {environment: 'qa', path: 'app1', override: 'user2', value: '100'},
            {environment: 'qa', path: 'app2', value: '200'},
            {environment: 'qa', path: 'app1', override: 'user2', protect: true}
        ];
        settings.setVal(undefined, multiple_vals, function (data) {
            assert.equals('must specify environment, path, and override (1)', data);
        }, response.error);

        assert.end();
    });
});

test('can set value by string', function (assert) {
    var set_value = function(settings, callback) {
        response.post('env/qa/app1/?override=user2', response.ok, {value: 'some value'});

        var uri = {path: 'app1', override: 'user2', environment: 'qa'};
        var object = 'some value';
        settings.setVal(uri, object, response.error, callback);
    };

    helpers.newSettings(set_value);
    helpers.autoLogsIn(assert, set_value);
});

test('can set value by object', function (assert) {
    helpers.newSettings(function (settings) {
        response.post('env/qa/app1/?override=user2', response.ok);
        var uri = {path: 'app1', override: 'user2', environment: 'qa'};
        var value = {value: 'some value'};
        settings.setVal(uri, value, response.error, function () { assert.end(); });
    });
});

test('can set multiple values', function (assert) {
    helpers.newSettings(function(settings) {
        var multiple_vals = [
            {environment: 'qa', path: 'app1', override: 'user2', value: '100'},
            {environment: 'qa', path: 'app2', override: '', value: '200', protect: true},
            {environment: 'uat', path: 'app1', override: 'user2', protect: true}
        ];
        response.post('env/qa/app1/?override=user2', response.ok, {value: '100'});
        response.post('env/qa/app2/?override=', response.ok, {value: '200', protect: true});
        response.post('env/uat/app1/?override=user2', response.ok, {protect: true});

        settings.setVal(undefined, multiple_vals, response.error, function() { assert.end(); });
    });
});

test('can set protect', function (assert) {
    helpers.newSettings(function (settings) {
        response.post('env/qa/app1/?override=user2', response.ok);
        var uri = {path: 'app1', override: 'user2', environment: 'qa'};
        var value = {protect: false};
        settings.setVal(uri, value, response.error, function () { assert.end(); });
    });
});

test('can set protect and value simultaneously', function (assert) {
    helpers.newSettings(function (settings) {
        response.post('env/qa/app1/?override=user2', response.ok);
        var uri = {path: 'app1', override: 'user2', environment: 'qa'};
        var value = {protect: false, value: '200'};
        settings.setVal(uri, value, response.error, function () { assert.end(); });
    });
});

test('incomplete delete yields error', function (assert) {
    helpers.newSettings(function (settings) {
        settings.deleteVal(undefined, function (data) {
            assert.equals('missing fully qualified path', data);
        }, response.error);
        settings.deleteVal({}, function (data) {
            assert.equals('must specify environment, path, and override', data);
        }, response.error);
        settings.deleteVal({path: 'app'}, function (data) {
            assert.equals('must specify environment, path, and override', data);
        }, response.error);
        settings.deleteVal({path: 'app', environment: 'qa'}, function (data) {
            assert.equals('must specify environment, path, and override', data);
        }, response.error);
        settings.deleteVal({override: 'user2', environment: 'qa'}, function (data) {
            assert.equals('must specify environment, path, and override', data);
        }, response.error);
        settings.deleteVal({path: 'app', override: 'user2'}, function (data) {
            assert.equals('must specify environment, path, and override', data);
        }, response.error);
        assert.end();
    });
});

test('can delete value', function (assert) {
    var delete_val = function (settings, callback) {
        response.delete('env/qa/app1/?override=user2');
        settings.deleteVal({path: 'app1', environment: 'qa', override: 'user2'}, response.error, callback);
    };

    helpers.newSettings(delete_val);
    helpers.autoLogsIn(assert, delete_val);
});