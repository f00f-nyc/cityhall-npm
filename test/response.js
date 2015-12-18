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
exports.history = {
    Response: 'Ok',
    History: [
        {
            "active": false,
            "override": "",
            "id": 12,
            "value": "1000",
            "datetime": new Date().toLocaleDateString(),
            "protect": false,
            "name": "app1",
            "author": "cityhall"
        },
        {
            "active": true,
            "override": "",
            "id": 12,
            "value": "50",
            "datetime": new Date().toLocaleDateString(),
            "protect": false,
            "name": "app1",
            "author": "test_dev"
        }
    ]
};
exports.children = {
    Response: 'Ok',
    path: "/app1/",
    children: [
        {
            "override": "",
            "path": "/app1/val1/",
            "id": 9,
            "value": "1000",
            "protect": false,
            "name": "val1"
        },
        {
            "override": "test_user",
            "path": "/app1/val1/",
            "id": 12,
            "value": "50",
            "protect": false,
            "name": "val1"
        }
    ]
};

exports.value = function (val, protect) {
    var ret = ok;
    ret.value = val;
    ret.protect = protect == true;
    return ret;
};

var checkNockBody = function(body, expected) {
    var expectedJson = JSON.stringify(expected);
    return body == expectedJson;
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