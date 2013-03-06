module.exports = function (grunt) {
    "use strict";

    // Project configuration.
    grunt.initConfig({
        nodeunit: {
            all: ['test/link_test.js']
        },
        watch: {
            files: '<config:lint.files>',
            tasks: 'default'
        },
        jshint: {
            all: ['grunt.js', 'tasks/**/*.js', 'test/**/*.js'],
            options: {
                curly: true,
                eqeqeq: true,
                immed: true,
                latedef: true,
                newcap: true,
                noarg: true,
                sub: true,
                undef: true,
                boss: true,
                eqnull: true,
                node: true,
                es5: true
            },
            globals: {}
        },
        link: {
            dir: "test/test-project"
        }
    });

    // Load local tasks.
    grunt.loadTasks('tasks');
    grunt.loadNpmTasks('grunt-contrib-nodeunit');
    grunt.loadNpmTasks('grunt-contrib-jshint');

    // Default task.
    grunt.registerTask('test', ['link','nodeunit:all']);
    grunt.registerTask('default', ['jshint','test']);

};
