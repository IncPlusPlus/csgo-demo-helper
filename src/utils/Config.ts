import {parse} from 'ini';
import {constants, copyFileSync, existsSync, readFileSync} from 'fs';
import {configure, getLogger} from 'log4js';
import {join} from 'path';

export class Config {
    private static config: { [p: string]: any };
    private static config_path: string = join(__dirname, "..", "..", "config.ini");
    private static config_template_path: string = join(__dirname, "..", "..", "config.template.ini");

    /**
     * DO NOT CALL THIS METHOD EVER. THIS IS FOR INTERNAL USE INSIDE Config.ts ONLY!!!!!
     */
    static _initialize() {
        if (!existsSync(Config.config_path)) {
            // noinspection SpellCheckingInspection
            configure({
                appenders: {
                    out: {type: 'stdout'},
                    app: {type: 'file', filename: 'application.log'}
                },
                categories: {default: {appenders: ['out', 'app'], level: 'info'}}
            });
            const log = getLogger('Config');
            log.fatal(`Couldn't find 'config.ini' expected at path '${Config.config_path}'.`);
            log.info(`It seems you haven't made a config.ini file yet. I'll make one for you now...`);
            copyFileSync(Config.config_template_path, Config.config_path, constants.COPYFILE_EXCL);
            log.info(`Created 'config.ini' at path ${Config.config_path}`);
            log.info(`Please modify config.ini to match your desired settings and then launch this program again.`);
            process.exit();
            // throw Error(`config.ini not found at path '${Config.config_path}'`);
        }
        Config.config = parse(readFileSync(Config.config_path, 'utf-8'));
    }

    public static getConfig = (): { [p: string]: any } => {
        return Config.config;
    }

    public static csgoExeExists(): boolean {
        return existsSync(join(Config.config.csgo.csgo_demos_folder, "..", "csgo.exe"));
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
    throw e;
    // process.kill(process.pid, 'SIGTERM');
}