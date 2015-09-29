'use strict';
var Fs = require('fs');
var Path = require('path');
var Glob = require('glob');
var Insync = require('insync');


function getPathType(path, callback) {
  Fs.stat(path, function(err, stats) {
    if (err) {
      if (err.code === 'ENOENT') {
        return callback(null, null);
      }

      return callback(err);
    }

    if (stats.isFile()) {
      return callback(null, 'file');
    } else if (stats.isDirectory()) {
      return callback(null, 'directory');
    }

    return callback(null, 'unknown');
  });
}


function getInputPaths(input, callback) {
  Glob(input, {realpath: true}, function(err, paths) {
    if (err) {
      return callback(err);
    }

    Insync.map(paths, function(path, next) {
      getPathType(path, function(err, type) {
        if (err) {
          return next(err);
        }

        next(null, {
          path: path,
          type: type
        });
      });
    }, callback);
  });
}


function mapDirectoryToDirectory(inputDirectory, outputDirectory, callback) {
  Fs.readdir(inputDirectory, function(err, results) {
    if (err) {
      return callback(err);
    }

    var files = [];

    Insync.each(results, function(file, next) {
      var inputPath = Path.join(inputDirectory, file);

      Fs.stat(inputPath, function(err, stats) {
        if (err) {
          return next(err);
        }

        if (stats.isFile()) {
          files.push({
            input: inputPath,
            output: Path.join(outputDirectory, file)
          });
        }

        next();
      });
    }, function(err) {
      callback(err, files);
    });
  });
}


function mapFileToFile(input, output, callback) {
  callback(null, [{
    input: input,
    output: output
  }]);
}


function mapFileToDirectory(input, output, callback) {
  callback(null, [{
    input: input,
    output: Path.join(output, Path.basename(input))
  }]);
}


module.exports.getFilesFromArgs = function(args, callback) {
  var input = args.input;
  var output = args.output;

  Insync.parallel({
    getInputs: function(next) {
      getInputPaths(input, next);
    },
    getOutputType: function(next) {
      getPathType(output, next);
    }
  }, function(err, results) {
    if (err) {
      return callback(err);
    }

    var inputs = results.getInputs;
    var outputType = results.getOutputType;

    if (inputs.length === 0) {
      return callback(null, []);
    } else if (outputType === 'unknown') {
      return callback(new TypeError('Cannot map input to output ' + output));
    } else if (inputs.length === 1) {
      var inp = inputs[0];
      var path = inp.path;
      var inputType = inp.type;

      if (inputType === 'file') {
        if (outputType === 'directory') {
          return mapFileToDirectory(path, output, callback);
        }

        return mapFileToFile(path, output, callback);
      } else if (inputType === 'directory') {
        if (outputType === 'file') {
          return callback(new TypeError('Cannot map input to output ' + output));
        }

        return mapDirectoryToDirectory(path, output, callback);
      }
    }

    // TODO: Complete glob handling
    return callback(new Error('globs are not supported yet'));
  });
};
