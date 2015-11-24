var md5 = require('md5');
var request = require('request');

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

var wrapHttpCall = function(req, success, failure) {
    request(req, function(error, response, body) {
        if (error || response.statusCode != 200) {
            safeCall(failure, body);
        }

        var data = JSON.parse(body);
        if (data['Response'] == 'Ok') {
            safeCall(success, data);
        } else {
            safeCall(failure, data['Message']);
        }
    });
};

module.exports = function(url, name, password) {

    if (url == undefined) {
        throw new Error("Expected a URL to reach City Hall");
    }

    if (name == undefined) {
        //get the machine name
    }

    /**
     * This is the current logged in user, if you are logged in.
     */
    var user_name = '';

    /**
     * This is the default environment for this session.
     * The calls to getVal() and getValOverride() will use this value.
     * The user should not, in regular usage, interact with this value.
     */
    var default_environment = '';


    /**
     * Wrapper call for POST'ing to City Hall.
     *
     * @param location - the location to POST to (e.x. 'auth/')
     * @param data - the data to send (e.x. {'value': 'xyz'})
     * @param failure - callback in case of failure
     * @param success - callback for success
     */
    var wrapPost = function(location, data, failure, success) {
        var req = getReq('POST', url + location, data);
        wrapHttpCall(req, success, failure);
    };

    var wrapGet = function(location, failure, success) {
        var req = getReq('GET', url + location);
        wrapHttpCall(req, success, failure);
    };

    var getNextValue = function (value, values, requests, error, callback) {
        // check value.path, value.environment, value.override
        // on return, add value.name=response to values
        // if requests has any items in it, remove the first one and call getNextValue
        // otherwise: callback(values)
    };

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
                wrapGet('auth/user/' + name + '/default/', err, function (data) {
                    default_environment = data.value;
                    user_name = name;
                    safeCall(callback);
                })
            });
        },

        isLoggedIn: function() {
            return user_name != '';
        },

        userName: function() {
            return user_name;
        },

        /**
         * This is an internal function, but exposed to the outside world so it
         * can be easily tested.
         */
        hash: hash
    };
};