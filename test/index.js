'use strict';
var ChildProcess = require('child_process');
var Os = require('os');
var Path = require('path');
var Babel = require('babel');
var Code = require('code');
var Fse = require('fs-extra');
var Lab = require('lab');
var Features = require('../features.json');
var Files = require('../lib/files');
var Scrabel = require('../lib');
var Cli = require('../lib/cli');

var lab = exports.lab = Lab.script();
var expect = Code.expect;
var describe = lab.describe;
var it = lab.it;

Code.settings.truncateMessages = false;
Code.settings.comparePrototypes = false;

var fixturesDirectory = Path.join(__dirname, '..', 'fixtures');
var outputDirectory = Path.join(process.cwd(), 'test-tmp');

describe('Scrabel', function() {
  lab.afterEach(function(done) {
    Fse.remove(outputDirectory, done);
  });

  describe('transpile()', function() {
    it('transpiles input files using babel', function(done) {
      var files = [
        {
          input: Path.join(fixturesDirectory, 'templateLiteral.js'),
          output: Path.join(outputDirectory, 'foo.js')
        }
      ];

      Scrabel.transpile(files, [], function(err) {
        expect(err).to.not.exist();
        done();
      });
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
      var blacklist = Scrabel.createBlacklist('0.8.0', Features);

      expect(blacklist).to.deep.equal([]);
      done();
    });
  });

  describe('detectBlacklist()', function() {
    it('uses feature detection to create blacklist', function(done) {
      Scrabel.detectBlacklist(function(err, blacklist) {
        expect(err).to.not.exist();
        expect(blacklist).to.be.an.array();
        done();
      });
    });
  });

  describe('Files', function() {
    it('maps a single input file to a single output file', function(done) {
      var inputFile = Path.join('fixtures', 'templateLiteral.js');
      var outputFile = Path.join(outputDirectory, 'foo.js');

      Files.getFilesFromArgs({
        input: inputFile,
        output: outputFile,
      }, function(err, map) {
        expect(err).to.not.exist();
        expect(map).to.be.an.array();
        expect(map.length).to.equal(1);
        expect(Path.isAbsolute(map[0].input)).to.equal(true);
        expect(map[0].input).to.endWith('templateLiteral.js');
        expect(map[0].output).to.equal(outputFile);
        done();
      });
    });

    it('maps a single input file to an existing output file', function(done) {
      var inputFile = Path.join(fixturesDirectory, 'templateLiteral.js');
      var outputFile = Path.join(outputDirectory, 'index.js');

      Fse.createFileSync(outputFile);

      Files.getFilesFromArgs({
        input: inputFile,
        output: outputFile,
      }, function(err, map) {
        expect(err).to.not.exist();
        expect(map).to.be.an.array();
        expect(map.length).to.equal(1);
        expect(Path.isAbsolute(map[0].input)).to.equal(true);
        expect(map[0].input).to.endWith('templateLiteral.js');
        expect(map[0].output).to.equal(outputFile);
        done();
      });
    });

    it('maps a single input file to an existing output directory', function(done) {
      var inputFile = Path.join('.', 'test', 'index.js');
      var outputFile = Path.join(outputDirectory, 'index.js');

      Fse.ensureDirSync(outputDirectory);

      Files.getFilesFromArgs({
        input: inputFile,
        output: outputDirectory,
      }, function(err, map) {
        expect(err).to.not.exist();
        expect(map).to.be.an.array();
        expect(map.length).to.equal(1);
        expect(Path.isAbsolute(map[0].input)).to.equal(true);
        expect(map[0].input).to.endWith('index.js');
        expect(map[0].output).to.equal(outputFile);
        done();
      });
    });

    it('maps a single input directory to an output directory', function(done) {
      var inputDir = Path.join('fixtures', 'dir1');
      var outputFile1 = Path.join(outputDirectory, 'class.js');
      var outputFile2 = Path.join(outputDirectory, 'literals.js');

      Files.getFilesFromArgs({
        input: inputDir,
        output: outputDirectory,
      }, function(err, map) {
        expect(err).to.not.exist();
        expect(map).to.be.an.array();
        expect(map.length).to.equal(2);

        map.forEach(function(file) {
          expect(file.output === outputFile1 ||
                 file.output === outputFile2).to.equal(true);
        });

        done();
      });
    });

    it('maps a glob to an output directory', function(done) {
      var inputPattern = Path.join('.', 'fixtures', '**');
      var outputFile1 = Path.join(outputDirectory, 'templateLiteral.js');
      var outputFile2 = Path.join(outputDirectory, 'dir1', 'class.js');
      var outputFile3 = Path.join(outputDirectory, 'dir1', 'literals.js');

      Files.getFilesFromArgs({
        input: inputPattern,
        output: outputDirectory,
      }, function(err, map) {
        expect(err).to.not.exist();
        expect(map).to.be.an.array();
        expect(map.length).to.equal(3);

        map.forEach(function(file) {
          expect(file.output === outputFile1 ||
                 file.output === outputFile2 ||
                 file.output === outputFile3).to.equal(true);
        });

        done();
      });
    });
  });

  describe('CLI', function() {
    function runCLI(args) {
      return ChildProcess.fork('bin/scrabel', args);
    }

    it('transpiles a directory of files', function(done) {
      var cli = runCLI([
        '-i',
        fixturesDirectory,
        '-o',
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
