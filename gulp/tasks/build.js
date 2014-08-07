var gulp = require('gulp');
var browserify = require("gulp-browserify");
var uglify = require("gulp-uglify");
var rename = require("gulp-rename");

gulp.task("build", function() {

    gulp.src("src/atomReact.js")
        .pipe(browserify())
        .pipe(gulp.dest("build"));

    gulp.src("build/atomReact.js")
        .pipe(uglify())
        .pipe(rename({ext: ".min.js"}))
        .pipe(gulp.dest("build"));

});