'use strict';
var Fs = require('fs');
var Path = require('path');
var Fse = require('fs-extra');


module.exports.getFilesFromArgs = function(args, callback) {
  var inputDirectory = args['in-dir'];
  var outputDirectory = args['out-dir'];

  // TODO: Handle directories recursively
  // TODO: Only handle JavaScript files
  // TODO: Handle globs
  Fs.readdir(inputDirectory, function(err, results) {
    if (err) {
      return callback(err);
    }

    var files = [];

    for (var i = 0; i < results.length; ++i) {
      var file = results[i];

      files.push({
        input: Path.join(inputDirectory, file),
        output: Path.join(outputDirectory, file)
      });
    }

    Fse.ensureDir(outputDirectory, function(err) {
      callback(err, files);
    });
  });
};
