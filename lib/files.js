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

module.exports.getPathType = getPathType;


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
    }, function(err, results) {
      if (err) {
        return callback(err);
      }

      callback(null, results);
    });
  });
}

module.exports.getInputPaths = getInputPaths;


function mapDirectoryToDirectory(inputDirectory, outputDirectory, callback) {
  Fs.readdir(inputDirectory, function(err, results) {
    if (err) {
      return callback(err);
    }

    var files = [];

    Insync.each(results, function(file, next) {
      var inputPath = Path.join(inputDirectory, file);

      if (Path.extname(inputPath) !== '.js') {
        return setImmediate(next);
      }

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
      if (err) {
        return callback(err);
      }

      callback(null, files);
    });
  });
}

module.exports.mapDirectoryToDirectory = mapDirectoryToDirectory;


function mapFileToFile(input, output, callback) {
  callback(null, [{
    input: input,
    output: output
  }]);
}

module.exports.mapFileToFile = mapFileToFile;


function mapFileToDirectory(input, output, callback) {
  callback(null, [{
    input: input,
    output: Path.join(output, Path.basename(input))
  }]);
}

module.exports.mapFileToDirectory = mapFileToDirectory;


function mapGlobToDirectory(inputs, output, base, callback) {
  var files = [];

  for (var i = 0; i < inputs.length; ++i) {
    var input = inputs[i];
    var path = input.path;

    if (input.type !== 'file' || Path.extname(path) !== '.js') {
      continue;
    }

    files.push({
      input: path,
      output: Path.join(output, path.replace(base, ''))
    });
  }

  return callback(null, files);
}

module.exports.mapGlobToDirectory = mapGlobToDirectory;


function getFilesFromArgs(args, callback) {
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
    }

    var firstInput = inputs[0];
    var path = firstInput.path;
    var inputType = firstInput.type;

    // Transpile a single file
    if (inputs.length === 1 && inputType === 'file') {
      if (outputType === 'directory') {
        return mapFileToDirectory(path, output, callback);
      }

      return mapFileToFile(path, output, callback);
    }

    if (outputType === 'file') {
      return callback(new TypeError('Cannot map input to output ' + output));
    }

    // Transpile a single directory (non-recursive)
    if (inputs.length === 1 && inputType === 'directory') {
      return mapDirectoryToDirectory(path, output, callback);
    }

    // Transpile a glob
    if (inputType === 'file') {
      path = Path.dirname(path);
    }

    mapGlobToDirectory(inputs, output, path, callback);
  });
}

module.exports.getFilesFromArgs = getFilesFromArgs;
