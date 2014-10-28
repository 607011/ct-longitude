module.exports = function(grunt) {
  require('load-grunt-tasks')(grunt);
  grunt.initConfig({
  	pkg: grunt.file.readJSON('package.json'),
    concat: {
      dist: {
      	dest: 'build/js/ctlongitude.js',
        src: [ 'js/util.js', 'js/spectrum.js', 'js/ctlon.js' ]
  	 }
  	},
    cssmin: {
    	dist: {
          src: [ 'css/ctlon.css', 'css/spectrum.css' ],
          dest: 'build/css/default.css'
      }
    },
    uglify: {
      dist: {
        options: {
          banner: '// <%= grunt.template.today("dd.mm.yyyy") %> by <%= pkg.author %>\n',
          sourceMap: true
        },
      src: '<%= concat.dist.dest %>',
      dest: 'build/js/ctlongitude.min.js'
     }
   }
  });
  grunt.registerTask('default', ['concat', 'uglify', 'cssmin']);
};
