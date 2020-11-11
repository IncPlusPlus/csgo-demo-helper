const ini = require('ini');
const fs = require('fs');

const config = ini.parse(fs.readFileSync('./config.ini', 'utf-8'));

const info = (text) => {
    console.log(`[INFO]: ${text}`);
}

const warn = (text) => {
    console.log(`[WARNING]: ${text}`);
}

const writingToCStrikeConsole = (text) => {
    debug(`Writing to CStrike console: ${text}`);
}

const debug = (text) => {
    if(Number(config.internals.print_debug_messages) === 1) {
        console.log(`[DEBUG]: ${text}`);
    }
}

const fine = (text) => {
    if(Number(config.internals.print_fine_messages) === 1) {
        console.log(`[FINE]: ${text}`);
    }
}

module.exports = logger = {
    warn,
    info,
    debug,
    fine,
    writingToCStrikeConsole,
}