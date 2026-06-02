import fs from 'node:fs';
import path from 'node:path';

function ensureDir(filePath) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function read(p) {
    return fs.readFileSync(p, 'utf8');
}

function write(p, content) {
    ensureDir(p);
    fs.writeFileSync(p, content);
}

function readJSON(p) {
    return JSON.parse(read(p));
}

function writeJSON(p, data, replacer = null, space = 4) {
    write(p, JSON.stringify(data, replacer, space));
}

function exists(p) {
    return fs.existsSync(p);
}

function copy(src, dest) {
    ensureDir(dest);
    fs.copyFileSync(src, dest);
}

function copyTpl(src, dest, data = {}) {
    const template = read(src);
    const rendered = template.replace(/<%=\s*([\w.]+)\s*%>/g, (match, key) => {
        const value = key.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), data);
        return value == null ? '' : String(value);
    });
    write(dest, rendered);
}

export default { read, write, readJSON, writeJSON, exists, copy, copyTpl };
