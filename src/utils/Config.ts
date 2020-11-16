import {parse} from 'ini';
import {existsSync, readFileSync} from 'fs';
import {configure, getLogger} from "log4js";

export class Config {
    private static config: { [p: string]: any };

    /**
     * DO NOT CALL THIS METHOD EVER. THIS IS FOR INTERNAL USE INSIDE Config.ts ONLY!!!!!
     */
    static _initialize() {
        if (!existsSync('./config.ini')) {
            // noinspection SpellCheckingInspection
            configure({
                appenders: {
                    out: {type: 'stdout'},
                    app: {type: 'file', filename: 'application.log'}
                },
                categories: {default: {appenders: ['out', 'app'], level: 'info'}}
            });
            const log = getLogger('Config');
            log.fatal('You haven\'t made a config.ini file yet.');
            log.fatal('Please read the installation section of the README.md file to be able to use this program.');
            throw Error('config.ini not found');
        }
        Config.config = parse(readFileSync('./config.ini', 'utf-8'));
    }

    public static getConfig = (): { [p: string]: any } => {
        return Config.config;
    }
}

/*
 * This runs the _initialize method as soon as this class is declared The reason for doing this (and for configuring
 * a logger separately from LogHelper) is to be able to properly alert the user that they haven't configured
 * their config.ini file before other classes that statically access Config.getConfig() run into errors.
 *
 * This fails fast and lets the error thrown propagate to the top and exit before any errors arise from getting
 * properties from an undefined dictionary occur. I found this handy-dandy solution at https://stackoverflow.com/a/57097362/1687436
 */
try {
    Config._initialize();
} catch (e) {
    process.kill(process.pid, 'SIGTERM');
}