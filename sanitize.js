/**
 * Checks to see if func exists, and if it does, call it using data.
 *
 * @param func - the function to call
 * @param data - the data to pass to the
 */
exports.call = function(func, data) {
    if ((func != undefined) && (func instanceof Function)) {
        func(data);
    }
};

exports.path = function (path) {
    var ret = path;
    if (path[0] != '/') {
        ret = '/'+path;
    }
    if (ret[ret.length-1] != '/') {
        ret = ret+'/';
    }
    return ret;
};

exports.setCallBody = function(obj) {
    if (typeof obj == 'string' || obj instanceof String) {
        return {value: obj};
    }
    if (obj === undefined) {
        return undefined;
    }
    var ret={}, valid=false;
    if (obj.value != undefined) {
        ret.value = obj.value;
        valid=true;
    }
    if (obj.protect != undefined) {
        ret.protect = obj.protect;
        valid=true;
    }
    return valid ? ret : undefined;
};