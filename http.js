var sanitize = require('./sanitize.js');
request = require('request');

/**
 * City Hall works on a session basis, so by default, our interaction
 * with it must have a cookie jar.
 */
request.jar = true;


/**
 * Returns a req object to be passed to request()
 *
 * @param method - the method to use 'GET', 'POST'
 * @param url - the url to use
 */
exports.requestObject = function(method, url, data) {
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
exports.call = function(req, failure, success) {
    req.json = true;

    request(
        req,
        function(error, response, body) {
            if (error || response.statusCode != 200) {
                if (body) {
                    sanitize.call(failure, body);
                } else {
                    sanitize.call(failure, error);
                }
            }

            if (body['Response'] == 'Ok') {
                sanitize.call(success, body);
            } else {
                sanitize.call(failure, body['Message']);
            }
        }
    );
};