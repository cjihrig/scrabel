'use strict';
var Bossy = require('bossy');
var Insync = require('insync');
var Features = require('../features.json');
var Files = require('./files');
var Scrabel = require('./');
var definition = {
  'i': {
    description: 'Input glob to transpile',
    alias: 'input',
    type: 'string',
    require: true
  },
  'o': {
    description: 'Location to write transpiled files',
    alias: 'output',
    type: 'string',
    require: true
  }
};


module.exports.run = function(argv, callback) {
  var args = Bossy.parse(definition, {argv: argv});

  if (args instanceof Error) {
    return callback(args);
  }

  var currentVersion = process.versions.node;
  var blacklist = Scrabel.createBlacklist(currentVersion, Features);

  Insync.waterfall([
    function(next) {
      Files.getFilesFromArgs(args, next);
    },
    function(files, next) {
      Scrabel.transpile(files, blacklist, next);
    }
  ], callback);
};
