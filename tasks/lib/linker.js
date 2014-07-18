"use strict";

module.exports = function (grunt, npm, options) {

    var util = require("util"),
        path = require("path"),
        fs = require("fs"),
        comb = require("comb"),
        helper = require("./link_helper")(options.dir || process.cwd()),
        getPackageName = helper.getPackageName,
        shouldLink = helper.shouldLink,
        normalizeName = helper.normalizeName,
        isBoolean = comb.isBoolean,
        execP = require("child_process").spawn,
        rimraf = comb.wrap(require("rimraf")),
        log = grunt.log,
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
                log.debug(util.format("Executing %s %s", cmd.cmd, cmd.args.join(" ")));
                var child = execP(cmd.cmd, cmd.args, { stdio: "inherit" }), 
                    ret = new comb.Promise();

                child.on("close", function (code) {
                    if (code !== 0) {
                        ret.errback(new Error("ps process exited with code " + code));
                    } else {
                        ret.callback();
                    }
                });
                child.on("error", ret.errback);
                return ret;
            }
        }, 1);
    }

    function createModulesDir (dir, deps) {
        var statP = new comb.Promise();
        if (deps.length < 1) {
            log.debug("No linked dependencies needed");
            statP.callback();
        } else {
            fs.stat(dir, function (err, stats) {
                if (!comb.isNull(err)) {
                    fs.mkdirSync(dir);
                    log.debug("Created " + dir);
                }
                statP.callback();
            });
        }
        return statP;
    }

    function chdir(location) {
        var newLoc = path.resolve(cwd, normalizeName(location))
        log.debug("Changing directory to " + newLoc);
        process.chdir(newLoc);
    }

    function cleanUpOldLinks(pkg) {
        //clean up old links
        try {
            var location = pkg[0],
                deps = pkg[1],
                install = isBoolean(pkg[2]) ? pkg[2] : true,
                loc = path.resolve(cwd, normalizeName(location)),
                removeDirs = [],
                cleanPromise;
            if (deps.length) {
                if (deps.length) {
                    deps.forEach(function (dir) {
                        removeDirs.push(path.resolve(loc, "./node_modules", dir));
                    });
                }
            }
            if (options.clean && install) {
                log.debug(util.format("Executing rimraf %s", loc+"/node_modules"));
                cleanPromise = rimraf(path.resolve(loc, "./node_modules"));
            } else {
                cleanPromise = comb.async.array(removeDirs).forEach(function (dir) {
                    log.debug(util.format("Executing rimraf %s", dir));
                    return rimraf(dir);
                });
            }
            return cleanPromise.chain(function () {
                if (shouldLink(pkg[0])) {
                    return exec([
                        {cmd: "npm", args: ["unlink", getPackageName(pkg[0]), "--global"]}
                    ]);
                }
            });
        } catch (e) {
            console.log(e.stack);
            throw e;
        }
    }

    // detect cyclic references
    if (cyclic.length && !options.ignoreCyclic) {
        errors.push(["Cyclic dependency detected please check your dependency graph."]);
        cyclic.forEach(function (cyc) {
            errors.push(util.format("%s => %s", cyc.pkg, cyc.deps.join(" ")));
        });
        return new comb.Promise().errback(new Error(errors.join("\n")));
    }

    log.subhead("Cleaning modules");
    return comb.async.array(sortedDeps.links)
        .forEach(function (pkg) {
            // clean links
            return cleanUpOldLinks(pkg);
        }, 1)
        .forEach(function (pkg, i) {
            // create links
            if (i === 0) {
                log.subhead("Linking modules");
            }
            if (isBoolean(pkg[2]) ? pkg[2] : true) {
                return exec({ cmd: "ln", args: ["-s", getPackageName(pkg[0]), npm.globalDir]});
            }
        }, 1)
        .forEach(function (pkg, i) {
            //install pkg
            if (i === 0) {
                log.subhead("Installing linked modules");
            }
            if (isBoolean(pkg[2]) ? pkg[2] : true && options.install) {
                log.debug(util.format("==== %s ====", getPackageName(pkg[0])));
                chdir(pkg[0]);
                return exec({cmd: "npm", args: ["install"]});
            }
        }, 1)
        .forEach(function (pkg, i) {
            //install link deps
            var linkP, modulesDir = path.join(pkg[0], "node_modules");
            if (i === 0) {
                log.subhead("Installing linked dependencies");
            }
            log.debug(util.format("==== %s ====", getPackageName(pkg[0])));
            if (shouldLink(pkg[0])) {
                linkP = createModulesDir(modulesDir, pkg[1]);
            } else {
                //return comb.resolved();
                linkP = comb.resolved();
            }
            return linkP.chain(function () {
                //link deps
                var cmds = [], deps = pkg[1];
                if (deps.length) {
                    deps.forEach(function (dep) {
                        var src = path.resolve(npm.globalDir, dep),
                            dest = path.join(modulesDir, dep);
                        cmds.push({cmd: "ln", args: ["-s", src, dest]});
                    });
                }
                return exec(cmds);
            });
        },1);
};
