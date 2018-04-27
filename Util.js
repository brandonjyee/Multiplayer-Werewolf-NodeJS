var Util = {};

Util.randInt = function(max) {
    return Math.floor(Math.random() * max);
};

// Pretty print an object
Util.pp = function(obj) {
    return JSON.stringify(obj, undefined, 2);
};

// Return a uuid
Util.uuidv4 = function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
    /* // Cryptographically secure version
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    )*/
}

/**
 * Shuffles array in place. Fisher-Yates algo.
 * @param {Array} a items An array containing the items.
 */
Util.shuffle = function (a) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}

/**
 * Shuffles array in place. Fisher-Yates algo. ES6 version
 * Currently slower b/c of destructuring assignment as of 2017. 
 * Wait til browsers optimize for it.
 * @param {Array} a items An array containing the items.
 */
// function shuffle(a) {
//     for (let i = a.length - 1; i > 0; i--) {
//         const j = Math.floor(Math.random() * (i + 1));
//         [a[i], a[j]] = [a[j], a[i]];
//     }
//     return a;
// }

module.exports.Util = Util;