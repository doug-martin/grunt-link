"use strict";


module.exports = function (grunt, options) {


    var util = require("util"),
        path = require("path"),
        comb = require("comb"),
        helper = require("./link_helper")(options.dir || process.cwd()),
        getPackageName = helper.getPackageName,
        shouldLink = helper.shouldLink,
        normalizeName = helper.normalizeName,
        isBoolean = comb.isBoolean,
        execP = comb.wrap(require("child_process").exec),
        rimraf = comb.wrap(require("rimraf")),
        log = grunt.log,
        verbose = grunt.verbose,
        sortedDeps = helper.findSortAndNormalizeDeps(),
        cyclic = sortedDeps.cyclic,
        errors = [],
        cwd = process.cwd();

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


    if (cyclic.length && !options.ignoreCyclic) {
        errors.push(["Cyclic dependency detected please check your dependency graph."]);
        cyclic.forEach(function (cyc) {
            errors.push(util.format("%s => %s", cyc.pkg, cyc.deps.join(" ")));
        });
        return new comb.Promise().errback(new Error(errors.join("\n")));
    }

    log.writeln("Linking packages");
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
            if (options.install && install) {
                cmds.push("npm install");
            }
            if (shouldLink(location)) {
                cmds.push("npm link");
            }
            if (install) {
                return options.clean ? rimraf(path.resolve(loc, "./node_modules")).chain(function () {
                    return exec(cmds);
                }) : exec(cmds);
            } else {
                return exec(cmds);
            }
        } catch (e) {
            console.log(e.stack);
            throw e;
        }
    }, 1);

};


