/**
 * This module is a user-friendly wrapper to lib.js  It maintains state (via
 * isLoggedIn) and will ensure the user is logged in before attempting any
 * of the operations.
 *
 * @param url - the City Hall URL. It will throw an exception without it.
 * @param name - the name to use.  If undefined, will use machine name
 * @param password - the plaintext password.  If undefined, it will use ''
 */
module.exports = function(url, name, password) {
    var self = require('./lib.js')(url, name, password);

    var isLoggedIn = function() {
        return self.getName() != '';
    };

    var ensureLoggedIn = function(callback, func) {
        if (!isLoggedIn()) {
            return self.login(function (err, data) {
                if (err) {
                    return callback(err);
                }
                func();
            });
        }

        func();
    };

    /********************************
     * The actual object that will be returned to the user.
     */
    return {
        /**
         * This is a pseudo enum to be used for setting/getting rights
         */
        Rights: {
            None: 0,
            Read: 1,
            ReadProtected: 2,
            Write: 3,
            Grant: 4
        },

        /**
         * @returns {boolean} - true if logged in
         */
        isLoggedIn: function() { return isLoggedIn();  },

        /**
         * This function logs into City Hall.  It is not required to be called,
         * If it isn't called explicitly, it will be called by the first
         * operation to call City Hall. No-op if already logged in.
         */
        login: function(callback) {
            if (this.isLoggedIn()) { return; }
            self.login(callback);
        },

        /**
         * This function logs out of City Hall.  In order to use any of the
         * other functions, you must call login() again.
         */
        logout: function(callback) {
            if (this.isLoggedIn()) {
                self.logout(callback);
            }
        },

        /**
         * @returns {string} - current logged in user. '' if not logged in.
         */
        userName: function() {
            return self.getName();
        },

        /**
         * @returns {string} - the default environment.  If not set, returns ''
         */
        defaultEnvironment: function() {
            return self.defaultEnvironment();
        },

        /**
         * Sets the default environment
         * @param env {string} - environment to set to default, can be the same as
         *      this.defaultEnvironment()
         */
        setDefaultEnvironment: function(env, callback) {
            ensureLoggedIn(callback, function() {
                self.setDefaultEnvironment(env, callback);
            });
        },

        /**
         * Views all the users for an environment
         * @param env {string} - the environment to query users for
         */
        viewUsers: function(env, callback) {
            ensureLoggedIn(callback, function() {
               self.viewUsers(env, callback);
            });
        },

        /**
         * Creates an empty enviornment. By default, the logged in user will
         * have Grant permissions to it.
         * @param env {string} - the environment to create, must be unique/unused.
         */
        createEnvironment: function(env, callback) {
            ensureLoggedIn(callback, function() {
                self.createEnvironment(env, callback);
            });
        },

        /**
         * Returns the information about a user: the environments he has
         * access to, and the level of permissions for each
         * @param user {string} - the user to query, it must exist.
         */
        getUser: function(user, callback) {
            ensureLoggedIn(callback, function() {
                self.getUser(user, callback);
            });
        },

        /**
         * Creates a user with the given password.
         * @param user {string} - the name of the user, must be unique/unused.
         * @param password {string} - the plaintext password, it will be hashed
         *   before being sent across the wire.
         */
        createUser: function(user, password, callback) {
            ensureLoggedIn(callback, function() {
                self.createUser(user, password, callback);
            });
        },

        /**
         * Updates the password of the current logged in user.
         * @param password {string} - the plaintext password, it will be hashed
         *   before being sent across the wire.
         */
        updatePassword: function(password, callback) {
            ensureLoggedIn(callback, function() {
                self.updatePassword(password, callback);
            });
        },

        /**
         * Deletes a user. Deletion can only happen if a user's environments
         * have Grant permissions for the current user, or the user has Write
         * permissions to the User environment.  If deletion fails, this will
         * callback err
         * @param user {string} - the user to delete
         */
        deleteUser: function(user, callback) {
            ensureLoggedIn(callback, function() {
                self.deleteUser(user, callback);
            });
        },

        /**
         * Will give a user rights to a particular environment.  The logged in
         * user must have Grant permission on that environment.
         * @param user {string} -
         * @param env {string} -
         * @param rights {string} -
         */
        grant: function (user, env, rights, callback) {
            if (rights == undefined) {
                return callback('rights are undefined');
            } else if (rights < this.Rights.None || rights > this.Rights.Grant) {
                return callback('rights out of range: ' + rights);
            } else if (user == undefined) {
                return callback('user is undefined');
            } else if (env == undefined) {
                return callback('environment is undefined');
            }
            ensureLoggedIn(callback, function() {
                self.grant(user, env, rights, callback);
            });
        },

        /**
         * This function will return one or more values from the server.
         * @param val - multiple options:
         *  {string} - a single path to the value on the default environment, the
         *    appropriate override will be retrieved.
         *  {object} - an object which must have a url property and optional
         *    raw, override, and/or environment properties.  The 'raw' property
         *    is the only way to retrieve the protect bit, as it returns the
         *    entire response from the server.
         *  {collection} - an object which can have 1 or more properties, which
         *    cannot be named url.  Each property must have a url property and
         *    may contain optional raw, override, and/or environment properties.
         */
        getVal: function(val, callback) {
            ensureLoggedIn(callback, function() {
                self.getVal(val, callback);
            })
        },

        /**
         * This function will set a value.
         * @param uri {object} - identifier of the value to be set; Must contain:
         *      environment {string} - the environment to set this on. Must be
         *          specified, even if the value being set is on defaultEnvironment()
         *      path {string} - the path on the environment
         *      override {string} - the override to set. Must be specified,
         *          even if it is the default ('') one.
         * @param value - what to set the value to.  If this is a string, it
         *  will simply set the uri to that.  If it is an object, it must expose
         *  one or both of:
         *      value {string} - the value to set it to
         *      protect {bool} - the protect bit
         *  If it is an Array, it must be an array of the aforementioned objects,
         *  containing either a value or protect property or both, as well as an
         *  environment, path, and override property.  If this value is an Array,
         *  the uri value will be ignored   .
         */
        setVal: function(uri, value, callback) {
            ensureLoggedIn(callback, function() {
                self.setVal(uri, value, callback);
            });
        },

        /**
         * This function will delete a value.
         * @param uri {object} - identifier of the value to be set; Must contain:
         *      environment {string} - the environment to set this on. Must be
         *          specified, even if the value being set is on defaultEnvironment()
         *      path {string} - the path on the environment
         *      override {string} - the override to set. Must be specified,
         *          even if it is the default ('') one.
         */
        deleteVal: function(uri, callback) {
            ensureLoggedIn(callback, function() {
                self.deleteVal(uri, callback);
            });
        },

        /**
         * This function will retrieve the history for a specific value.
         * @param uri {object} - identifier of the value to be set; Must contain:
         *      environment {string} - the environment to set this on. Must be
         *          specified, even if the value being set is on defaultEnvironment()
         *      path {string} - the path on the environment
         *      override {string} - the override to set. Must be specified,
         *          even if it is the default ('') one.
         */
        getHistory: function(uri, callback) {
            ensureLoggedIn(callback, function() {
                self.getHistory(uri, callback);
            });
        },

        /**
         * This function will retrieve children given an environment and path.
         * The object returned will have two properties: path (the path passed
         * in), and children (an array of all children on that path).
         *
         * @param env {string} - the environment to query
         * @param path {string} - the path on that environment
         */
        getChildren: function(env, path, callback) {
            ensureLoggedIn(callback, function() {
                self.getChildren(env, path, callback);
            });
        }
    };
};