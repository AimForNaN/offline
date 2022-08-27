import path from 'path';
import minimist from 'minimist';

const args = minimist(process.argv.slice(2), {
    string: ['config'],
    default: {
        config: 'config.js',
    },
});
const { default: config } = await import('file://' + path.resolve(args.config));

export default class Config {
    constructor() {
        for (var [k,v] of Object.entries(config)) {
            this[k] = v;
        }
    }
};
