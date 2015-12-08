var md5 = require('md5');
var request = require('request');
var hostname = require('os').hostname();

/**
 * Hash a password for use with City Hall.
 *
 * @param password - the plaintext password
 * @returns string - City Hall hash of the given password
 */
var hash = function(password) {
    if ((password == undefined) || (password == '')) {
        return '';
    }
    return md5(password);
};

/**
 * Checks to see if func exists, and if it does, call it using data.
 *
 * @param func - the function to call
 * @param data - the data to pass to the
 */
var safeCall = function(func, data) {
    if ((func != undefined) && (func instanceof Function)) {
        func(data);
    }
};

/**
 * Returns a req object to be passed to request()
 *
 * @param method - the method to use 'GET', 'POST'
 * @param url - the url to use
 */
var getReq = function(method, url, data) {
    var ret = {
        method: method,
        uri: url
    };

    if (data != undefined) {
        ret.multipart = [{
            'content-type': 'application/json',
            body: JSON.stringify(data)
        }]
    }

    return ret;
};

/**
 * Wraps an Http call and calls success/failure accordingly.  This
 * method will a successful call to City Hall that results in an error
 * (e.x. do not have write permissions) as an error and call failure with it
 *
 * @param req - request object
 * @param success - callback for success
 * @param failure - callback in case of failure
 */
var wrapHttpCall = function(req, failure, success) {
    req.json = true;

    request(
        req,
        function(error, response, body) {
            if (error || response.statusCode != 200) {
                if (body) {
                    safeCall(failure, body);
                } else {
                    safeCall(failure, error);
                }
            }

            if (body['Response'] == 'Ok') {
                safeCall(success, body);
            } else {
                safeCall(failure, body['Message']);
            }
        }
    );
};

var sanitizePath = function (path) {
    var ret = path;
    if (path[0] != '/') {
        ret = '/'+path;
    }
    if (ret[ret.length-1] != '/') {
        ret = ret+'/';
    }
    return ret;
};

var Rights = {
    None: 0,
    Read: 1,
    ReadProtected: 2,
    Write: 3,
    Grant: 4
};

