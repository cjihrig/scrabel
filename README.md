# scrabel

[![Current Version](https://img.shields.io/npm/v/scrabel.svg)](https://www.npmjs.org/package/scrabel)
[![Build Status via Travis CI](https://travis-ci.org/continuationlabs/scrabel.svg?branch=master)](https://travis-ci.org/continuationlabs/scrabel)
![Dependencies](http://img.shields.io/david/continuationlabs/scrabel.svg)
![devDependencies](http://img.shields.io/david/dev/continuationlabs/scrabel.svg)

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
