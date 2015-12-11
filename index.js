var Rights = {
    None: 0,
    Read: 1,
    ReadProtected: 2,
    Write: 3,
    Grant: 4
};

module.exports = function(url, name, password) {
    var self = require('./lib.js')(url, name, password);

    /********************************
     * The actual object that will be returned to the user.
     */
    return {
        /**
         * This is a pseudo enum to be used for setting/getting rights
         */
        Rights: Rights,

        /**
         * @returns {boolean} - true if logged in
         */
        isLoggedIn: function() {
            return self.getName() != '';
        },

        /**
         * This function logs into City Hall.  It is not required to be called,
         * If it isn't called explicitly, it will be called by the first
         * operation to call City Hall. No-op if already logged in.
         */
        login: function(err, callback) {
            if (this.isLoggedIn()) { return; }
            self.login(err, callback);
        },

        /**
         * This function logs out of City Hall.  In order to use any of the
         * other functions, you must call login() again.
         */
        logout: function(err, callback) {
            if (this.isLoggedIn()) {
                self.logout(err, callback);
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
        setDefaultEnvironment: function(env, err, callback) {
            if (!this.isLoggedIn()) {
                return this.login(err, function() { self.setDefaultEnvironment(env, err, callback) });
            }
            self.setDefaultEnvironment(env, err, callback);
        },

        /**
         * Views all the users for an environment
         * @param env {string} - the environment to query users for
         */
        viewUsers: function(env, err, callback) {
            if (!this.isLoggedIn()) {
                return this.login(err, function() { self.viewUsers(env, err, callback) });
            }
            self.viewUsers(env, err, callback);
        },

        /**
         * Creates an empty enviornment. By default, the logged in user will
         * have Grant permissions to it.
         * @param env {string} - the environment to create, must be unique/unused.
         */
        createEnvironment: function(env, err, callback) {
            if (!this.isLoggedIn()) {
                return this.login(err, function() { self.createEnvironment(env, err, callback); });
            }
            self.createEnvironment(env, err, callback);
        },

        /**
         * Returns the information about a user: the environments he has
         * access to, and the level of permissions for each
         * @param user {string} - the user to query, it must exist.
         */
        getUser: function(user, err, callback) {
            if (!this.isLoggedIn()) {
                return this.login(err, function() { self.getUser(user, err, callback); });
            }
            self.getUser(user, err, callback);
        },

        /**
         * Creates a user with the given password.
         * @param user {string} - the name of the user, must be unique/unused.
         * @param password {string} - the plaintext password, it will be hashed
         *   before being sent across the wire.
         */
        createUser: function(user, password, err, callback) {
            if (!this.isLoggedIn()) {
                return this.login(err, function() { self.createUser(user, password, err, callback); });
            }
            self.createUser(user, password, err, callback);
        },

        /**
         * Updates the password of the current logged in user.
         * @param password {string} - the plaintext password, it will be hashed
         *   before being sent across the wire.
         */
        updatePassword: function(password, err, callback) {
            if (!this.isLoggedIn()) {
                return this.login(err, function() { self.updatePassword(password, err, callback); });
            }
            self.updatePassword(password, err, callback);
        },

        /**
         * Deletes a user. Deletion can only happen if a user's environments
         * have Grant permissions for the current user, or the user has Write
         * permissions to the User environment.  If deletion fails, this will
         * callback err
         * @param user {string} - the user to delete
         */
        deleteUser: function(user, err, callback) {
            if (!this.isLoggedIn()) {
                return this.login(err, function () { self.deleteUser(user, err, callback); });
            }
            self.deleteUser(user, err, callback);
        },

        /**
         * Will give a user rights to a particular environment.  The logged in
         * user must have Grant permission on that environment.
         * @param user {string} -
         * @param env {string} -
         * @param rights {string} -
         */
        grant: function (user, env, rights, err, callback) {
            if (rights == undefined) {
                return err('rights are undefined');
            } else if (rights < Rights.None || rights > Rights.Grant) {
                return err('rights out of range: ' + rights);
            } else if (user == undefined) {
                return err('user is undefined');
            } else if (env == undefined) {
                return err('environment is undefined');
            } else if (!this.isLoggedIn()) {
                return this.login(err, function () { self.grant(user, env, rights, err, callback); });
            }
            self.grant(user, env, rights, err, callback);
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
        getVal: function(val, err, callback) {
            if (!this.isLoggedIn()) {
                return this.login(err, function () { self.getVal(val, err, callback); });
            }
            self.getVal(val, err, callback);
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
        setVal: function(uri, value, err, callback) {
            if (!this.isLoggedIn()) {
                return this.login(err, function () { self.setVal(uri, value, err, callback); });
            }
            self.setVal(uri, value, err, callback);
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
        deleteVal: function(uri, err, callback) {
            if (!this.isLoggedIn()) {
                return this.login(err, function () { self.deleteVal(uri, err, callback); });
            }
            self.deleteVal(uri, err, callback);
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
        getHistory: function(uri, err, callback) {
            if (!this.isLoggedIn()) {
                return this.login(err, function() { self.getHistory(uri, err, callback); });
            }
            self.getHistory(uri, err, callback);
        },

        /**
         * This function will retrieve children given an environment and path.
         * The object returned will have two properties: path (the path passed
         * in), and children (an array of all children on that path).
         *
         * @param env {string} - the environment to query
         * @param path {string} - the path on that environment
         */
        getChildren: function(env, path, err, callback) {
            if (!this.isLoggedIn()) {
                return this.login(err, function() { self.getChildren(env, path, err, callback); });
            }
            self.getChildren(env, path, err, callback);
        }
    };
};