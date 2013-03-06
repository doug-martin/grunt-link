"use strict";

var grunt = require('grunt'),
    fs = require("fs"),
    path = require("path");

function isLink(loc) {
    return fs.lstatSync(path.resolve(process.cwd(), loc)).isSymbolicLink();
}

exports.link = {
    'link': function (test) {
        test.expect(4);

        // tests here
        test.ok(isLink("test/test-project/moduleB/node_modules/module-a"));
        test.ok(isLink("test/test-project/moduleC/node_modules/module-a"));
        test.ok(isLink("test/test-project/moduleC/node_modules/module-b"));
        test.equal(grunt.file.expand("test/test-project/moduleA/node_modules").length, 0);
        test.done();
    }
};
