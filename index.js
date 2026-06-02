#!/usr/bin/env node
import router from './router.js';
import argv from './argv.js';
import setTarget from './lib/setTarget.js';

router(argv)
    .then(setTarget)
    .catch((err) => {
        console.log(err.message || err);
        process.exit(1);
    });
