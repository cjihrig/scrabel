#!/usr/bin/env node
'use strict';
var Bossy = require('bossy');
var Insync = require('insync');
var Features = require('../features.json');
var Scrabel = require('../lib');
var definition = {
  'in-dir': {
    description: 'Input directory',
    type: 'string',
    require: true
  },
  'out-dir': {
    description: 'Output directory',
    type: 'string',
    require: true
  }
};
var args = Bossy.parse(definition);

if (args instanceof Error) {
  console.error(args.message);
  process.exit(1);
}

var currentVersion = process.versions.node;
var blacklist = Scrabel.createBlacklist(currentVersion, Features);

Insync.waterfall([
  function(next) {
    Scrabel.files.getFilesFromArgs(args, next);
  },
  function(files, next) {
    Scrabel.transpile(files, blacklist, next);
  }
], function(err) {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  process.exit(0);
});
