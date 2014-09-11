"use strict";

var path = require("path"),
    comb = require("comb"),
    fs = require("fs");

module.exports = function (baseDir) {


    function normalizePackageDeps(packageLinks) {
        Object.keys(packageLinks).forEach(function (key) {
            var deps = packageLinks[key];
            if (!deps) {
                packageLinks[key] = [];
            } else if (!Array.isArray(deps)) {
                packageLinks[key] = [deps];
            }
        });
        return packageLinks;
    }

    function shouldLink(name) {
        return name.match(/^!/) === null;
    }

    function normalizeName(name) {
        return name.replace(/^!/, "");
    }

    function getPackageName(loc) {
        return getPackage(path.resolve(baseDir, loc)).name;
    }

    function removeForced(arr) {
        return arr.filter(function (key) {
            return !key.match(/^!/);
        });
    }

    function findForced(arr) {
        return arr.filter(function (key) {
            return key.match(/^!/);
        }).map(function (key) {
                return key.replace(/^!/, "");
            });
    }


    function getPackage(loc) {
        return require(path.resolve(loc, "package.json"));
    }


    function gatherPackages() {
        var packages = {},
            files = fs.readdirSync(baseDir);
        files.forEach(function (file) {
            var filePath = path.resolve(baseDir, file),
                stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
                try {
                    packages[filePath] = getPackage(filePath);
                } catch (e) {
                    //squelch
                }
            }
        });
        return packages;
    }

    function findLinks() {
        var packages = gatherPackages(),
            ret = {};
        Object.keys(packages).forEach(function (location) {

            var linkDependencies = packages[location].linkDependencies || [];
            var uniqueDeps = comb(linkDependencies).unique();

            if (uniqueDeps.length < linkDependencies.length) {
                console.warn("Duplicate link dependencies in package ", location);
            }

            ret[location] = uniqueDeps;

        });
        return ret;
    }


    function removeResolved(resolved, keys, packageLinks) {
        resolved.forEach(function (r) {
            var packageName = getPackageName(normalizeName(r));
            if (keys.indexOf(r) !== -1) {
                keys.splice(keys.indexOf(r), 1);
            }
            keys.forEach(function (k) {
                var arr = packageLinks[k], isArr = Array.isArray(arr), index;
                if (isArr) {
                    index = arr.indexOf(packageName);
                    if (index !== -1) {
                        arr.splice(index, 1);
                    }
                } else if (!isArr && arr === r) {
                    packageLinks[k] = null;
                }
            });
        });
    }

    function findEmpties(ret, keys, resolved, packageLinks) {
        var didFind = false;
        keys.forEach(function (k) {
            var arr = packageLinks[k];
            if (!arr || (Array.isArray(arr) && !arr.length)) {
                ret.push([k, []]);
                resolved.push(k);
                didFind = true;
            }
        });
        if (didFind) {
            removeResolved(resolved, keys, packageLinks);
        }
        return didFind;
    }

    function sortByDeps(packageLinks) {
        var ret = [], resolved = [], keys = Object.keys(packageLinks), normalizedLinks = {}, postLinks = [], cyclic = [], foundEmpties;
        keys.forEach(function (key) {
            var links = packageLinks[key], normalizedName = normalizeName(key), forced;
            packageLinks[key] = removeForced(links);
            normalizedLinks[normalizedName] = removeForced(links);
            forced = findForced(links);
            if (forced.length) {
                postLinks.push([normalizedName, forced, false]);
            }
        });
        //find packages that dont require any other links
        //reduce down till we cant remove any deps that arent already there
        foundEmpties = findEmpties(ret, keys, resolved, packageLinks);
        while (foundEmpties) {
            //remove deps that are already resolved
            foundEmpties = findEmpties(ret, keys, resolved, packageLinks);
        }

        //if we have any keys left then there is a cyclic dep an it needs to be resolved
        if (keys.length) {
            keys.forEach(function (k) {
                cyclic.push({pkg: k, deps: normalizedLinks[normalizeName(k)]});
            });
        }
        ret.forEach(function (ret) {
            ret[1] = ret[1].concat(normalizedLinks[normalizeName(ret[0])]);
        });

        return {links: ret.concat(postLinks), cyclic: cyclic};
    }

    function findSortAndNormalizeDeps() {
        return sortByDeps(normalizePackageDeps(findLinks()));
    }

    return {
        getPackageName: getPackageName,
        shouldLink: shouldLink,
        normalizeName: normalizeName,
        normalizePackageDeps: normalizePackageDeps,
        findLinks: findLinks,
        sortByDeps: sortByDeps,
        findSortAndNormalizeDeps: findSortAndNormalizeDeps
    };


};


