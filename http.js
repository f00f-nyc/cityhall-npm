var sanitize = require('./sanitize.js');
var request = require('request');

/**
 * City Hall works on a session basis, so by default, our interaction
 * with it must have a cookie jar.
 */
request = request.defaults({jar: true});

/**
 * Returns a req object to be passed to request()
 *
 * @param method - the method to use 'GET', 'POST'
 * @param url - the url to use
 */
var requestObject = function(method, url, data) {
    var ret = {
        method: method,
        uri: url,
        headers: {
            "Content-Type": "application/json"
        }
    };

    if (data != undefined) {
        ret.body = JSON.stringify(data);
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
var httpCall = function(req, callback) {
    req.json = true;

    request(
        req,
        function(error, response, body) {
            if (error || response.statusCode != 200) {
                if (body) {
                    sanitize.call(callback, body);
                } else {
                    sanitize.call(callback, error);
                }
            }

            if (body['Response'] == 'Ok') {
                sanitize.call(callback, undefined, body);
            } else {
                sanitize.call(callback, body['Message']);
            }
        }
    );
};

module.exports = function (url) {
    return {
        post: function(location, data, callback) {
            var req = requestObject('POST', url + location, data);
            httpCall(req, callback);
        },

        get: function(location, params, callback) {
            var req = requestObject('GET', url + location);
            if (params) {
                req.qs = params;
            }
            httpCall(req, callback);
        },

        put: function(location, data, callback) {
            var req = requestObject('PUT', url+location, data);
            httpCall(req, callback);
        },

        delete: function(location, params, callback) {
            var req = requestObject('DELETE', url+location);
            if (params) {
                req.qs = params;
            }
            httpCall(req, callback);
        }
    };
};