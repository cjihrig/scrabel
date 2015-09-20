'use strict';
var ChildProcess = require('child_process');
var Os = require('os');
var Path = require('path');
var Babel = require('babel');
var Code = require('code');
var Lab = require('lab');
var Features = require('../features.json');
var Scrabel = require('../lib');

var lab = exports.lab = Lab.script();
var expect = Code.expect;
var describe = lab.describe;
var it = lab.it;

Code.settings.truncateMessages = false;
Code.settings.comparePrototypes = false;

var fixturesDirectory = Path.join(__dirname, 'fixtures');
var outputDirectory = Path.join(Os.tmpdir(), 'scrabel');

describe('Scrabel', function() {
  describe('transpile()', function() {
    it('transpiles input files using babel', function(done) {
      // TODO: Add test
      done();
    });

    it('errors when transpilation fails', function(done) {
      var transformFile = Babel.transformFile;
      var files = [{input: 'foo', output: 'bar'}];

      Babel.transformFile = function(file, options, callback) {
        Babel.transformFile = transformFile;
        callback(new Error('foo'));
      };

      Scrabel.transpile(files, [], function(err) {
        expect(err instanceof Error).to.equal(true);
        expect(err.message).to.equal('foo');
        done();
      });
    });
  });

  describe('createBlacklist()', function() {
    it('blacklists features included in every release', function(done) {
      var blacklist = Scrabel.createBlacklist('100.0.0', Features);
      var allFeatures = [];

      Object.keys(Features).forEach(function(version) {
        allFeatures = allFeatures.concat(Features[version]);
      });

      expect(blacklist).to.deep.equal(allFeatures);
      done();
    });

    it('does not blacklist anything for old versions of node', function(done) {
      var blacklist = Scrabel.createBlacklist('0.10.0', Features);

      expect(blacklist).to.deep.equal([]);
      done();
    });
  });

  describe('CLI', function() {
    function runCLI(args) {
      return ChildProcess.fork('bin/scrabel', args);
    }

    it('transpiles a directory of files', function(done) {
      var cli = runCLI([
        '--in-dir',
        fixturesDirectory,
        '--out-dir',
        outputDirectory
      ]);

      cli.once('error', function(err) {
        expect(err).to.not.exist();
      });

      cli.once('close', function(code, signal) {
        expect(code).to.equal(0);
        expect(signal).to.equal(null);
        done();
      });
    });
  });
});
