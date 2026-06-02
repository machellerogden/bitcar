import minimist from 'minimist';

export default minimist(process.argv.slice(2), {
    alias: {
        version: 'v',
        open: 'o',
        refresh: 'r',
        edit: 'e',
        create: 'c'
    }
});
