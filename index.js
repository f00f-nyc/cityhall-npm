exports.settings = function(url, name, password) {

    if (url == undefined) {
        throw new Error("Expected a URL to reach City Hall");
    }

    console.log('attempting to connect to: ' + url);

    var loggedIn = false;
    var login = function(error, callback) {
        // log in, hold on to session
        loggedIn = true;
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
        }
    };
};
