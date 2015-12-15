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

var validateUri = function(uri, callback) {
    if (uri == undefined) {
        return callback('missing fully qualified path');
    }
    if (invalidUri(uri.environment, uri.path, uri.override)) {
        return callback('must specify environment, path, and override')
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

    var getSingleVal = function (url, callback) {
        var fullpath = 'env/'+default_environment+sanitize.path(url);
        http.get(fullpath, null, function (err, data) {
            if (err) { return callback(err); }
            callback(null, data.value);
        });
    };

    var getSingleObj = function (obj, callback) {
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
            http.get(fullpath, params, callback);
        } else {
            http.get(fullpath, params, function (err, data) {
                if (err) { return callback(err); }
                callback(null, data.value);
            });
        }
    };

    var getNextValue = function (values, response, callback) {
        var prop = getFirstProperty(values);

        if (prop) {
            getSingleObj(values[prop], function (err, data) {
                if (err) { return callback(err); }

                response[prop] = data;
                delete values[prop];
                getNextValue(values, response, callback);
            });
        } else {
            callback(null, response);
        }
    };

    var setSingleObj = function (uri, value, callback) {
        http.post('env/'+uri.environment+sanitize.path(uri.path)+'?override='+uri.override,
            value, callback);
    };

    var setNextValue = function (values, callback) {
        var value = values.pop();
        if (value == undefined) {
            return callback();
        }
        var sanitizedSet = sanitize.setCallBody(value);
        setSingleObj(value, sanitizedSet, function(err, data) {
            if (err) { return callback(err); }
            setNextValue(values, callback);
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

        login: function(callback) {
            var payload = {'username': name, 'passhash': this.hash(password)};

            http.post('auth/', payload, function(err, data) {
                if (err) { return callback(err); }

                http.get('auth/user/' + name + '/default/', null,
                    function (err, data) {
                        if (err) { return callback(err); }

                        default_environment = data.value || '';
                        user_name = name;
                        sanitize.call(callback);
                    }
                );
            });
        },

        logout: function(callback) {
            http.delete('auth/',undefined, function(err, data) {
                    if (err) { return callback(err); }

                    user_name = '';
                    sanitize.call(callback);
                }
            );
        },

        defaultEnvironment: function() {
            return default_environment;
        },

        setDefaultEnvironment: function(env, callback) {
            http.post('auth/user/'+user_name+'/default/', {env: env},
                function(err, data) {
                    if (err) { return callback(err); }

                    default_environment = env;
                    sanitize.call(callback);
                }
            );
        },

        viewUsers: function(env, callback) {
            http.get('auth/env/' + env +'/', null, function(err, data) {
                if (err) { return callback(err); }
                sanitize.call(callback, null, data.Users);
            });
        },

        createEnvironment: function(env, callback) {
            http.post('auth/env/' + env + '/', null, callback);
        },

        getUser: function(user, callback) {
            http.get('auth/user/'+user+'/', null, function(err, data) {
                if (err) { return callback(err); }
                sanitize.call(callback, null, data.Environments);
            });
        },

        createUser: function(user, password, callback) {
            http.post('auth/user/'+user+'/', {passhash: this.hash(password)}, callback);
        },

        updatePassword:function(password, callback) {
            http.put('auth/user/'+user_name+'/', {passhash: this.hash(password)}, callback);
        },

        deleteUser: function(user, callback) {
            http.delete('auth/user/'+user+'/', undefined, callback);
        },

        grant: function(user, env, rights, callback) {
            http.post('auth/grant/', {env: env, user: user, rights: rights}, callback);
        },

        getVal: function (val, callback) {
            if ((val == undefined) || (getFirstProperty(val) == undefined)) {
                return sanitize.call(callback, 'must specify value to get');
            } else if (typeof val == 'string' || val instanceof String) {
                getSingleVal(val, callback);
            } else if (val.path == undefined) {
                for (var item in val) {
                    if (val[item].path == undefined) {
                        return callback('must specify value to get ('+item+')');
                    }
                }
                getNextValue(val, {}, callback);
            } else {
                getSingleObj(val, callback);
            }
        },

        setVal: function (uri, value, callback) {
            if (value instanceof Array) {
                for (var i=0; i<value.length; i++) {
                    var val = value[i];
                    if (invalidUri(val.environment, val.path, val.override)) {
                        return callback('must specify environment, path, and override (' + i + ')');
                    }
                    var sanitizedSet = sanitize.setCallBody(val);
                    if (!sanitizedSet) {
                        return callback('must specify value to set (' + i + ')');
                    }
                }
                return setNextValue(value, callback);
            }

            validateUri(uri, function(err, data) {
                if (err) { return callback(err); }

                var sanitizedSet = sanitize.setCallBody(value);
                if (!sanitizedSet) {
                    return callback('must specify value to set');
                }
                setSingleObj(uri, sanitizedSet, callback);
            });
        },

        deleteVal: function(uri, callback) {
            validateUri(uri, function(err, data) {
                if (err) { return callback(err); }

                http.delete(
                    'env/'+uri.environment+sanitize.path(uri.path),
                    {override:uri.override}, callback
                );
            });
        },

        getHistory: function(uri, callback) {
            validateUri(uri, function(err, data) {
                if (err) { return callback(err); }

                http.get(
                    'env/'+uri.environment + sanitize.path(uri.path),
                    {override: uri.override, viewhistory: true},
                    function(err, data) {
                        if (err) { return callback(err); }
                        sanitize.call(callback, null, data.History);
                    }
                );
            });
        },

        getChildren: function(env, path, callback) {
            if (invalidUri(env, path, '')) {
                return callback('Must specify environment and path');
            }

            http.get('env/'+env+sanitize.path(path), {viewchildren: true},
                function (err, data) {
                    if (err) { return callback(err); }
                    sanitize.call(callback, null, {path: data.path, children: data.children});
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