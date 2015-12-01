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
    };

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
     * The user should not, in regular usage, interact with this value.
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
     */
    var wrapGet = function(location, params, failure, success) {
        var req = getReq('GET', url + location);
        wrapHttpCall(req, failure, success);
    };

    /********************************
     * this section is a set of wrappers for the functions that the user
     * will actually call.  It is done this way so that the actual functions
     * can easily wrap them with a call to login if we're logged out.
     */
    var getNextValue = function (value, values, requests, error, callback) {
        // check value.path, value.environment, value.override
        // on return, add value.name=response to values
        // if requests has any items in it, remove the first one and call getNextValue
        // otherwise: callback(values)
    };

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

    /********************************
     * The actual object that will be returned to the user.
     */
    return {
        getValue: function(values, error, callback) {
            // ensure logged in
            // go through each
        },

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
         * @param env - the environment to query users for
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
         * @param env - the environment to create, must be unique/unused.
         */
        createEnvironment: function(env, err, callback) {
            if (!this.isLoggedIn()) {
                return this.login(err, function() { createEnvironment(env, err, callback) });
            }
            createEnvironment(env, err, callback);
        },

        /**
         * This is an internal function, but exposed to the outside world so it
         * can be easily tested.
         */
        hash: hash
    };
};