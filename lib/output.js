import chalk from 'chalk';
import _ from 'lodash';

export default {
    log: (...args) => {
        console.log(...args);
    },
    error: (...args) => {
        if (args[0] != null) {
            console.error(..._.map(args, (a) => chalk.bold.red(a)));
        }
    }
};
