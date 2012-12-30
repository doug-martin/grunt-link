"use strict";


module.exports = function (grunt, options) {


    var fs = require("fs"),
        util = require("util"),
        path = require("path"),
        comb = require("comb"),
        helper = require("./link_helper")(options.dir || process.cwd()),
        getPackageName = helper.getPackageName,
        shouldLink = helper.shouldLink,
        normalizeName = helper.normalizeName,
        isBoolean = comb.isBoolean,
        execP = comb.wrap(require("child_process").exec),
        rimraf = comb.wrap(require("rimraf")),
        string = comb.string,
        style = string.style;

    var log = grunt.log, verbose = grunt.verbose, error = grunt.log.error.bind(grunt.log);

    var npmOptions = options.npm || {};

    function exec(cmds) {
        if (!comb.isArray(cmds)) {
            cmds = [cmds];
        }
        return comb.async.array(cmds).forEach(function (cmd) {
            if (cmd) {
                verbose.ok(util.format("Executing %s", cmd));
                return execP(cmd);
            }
        }, 1);
    }

    var sortedDeps = helper.findSortAndNormalizeDeps(), cyclic = sortedDeps.cyclic;
    if (cyclic.length && !options.ignoreCyclic) {
        var errors = ["Cyclic dependency detected please check your dependency graph."];
        cyclic.forEach(function (cyc) {
            errors.push(util.format("%s => %s", cyc.pkg, cyc.deps.join(" ")));
        });
        return new comb.Promise().error(new Error(errors.join("\n")));
    }

    log.writeln("Linking packages");
    var cwd = process.cwd();
    return comb.async.array(sortedDeps.links).forEach(function (pkg) {
        try {
            var cmds = [],
                location = pkg[0],
                deps = pkg[1],
                install = isBoolean(pkg[2]) ? pkg[2] : true,
                loc = path.resolve(cwd, normalizeName(location));
            log.ok("Linking " + getPackageName(loc));
            process.chdir(loc);
            if (deps.length) {
                cmds.push("npm link " + deps.join(" "));
            }
            if (options.install) {
                install && cmds.push("npm install");
            }
            shouldLink(location) && cmds.push("npm link");
            if (install) {

                return rimraf(path.resolve(loc, "./node_modules")).chain(function () {
                    return exec(cmds);
                });
            } else {
                return exec(cmds);
            }
        } catch (e) {
            console.log(e.stack);
            throw e;
        }
    }, 1);

};


