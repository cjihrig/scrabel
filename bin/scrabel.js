#!/usr/bin/env node
'use strict';

require('../lib/cli').run(process.argv, function (err) {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  process.exit(0);
});
