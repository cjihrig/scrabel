# scrabel

[![Current Version](https://img.shields.io/npm/v/scrabel.svg)](https://www.npmjs.org/package/scrabel)
[![Build Status via Travis CI](https://travis-ci.org/continuationlabs/scrabel.svg?branch=master)](https://travis-ci.org/continuationlabs/scrabel)
![Dependencies](http://img.shields.io/david/continuationlabs/scrabel.svg)

`scrabel` utilizes Babel to transpile code. `scrabel` only transforms code structures that are not natively supported by the user's version of Node. The motivation of this project is to avoid transpiling features that are natively supported. Take the following code for example:

```javascript
var foo = 'world';

console.log(`hello ${foo}`);
```

This code runs natively on newer versions of Node, but requires transpilation on older versions, such as 0.10. Babel transpiles this to the following code, regardless of the user's version of Node:

```javascript
'use strict';

var foo = 'world';

console.log('hello ' + foo);
```

`scrabel` detects the version of Node being run and disables transformations that are not required. So, a user running 0.10 would get string concatenation, while a user running Node 4.0 would get the original template literal.

## Usage

Add `scrabel` as a dependency (or dev dependency) in your project's `package.json`. Inside your npm `scripts` section, do something like this (assuming your source code is in `src`, and you want to transpile it to `lib`):

```
"scripts": {
  "transpile": "scrabel -i src -o lib",
  "install": "npm run transpile"
}
```

## Command Line

The `scrabel` command line accepts the following options:

  - `-i` (alias `--input`) - File, directory, or glob pattern specifying the input files to transpile. Required.
  - `-o` (alias `--output`) - Output file or directory. If the input is a single file, the output path will be interpreted as a file. However, if the specified output path already exists as a directory, then the output file is created in that directory. If the input is a directory or multi-file glob pattern, then the output is interpreted as a directory. Required.

## API Methods

`scrabel` can also be imported into an application. The module exposes the following methods:

### `transpile(files, blacklist, callback)`

  - Arguments
    - `files` (array) - An array of objects specifying the input file to output file mapping. Each object in the array must contain an `input` and `output` property. `input` is a path specifying a JavaScript source file to transpile. `output` is a path specifying the file where the transpiled code should be written.
    - `blacklist` (array) - An array of strings. Each string is the name of a Babel transform to blacklist during transpilation. This array can be created using `createBlacklist()` or `detectBlacklist()`.
    - `callback(err)` (function) - A callback that is invoked after transpilation completes. The only argument passed to the callback represents a possible error.
  - Returns nothing

Transpiles zero or more input files to the specified output files. Transpilation is done using Babel, with specified transforms being blacklisted. Ideally, the blacklist should be specific to the user's version of Node, but this is not a requirement.

### `detectBlacklist(callback)`

  - Arguments
    - `callback(err, blacklist)` (function) - A callback function that is invoked once the blacklist is detected. The callback arguments are:
      - `err` (error) - Any errors that occur.
      - `blacklist` (array) - An array of strings. Each string is the name of a Babel transform.
  - Returns nothing

Automatically detect the Babel transforms that are unnecessary given the currently executing version of Node.

### `createBlacklist(currentVersion, features)`

  - Arguments
    - `currentVersion` (string) - A semantic version string. For example "4.1.1".
    - `features` (object) - An object that specifies the Babel transforms that can be blacklisted at specific versions of Node. See description below.
  - Returns
    - array - An array of strings where each string is the name of a Babel transform that can be blacklisted for the specified version of Node.

This method determines which Babel transforms can be blacklisted for the specified version of Node, given a `features` object. An example `features` object is shown below. Given this configuration, Node v0.12.1 would blacklist the transforms `"es3.memberExpressionLiterals"`, `"es3.propertyLiterals"`, `"es5.properties.mutators"`, and `"es6.forOf"`.

```javascript
{
  "0.10.0": [
    "es3.memberExpressionLiterals",
    "es3.propertyLiterals",
    "es5.properties.mutators"
  ],
  "0.12.0": [
    "es6.forOf"
  ],
  "1.0.0": [
    "es6.blockScoping",
    "es6.constants",
    "es6.literals",
    "es6.templateLiterals"
  ],
  "2.0.0": [
    "es6.classes",
    "es6.objectSuper",
    "es6.properties.shorthand"
  ],
  "3.0.0": [
    "es6.properties.computed"
  ],
  "4.0.0": [
    "es6.arrowFunctions"
  ]
}
```