module.exports = function(url, name, password) {
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

    request.jar = true;

    /**
     * Wrapper call for POST'ing to City Hall.
     *
     * @param location - the location to POST to (e.x. 'auth/')
     * @param data - the data to send (e.x. {'value': 'xyz'})
     */
    var wrapPost = function(location, data, failure, success) {
        var req = getReq('POST', url + location, data);
        wrapHttpCall(req, failure, success);
    };

    /**
     * Wrapper call for GET'ing from City Hall
     *
     * @param location - the location to GET
     * @param params - query params for the call
     */
    var wrapGet = function(location, params, failure, success) {
        var req = getReq('GET', url + location);
        if (params) {
            req.qs = params;
        }
        wrapHttpCall(req, failure, success);
    };

    /********************************
     * this section is a set of wrappers for the functions that the user
     * will actually call.  It is done this way so that the actual functions
     * can easily wrap them with a call to login if we're logged out.
     */
    var setDefaultEnvironment = function(env, error, callback) {
        wrapPost('auth/user/'+user_name+'/default/', {env: env}, error,
            function() {
                default_environment = env;
                safeCall(callback);
            }
        );
    };

    var viewUsers = function(env, error, callback) {
        wrapGet('auth/env/' + env +'/', null, error, function(data) {
            safeCall(callback, data.Users);
        });
    };

    var createEnvironment = function(env, error, callback) {
        wrapPost('auth/env/' + env + '/', null, error, callback);
    };

    var getUser = function(user, error, callback) {
        wrapGet('auth/user/'+user+'/', null, error, function(data) {
            safeCall(callback, data.Environments);
        });
    };

    var createUser = function(user, password, error, callback) {
        wrapPost('auth/user/'+user+'/', {passhash: hash(password)}, error, callback);
    };

    var updatePassword = function(password, error, callback) {
        var req = getReq('PUT', url+'auth/user/'+user_name+'/', {passhash: hash(password)});
        wrapHttpCall(req, error, callback);
    };

    var deleteUser = function(user, error, callback) {
        var req = getReq('DELETE', url+'auth/user/'+user+'/');
        wrapHttpCall(req, error, callback);
    };

    var grant = function(user, env, rights, error, callback) {
        wrapPost('auth/grant/', {env: env, user: user, rights: rights}, error, callback);
    };

    var getSingleVal = function (url, error, callback) {
        var fullpath = 'env/'+default_environment+sanitizePath(url);
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
        var fullpath = 'env/'+env+sanitizePath(obj.path);

        if (obj.raw) {
            wrapGet(fullpath, params, error, callback);
        } else {
            wrapGet(fullpath, params, error, function (data) {
                callback(data.value);
            });
        }
    };

    var getNextValue = function (value, values, requests, error, callback) {
        // check value.path, value.environment, value.override
        // on return, add value.name=response to values
        // if requests has any items in it, remove the first one and call getNextValue
        // otherwise: callback(values)
    };

    var validateVal = function (val, error, callback) {
        if (val == undefined) {
            return safeCall(error, 'must specify value to get');
        } else if (typeof val == 'string' || val instanceof String) {
            getSingleVal(val, error, callback);
        } else if (val.path == undefined) {
            for (var item in val) {
                if (val[item].path == undefined) {
                    return error('must specify value to get ('+item+')');
                }
            }
        } else {
            getSingleObj(val, error, callback);
        }
    };

    /********************************
     * The actual object that will be returned to the user.
     */
    return {
        /**
         * This is a pseudo enum to be used for setting/getting rights
         */
        Rights: Rights,

        /**
         * This function logs into City Hall.  It is not required to be called,
         * If it isn't called explicitly, it will be called by the first
         * operation to call City Hall. No-op if already logged in.
         */
        login: function(err, callback) {
            if (this.isLoggedIn()) { return; }

            var payload = {'username': name, 'passhash': hash(password)};

            wrapPost('auth/', payload, err, function() {
                wrapGet('auth/user/' + name + '/default/', null,  err,
                    function (data) {
                        default_environment = data.value || '';
                        user_name = name;
                        safeCall(callback);
                    }
                );
            });
        },

        /**
         * This function logs out of City Hall.  In order to use any of the
         * other functions, you must call login() again.
         */
        logout: function(err, callback) {
            if (this.isLoggedIn()) {
                wrapHttpCall(
                    getReq('DELETE', url + 'auth/'),
                    err,
                    function () {
                        user_name = '';
                        safeCall(callback);
                    }
                );
            }
        },

        /**
         * @returns {boolean} - true if logged in
         */
        isLoggedIn: function() {
            return user_name != '';
        },

        /**
         * @returns {string} - current logged in user. '' if not logged in.
         */
        userName: function() {
            return user_name;
        },

        /**
         * @returns {string} - the default environment.  If not set, returns ''
         */
        defaultEnvironment: function() {
            return default_environment;
        },

        /**
         * Sets the default environment
         * @param env {string} - environment to set to default, can be the same as
         *      this.defaultEnvironment()
         */
        setDefaultEnvironment: function(env, err, callback) {
            if (!this.isLoggedIn()) {
                return this.login(err, function() { setDefaultEnvironment(env, err, callback) });
            }
            setDefaultEnvironment(env, err, callback);
        },

        /**
         * Views all the users for an environment
         * @param env {string} - the environment to query users for
         */
        viewUsers: function(env, err, callback) {
            if (!this.isLoggedIn()) {
                return this.login(err, function() { viewUsers(env, err, callback) });
            }
            viewUsers(env, err, callback);
        },

        /**
         * Creates an empty enviornment. By default, the logged in user will
         * have Grant permissions to it.
         * @param env {string} - the environment to create, must be unique/unused.
         */
        createEnvironment: function(env, err, callback) {
            if (!this.isLoggedIn()) {
                return this.login(err, function() { createEnvironment(env, err, callback); });
            }
            createEnvironment(env, err, callback);
        },

        /**
         * Returns the information about a user: the environments he has
         * access to, and the level of permissions for each
         * @param user {string} - the user to query, it must exist.
         */
        getUser: function(user, err, callback) {
            if (!this.isLoggedIn()) {
                return this.login(err, function() { getUser(user, err, callback); });
            }
            getUser(user, err, callback);
        },

        /**
         * Creates a user with the given password.
         * @param user {string} - the name of the user, must be unique/unused.
         * @param password {string} - the plaintext password, it will be hashed
         *   before being sent across the wire.
         */
        createUser: function(user, password, err, callback) {
            if (!this.isLoggedIn()) {
                return this.login(err, function() { createUser(user, password, err, callback); });
            }
            createUser(user, password, err, callback);
        },

        /**
         * Updates the password of the current logged in user.
         * @param password {string} - the plaintext password, it will be hashed
         *   before being sent across the wire.
         */
        updatePassword: function(password, err, callback) {
            if (!this.isLoggedIn()) {
                return this.login(err, function() { updatePassword(password, err, callback); });
            }
            updatePassword(password, err, callback);
        },

        /**
         * Deletes a user. Deletion can only happen if a user's environments
         * have Grant permissions for the current user, or the user has Write
         * permissions to the User environment.  If deletion fails, this will
         * callback err
         * @param user {string} - the user to delete
         */
        deleteUser: function(user, err, callback) {
            if (!this.isLoggedIn()) {
                return this.login(err, function () { deleteUser(user, err, callback); });
            }
            deleteUser(user, err, callback);
        },

        /**
         * Will give a user rights to a particular environment.  The logged in
         * user must have Grant permission on that environment.
         * @param user {string} -
         * @param env {string} -
         * @param rights {string} -
         */
        grant: function (user, env, rights, err, callback) {
            if (rights == undefined) {
                return err('rights are undefined');
            } else if (rights < Rights.None || rights > Rights.Grant) {
                return err('rights out of range: ' + rights);
            } else if (user == undefined) {
                return err('user is undefined');
            } else if (env == undefined) {
                return err('environment is undefined');
            } else if (!this.isLoggedIn()) {
                return this.login(err, function () { grant(user, env, rights, err, callback); });
            }
            grant(user, env, rights, err, callback);
        },

        /**
         * This function will return one or more values from the server.
         * @param val - multiple options:
         *  {string} - a single path to the value on the default environment, the
         *    appropriate override will be retrieved.
         *  {object} - an object which must have a url property and optional
         *    override and environment properties.
         *  {collection} - an object which can have 1 or more properties, which
         *    cannot be named url.  Each property must have a url property and
         *    may contain optional override and environment properties.
         */
        getVal: function(val, err, callback) {
            if (!this.isLoggedIn()) {
                return this.login(err, function () { validateVal(val, err, callback); });
            }
            validateVal(val, err, callback);
        },

        /**
         * This is an internal function, but exposed to the outside world so it
         * can be easily tested.
         */
        hash: hash
    };
};