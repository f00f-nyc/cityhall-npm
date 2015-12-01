var nock = require('nock');
var ok = {Response:'Ok'};
var not_ok = {Response:'Failure', Message:'Error from server'};
var url_for_nock = 'http://not.a.real.url/api';
var url = url_for_nock + '/';

exports.url = url;
exports.ok = ok;
exports.not_ok = not_ok;
exports.dev_environment = {
    Response: 'Ok',
    Users: { test_user: 4,  some_user: 1, cityhall: 4 }
};
exports.test_user = {
    Response: 'Ok',
    Environments: {dev: 4, auto: 1, users: 1}
};

exports.value = function (val) {
    var ret = ok;
    ret.value = val;
    return ret;
};


//body is some kind of structured string, haven't figured out
//the accepted way to parse it. Break it up to get to the JSON
var checkNockBody = function(body, expected) {
    body = body.toString();
    var start = body.indexOf("{");
    var end = body.indexOf("}--") + 1;
    var json = body.substring(start, end);
    var expectedJson = JSON.stringify(expected);

    return json == expectedJson;
};

exports.post = function (address, reply, expected) {
    address =  '/'+address;
    if (expected) {
        nock(url_for_nock)
            .post(address, function(body) { return checkNockBody(body, expected); })
            .reply(200, reply);
    } else {
        nock(url_for_nock).post(address).reply(200, reply);
    }
};

exports.get = function (address, reply) {
    nock(url_for_nock).get('/'+address).reply(200, reply);
};

exports.delete = function (address) {
    nock(url_for_nock).delete('/'+address).reply(200, ok);
};

exports.put = function (address, expected) {
    nock(url_for_nock)
        .put('/'+address,  function(body) { return checkNockBody(body, expected); })
        .reply(200, ok);
};

exports.error = function(err) {
    if (err == undefined || err == '') {
        console.log('Default error handler.');
        throw new Error('Unexpected error');
    }
    else {
        console.log(err);
        var error = JSON.stringify(err);
        throw new Error('Unexpected error: '+error);
    }
};