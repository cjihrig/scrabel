'use strict';
var Fs = require('fs');
var Babel = require('babel');
var Insync = require('insync');
var Semver = require('semver');
var Files = require('./files');


module.exports.files = Files;


module.exports.transpile = function(files, blacklist, callback) {
  var options = {blacklist: blacklist};

  Insync.each(files, function(file, next) {
    Babel.transformFile(file.input, options, function(err, result) {
      if (err) {
        return next(err);
      }

      Fs.writeFile(file.output, result.code, next);
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
