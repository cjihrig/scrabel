'use strict';
var Fs = require('fs');
var Path = require('path');
var Vm = require('vm');
var Babel = require('babel');
var Fse = require('fs-extra');
var Insync = require('insync');
var Semver = require('semver');
var transformsDir = Path.join(__dirname, '..', 'transforms');
var _blacklist = null;


module.exports.transpile = function(files, blacklist, callback) {
  var options = {blacklist: blacklist};

  Insync.each(files, function(file, next) {
    Babel.transformFile(file.input, options, function(err, result) {
      if (err) {
        return next(err);
      }

      Fse.outputFile(file.output, result.code, next);
    });
  }, callback);
};


module.exports.createBlacklist = function(currentVersion, features) {
  var versions = Object.keys(features);
  var blacklist = [];

  for (var i = 0; i < versions.length; ++i) {
    var version = versions[i];

    if (Semver.lt(currentVersion, version)) {
      break;
    }

    blacklist = blacklist.concat(features[version]);
  }

  return blacklist;
};


function tryTransform(code) {
  try {
    Vm.runInNewContext(code);
    return true;
  } catch (err) {
    return false;
  }
}


module.exports.detectBlacklist = function(callback) {
  if (_blacklist !== null) {
    return callback(null, _blacklist.slice());
  }

  Fs.readdir(transformsDir, function(err, files) {
    if (err) {
      return callback(err);
    }

    _blacklist = [];

    Insync.each(files, function(transform, next) {
      var file = Path.join(transformsDir, transform);

      Fs.readFile(file, 'utf8', function(err, code) {
        if (err) {
          return next(err);
        }

        if (tryTransform(code)) {
          _blacklist.push(transform);
        }

        next();
      });
    }, function(err) {
      if (err) {
        return callback(err);
      }

      callback(null, _blacklist.slice());
    });
  });
};
