var Util = {};

Util.randInt = function(max) {
    return Math.floor(Math.random() * max);
};

// Pretty print an object
Util.pp = function(obj) {
    return JSON.stringify(obj, undefined, 2);
};

module.exports.Util = Util;