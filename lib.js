/**
 * These are the actual calls to City Hall
 *
 * They are broken out into a lib.js since they're not particularly user-friendly
 * as raw calls.  They are wrapped in a user-friendly interface in index.js,
 * which will, for example, automatically log the user as well as do some extra
 * validation on the input.
 */

var md5 = require('md5');
var hostname = require('os').hostname();
var sanitize = require('./sanitize.js');
var http = require('./http.js');

var getFirstProperty = function (obj) {
    for (var prop in obj) {
        if (obj.hasOwnProperty(prop)) {
            return prop;
        }
    }

    return undefined;
};

var invalidUri = function(env, path, override) {
    return (env == undefined || env == ''
        || path == undefined || path == ''
        || override == undefined);
};

var validateUri = function(uri, error, callback) {
    if (uri == undefined) {
        return error('missing fully qualified path');
    }
    if (invalidUri(uri.environment, uri.path, uri.override)) {
        return error('must specify environment, path, and override')
    }
    callback();
};

module.exports = function (url, name, password) {
    if (url == undefined) {
        throw new Error("Expected a URL to reach City Hall");
    }

    if (name == undefined) {
        name = hostname;
    }

    if (password == undefined) {
        password = '';
    }

    /**
     * This is the current logged in user, if you are logged in.
     * Will be set by login()
     */
    var user_name = '';

    /**
     * This is the default environment for this session.
     * The calls to getVal() and getValOverride() will use this value.
     */
    var default_environment = '';

    /**
     * Wrapper call for POST'ing to City Hall.
     *
     * @param location - the location to POST to (e.x. 'auth/')
     * @param data - the data to send (e.x. {'value': 'xyz'})
     */
    var wrapPost = function(location, data, failure, success) {
        var req = http.requestObject('POST', url + location, data);
        http.call(req, failure, success);
    };

    /**
     * Wrapper call for GET'ing from City Hall
     *
     * @param location - the location to GET
     * @param params - query params for the call
     */
    var wrapGet = function(location, params, failure, success) {
        var req = http.requestObject('GET', url + location);
        if (params) {
            req.qs = params;
        }
        http.call(req, failure, success);
    };

    /********************************
     * this section is a set of wrappers for the functions that the user
     * will actually call.  It is done this way so that the actual functions
     * can easily wrap them with a call to login if we're logged out.
     */

    var getSingleVal = function (url, error, callback) {
        var fullpath = 'env/'+default_environment+sanitize.path(url);
        wrapGet(fullpath, null, error, function (data) { callback(data.value); });
    };

    var getSingleObj = function (obj, error, callback) {
        var env = default_environment;
        var params = null;
        if (obj.environment != undefined) {
            env = obj.environment;
        }
        if (obj.override != undefined) {
            params = {override: obj.override};
        }
        var fullpath = 'env/'+env+sanitize.path(obj.path);

        if (obj.raw) {
            wrapGet(fullpath, params, error, callback);
        } else {
            wrapGet(fullpath, params, error, function (data) {
                callback(data.value);
            });
        }
    };

    var getNextValue = function (values, response, error, callback) {
        var prop = getFirstProperty(values);

        if (prop) {
            getSingleObj(values[prop], error, function (data) {
                response[prop] = data;
                delete values[prop];
                getNextValue(values, response, error, callback);
            });
        } else {
            callback(response);
        }
    };

    var setSingleObj = function (uri, value, error, callback) {
        wrapPost('env/'+uri.environment+sanitize.path(uri.path)+'?override='+uri.override,
            value, error, callback);
    };

    var setNextValue = function (values, error, callback) {
        var value = values.pop();
        if (value == undefined) {
            return callback();
        }
        var sanitizedSet = sanitize.setCallBody(value);
        setSingleObj(value, sanitizedSet, error, function() {
            setNextValue(values, error, callback);
        });
    };

    /**
     * For information on these functions, check out the documentation in
     * index.js, which is a user-friendly wrapper around these calls.
     *
     * These functions all assume the user is already logged in.
     */
    return {
        getName: function() {
            return user_name;
        },

        login: function(err, callback) {
            var payload = {'username': name, 'passhash': this.hash(password)};

            wrapPost('auth/', payload, err, function() {
                wrapGet('auth/user/' + name + '/default/', null,  err,
                    function (data) {
                        default_environment = data.value || '';
                        user_name = name;
                        sanitize.call(callback);
                    }
                );
            });
        },

        logout: function(err, callback) {
            http.call(
                http.requestObject('DELETE', url + 'auth/'),
                err,
                function () {
                    user_name = '';
                    sanitize.call(callback);
                }
            );
        },

        defaultEnvironment: function() {
            return default_environment;
        },

        setDefaultEnvironment: function(env, error, callback) {
            wrapPost('auth/user/'+user_name+'/default/', {env: env}, error,
                function() {
                    default_environment = env;
                    sanitize.call(callback);
                }
            );
        },

        viewUsers: function(env, error, callback) {
            wrapGet('auth/env/' + env +'/', null, error, function(data) {
                sanitize.call(callback, data.Users);
            });
        },

        createEnvironment: function(env, error, callback) {
            wrapPost('auth/env/' + env + '/', null, error, callback);
        },

        getUser: function(user, error, callback) {
            wrapGet('auth/user/'+user+'/', null, error, function(data) {
                sanitize.call(callback, data.Environments);
            });
        },

        createUser: function(user, password, error, callback) {
            wrapPost('auth/user/'+user+'/', {passhash: this.hash(password)}, error, callback);
        },

        updatePassword:function(password, error, callback) {
            var req = http.requestObject('PUT', url+'auth/user/'+user_name+'/', {passhash: this.hash(password)});
            http.call(req, error, callback);
        },

        deleteUser: function(user, error, callback) {
            var req = http.requestObject('DELETE', url+'auth/user/'+user+'/');
            http.call(req, error, callback);
        },

        grant: function(user, env, rights, error, callback) {
            wrapPost('auth/grant/', {env: env, user: user, rights: rights}, error, callback);
        },

        getVal: function (val, error, callback) {
            if ((val == undefined) || (getFirstProperty(val) == undefined)) {
                return sanitize.call(error, 'must specify value to get');
            } else if (typeof val == 'string' || val instanceof String) {
                getSingleVal(val, error, callback);
            } else if (val.path == undefined) {
                for (var item in val) {
                    if (val[item].path == undefined) {
                        return error('must specify value to get ('+item+')');
                    }
                }
                getNextValue(val, {}, error, callback);
            } else {
                getSingleObj(val, error, callback);
            }
        },

        setVal: function (uri, value, error, callback) {
            if (value instanceof Array) {
                for (var i=0; i<value.length; i++) {
                    var val = value[i];
                    if (invalidUri(val.environment, val.path, val.override)) {
                        return error('must specify environment, path, and override (' + i + ')');
                    }
                    var sanitizedSet = sanitize.setCallBody(val);
                    if (!sanitizedSet) {
                        return error('must specify value to set (' + i + ')');
                    }
                }
                return setNextValue(value, error, callback);
            }

            validateUri(uri, error, function() {
                var sanitizedSet = sanitize.setCallBody(value);
                if (!sanitizedSet) {
                    return error('must specify value to set');
                }
                setSingleObj(uri, sanitizedSet, error, callback);
            });
        },

        deleteVal: function(uri, error, callback) {
            validateUri(uri, error, function() {
                var req = http.requestObject('DELETE', url+'env/'+uri.environment+sanitize.path(uri.path)+'?override='+uri.override);
                http.call(req, error, callback);
            });
        },

        getHistory: function(uri, error, callback) {
            validateUri(uri, error, function() {
                wrapGet(
                    'env/'+uri.environment + sanitize.path(uri.path),
                    {override: uri.override, viewhistory: true},
                    error, function(data) {
                        callback(data.History);
                    }
                );
            });
        },

        getChildren: function(env, path, error, callback) {
            if (invalidUri(env, path, '')) {
                return error('Must specify environment and path');
            }

            wrapGet('env/'+env+sanitize.path(path), {viewchildren: true}, error,
                function (data) {
                    callback({path: data.path, children: data.children});
                }
            );
        },

        /**
         * Hash a password for use with City Hall.
         *
         * @param password - the plaintext password
         * @returns string - City Hall hash of the given password
         */
        hash: function(password) {
            if ((password == undefined) || (password == '')) {
                return '';
            }
            return md5(password);
        }
    };
};