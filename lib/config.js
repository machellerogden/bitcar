import rc from 'rc';

const config = rc('bitcar', {});

export default {
    get: () => config
};
