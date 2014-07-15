[![build status](https://secure.travis-ci.org/doug-martin/grunt-link.png)](http://travis-ci.org/doug-martin/grunt-link)

# grunt-link

Grunt task to handle the linking of local dependencies.

##Use Case

This task is useful if you have a large app and instead of requiring directories directly that should be their own module you can now develop your modules independently and link them using this task.

This allows you to develop as if it were its own module and if you ever decide to publish your modules you just have to change your `package.json` and your code does not have to change. 

This also allows you develop your modules in isolation with their own respective dependencies and tests.

For example assume you have an app of the following structure.

```
my-node-app
	-models
		-package.json
	-logger
		-package.json
	-config
		-package.json
	-routes
		-package.json		
	-webapp
		-package.json
```

You could develop each module in isolation and link them. 

## Getting Started

Install this grunt plugin next to your project's [grunt.js gruntfile][getting_started] with: `npm install grunt-link`

Then add this line to your project's `grunt.js` gruntfile:

```javascript
grunt.loadNpmTasks('grunt-link');
```
[grunt]: http://gruntjs.com/
[getting_started]: https://github.com/gruntjs/grunt/blob/master/docs/getting_started.md

## Documentation 


In each modules `package.json` add a `linkDependencies` array which is an array of local modules that need to be linked.

```javascript

{
    "name": "my-module",
    "version" : "0.0.1",
    "linkDependencies": [
    	"module-a", 
    	"module-b", 
    	"module-c"
   	]
}

```

To run from the command line you can run `grunt link` which will link your modules.


###Cyclic Dependencies

When running grunt link will determine the link order of your modules, if it detects cyclic dependencies while determining the link order then it will produce an error.

To prevent the warning for a single module you can add `!` to the beginning of the dependency name in the `linkDependencies` array.

```javascript

{
    "name": "my-module",
    "version" : "0.0.1",
    "linkDependencies": [
        "!module-a", 
        "module-b", 
        "module-c"
    ]
}

```
**Note** you will not be able to directly require the module you will have to require lazily.

**`ignoreCyclic` default `false`**

To prevent this default behavior you can add the following to your `grunt.js` file.

```javascript

grunt.initConfig({
    link : {
        ignoreCyclic : true
    }
});

```

**`dir`**

By default `grunt-link` will look for modules in the same directory as your `grunt.js` file if you wish to link modules in another directory you can add the following to your `grunt.js` file.

```javascript
grunt.initConfig({
    link : {
        dir : "location/of/your/modules"
    }
});
```

**Note** `dir` is relative to to grunt.js file.

**`install` default true**

`grunt-link` will run `npm install` on each linked module if you wish to just link your modules you can set this option to false.

```javascript
grunt.initConfig({
    link : {
        install : false
    }
});
```

**`clean` default true**

`grunt-link` will by default remove the node_modules directory to prevent this set `clean` to false.

```javascript
grunt.initConfig({
    link : {
        clean : false
    }
});
```

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [grunt][grunt].

## Release History

2014-07-16 v0.2.0  
- Using symlinks instead of `npm link` to improve performance.
- Improved logging.

2012-12-30 v0.0.1 Initial release.

## License
Copyright (c) 2012 Doug Martin  
Licensed under the MIT license.
