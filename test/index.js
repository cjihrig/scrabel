'use strict';
var ChildProcess = require('child_process');
var Fs = require('fs');
var Os = require('os');
var Path = require('path');
var Babel = require('babel');
var Code = require('code');
var Fse = require('fs-extra');
var Glob = require('glob');
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
    // The ordering of the tests for this function must be maintained.
    // Specifically, the error tests must come first.
    it('handles readdir() errors', function(done) {
      var readdir = Fs.readdir;

      Fs.readdir = function(dir, callback) {
        callback(new Error(dir));
      };

      Scrabel.detectBlacklist(function(err, blacklist) {
        Fs.readdir = readdir;
        expect(err).to.exist();
        expect(blacklist).to.not.exist();
        done();
      });
    });

    it('handles readFile() errors', function(done) {
      var readFile = Fs.readFile;

      Fs.readFile = function(name, encoding, callback) {
        callback(new Error(name));
      };

      Scrabel.detectBlacklist(function(err, blacklist) {
        Fs.readFile = readFile;
        expect(err).to.exist();
        expect(blacklist).to.not.exist();
        done();
      });
    });

    it('uses feature detection to create blacklist', function(done) {
      Scrabel.detectBlacklist(function(err, blacklist) {
        expect(err).to.not.exist();
        expect(blacklist).to.be.an.array();
        done();
      });
    });

    it('returns cached blacklist on subsequent calls', function(done) {
      Scrabel.detectBlacklist(function(err, blacklist1) {
        expect(err).to.not.exist();
        expect(blacklist1).to.be.an.array();

        Scrabel.detectBlacklist(function(err, blacklist2) {
          expect(err).to.not.exist();
          expect(blacklist2).to.be.an.array();
          expect(blacklist1).to.deep.equal(blacklist2);
          expect(blacklist1).to.not.equal(blacklist2);
          done();
        });
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
      var inputDir = 'fixtures';
      var outputFile = Path.join(outputDirectory, 'templateLiteral.js');

      Files.getFilesFromArgs({
        input: inputDir,
        output: outputDirectory,
      }, function(err, map) {
        expect(err).to.not.exist();
        expect(map).to.be.an.array();
        expect(map.length).to.equal(1);
        expect(map[0].output).to.equal(outputFile);
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

    it('maps a glob with pattern dir/*', function(done) {
      var inputPattern = Path.join('.', 'fixtures', 'dir1', '*');
      var outputFile1 = Path.join(outputDirectory, 'class.js');
      var outputFile2 = Path.join(outputDirectory, 'literals.js');

      Files.getFilesFromArgs({
        input: inputPattern,
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

    it('handles a glob with no matches', function(done) {
      var inputPattern = Path.join('.', 'fixtures', 'does_not_exist');

      Files.getFilesFromArgs({
        input: inputPattern,
        output: outputDirectory,
      }, function(err, map) {
        expect(err).to.not.exist();
        expect(map).to.be.an.array();
        expect(map.length).to.equal(0);
        done();
      });
    });

    it('fails mapping an input directory to an output file', function(done) {
      var outputFile = Path.join(outputDirectory, 'foo.js');

      Fse.createFileSync(outputFile);

      Files.getFilesFromArgs({
        input: fixturesDirectory,
        output: outputFile,
      }, function(err, map) {
        expect(err).to.exist();
        expect(err instanceof TypeError).to.equal(true);
        expect(err.message).to.match(/Cannot map input to output/);
        expect(map).to.not.exist();
        done();
      });
    });

    it('handles errors getting output type', function(done) {
      var stat = Fs.stat;

      Fs.stat = function(path, callback) {
        callback(new Error('stats'));
      };

      Files.getFilesFromArgs({
        input: fixturesDirectory,
        output: outputDirectory,
      }, function(err, map) {
        Fs.stat = stat;
        expect(err).to.exist();
        expect(err.message).to.equal('stats');
        expect(map).to.not.exist();
        done();
      });
    });

    it('handles unknown output type', function(done) {
      var stat = Fs.stat;

      Fs.stat = function(path, callback) {
        var stats = {
          isFile: function() {
            return false;
          },
          isDirectory: function() {
            return false;
          }
        };

        callback(null, stats);
      };

      Files.getFilesFromArgs({
        input: fixturesDirectory,
        output: outputDirectory,
      }, function(err, map) {
        Fs.stat = stat;
        expect(err).to.exist();
        expect(err instanceof TypeError).to.equal(true);
        expect(err.message).to.match(/Cannot map input to output/);
        expect(map).to.not.exist();
        done();
      });
    });
  });

  describe('CLI', function() {
    it('transpiles a single input file to a single output file', function(done) {
      var inputFile = Path.join(fixturesDirectory, 'templateLiteral.js');
      var outputFile = Path.join(outputDirectory, 'foo.js');
      var argv = ['-i', inputFile, '-o', outputFile];

      Cli.run(argv, function(err) {
        expect(err).to.not.exist();
        expect(Fse.existsSync(outputFile)).to.equal(true);
        done();
      });
    });

    it('errors if --input is not provided', function(done) {
      var argv = ['-o', 'foo'];

      Cli.run(argv, function(err) {
        expect(err).to.exist();
        done();
      });
    });

    it('errors if --output is not provided', function(done) {
      var argv = ['-i', 'foo'];

      Cli.run(argv, function(err) {
        expect(err).to.exist();
        done();
      });
    });

    it('transpiles a directory of files as separate', function(done) {
      function runCLI(args) {
        return ChildProcess.fork('bin/scrabel', args);
      }

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
