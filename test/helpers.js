/**
 * This module defines a set of helper functions for the tests
 */
var test = require('tape');
var md5 = require('md5');
var response = require('./response.js');
var hostname = require('os').hostname();
var empty_function = function() {};

exports.hostname = hostname;

exports.newSettings = function(callback) {
    response.post('auth/', response.ok);
    response.get('auth/user/'+hostname+'/default/', response.value('dev'));

    var settings = require('../index.js')(response.url);
    settings.login(response.error, function() { callback(settings, empty_function ); });
};

exports.autoLogsIn = function(assert, callback) {
    response.post('auth/', response.ok);
    response.get('auth/user/'+hostname+'/default/', response.value('dev'));

    var settings = require('../index.js')(response.url);
    callback(settings, function () {
    console.log('calling assert.end()'); assert.end(); } );
};
