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

    var http = require('./http.js')(url);

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

    /********************************
     * this section is a set of wrappers for the functions that the user
     * will actually call.  It is done this way so that the actual functions
     * can easily wrap them with a call to login if we're logged out.
     */

    var getSingleVal = function (url, error, callback) {
        var fullpath = 'env/'+default_environment+sanitize.path(url);
        http.get(fullpath, null, error, function (data) { callback(data.value); });
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
            http.get(fullpath, params, error, callback);
        } else {
            http.get(fullpath, params, error, function (data) {
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
        http.post('env/'+uri.environment+sanitize.path(uri.path)+'?override='+uri.override,
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

            http.post('auth/', payload, err, function() {
                http.get('auth/user/' + name + '/default/', null,  err,
                    function (data) {
                        default_environment = data.value || '';
                        user_name = name;
                        sanitize.call(callback, undefined);
                    }
                );
            });
        },

        logout: function(err, callback) {
            http.delete('auth/',undefined, err, function() {
                    user_name = '';
                    sanitize.call(callback, undefined);
                }
            );
        },

        defaultEnvironment: function() {
            return default_environment;
        },

        setDefaultEnvironment: function(env, error, callback) {
            http.post('auth/user/'+user_name+'/default/', {env: env}, error,
                function() {
                    default_environment = env;
                    sanitize.call(callback, undefined);
                }
            );
        },

        viewUsers: function(env, error, callback) {
            http.get('auth/env/' + env +'/', null, error, function(data) {
                sanitize.call(callback, data.Users);
            });
        },

        createEnvironment: function(env, error, callback) {
            http.post('auth/env/' + env + '/', null, error, callback);
        },

        getUser: function(user, error, callback) {
            http.get('auth/user/'+user+'/', null, error, function(data) {
                sanitize.call(callback, data.Environments);
            });
        },

        createUser: function(user, password, error, callback) {
            http.post('auth/user/'+user+'/', {passhash: this.hash(password)}, error, callback);
        },

        updatePassword:function(password, error, callback) {
            http.put('auth/user/'+user_name+'/', {passhash: this.hash(password)}, error, callback);
        },

        deleteUser: function(user, error, callback) {
            http.delete('auth/user/'+user+'/', undefined, error, callback);
        },

        grant: function(user, env, rights, error, callback) {
            http.post('auth/grant/', {env: env, user: user, rights: rights}, error, callback);
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
                http.delete(
                    'env/'+uri.environment+sanitize.path(uri.path),
                    {override:uri.override}, error, callback
                );
            });
        },

        getHistory: function(uri, error, callback) {
            validateUri(uri, error, function() {
                http.get(
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

            http.get('env/'+env+sanitize.path(path), {viewchildren: true}, error,
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