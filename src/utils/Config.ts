import {parse} from 'ini';
import {constants, copyFileSync, existsSync, readFileSync} from 'fs';
import {configure, getLogger} from 'log4js';
import {join} from 'path';

export class Config {
    private config: { [p: string]: any };
    private config_path: string = join(__dirname, "..", "..", "config.ini");
    private config_template_path: string = join(__dirname, "..", "..", "config.template.ini");

    constructor(inTest = false) {
        if (!this.configExists()) {
            // noinspection SpellCheckingInspection
            configure({
                appenders: {
                    out: {type: 'stdout'},
                    app: {type: 'file', filename: 'application.log'}
                },
                categories: {default: {appenders: ['out', 'app'], level: `${inTest ? 'OFF' : 'info'}`}}
            });
            const log = getLogger('Config');
            log.fatal(`Couldn't find 'config.ini' expected at path '${this.config_path}'.`);
            log.info(`It seems you haven't made a config.ini file yet. I'll make one for you now...`);
            copyFileSync(this.config_template_path, this.config_path, constants.COPYFILE_EXCL);
            log.info(`Created 'config.ini' at path ${this.config_path}`);
            log.info(`Please modify config.ini to match your desired settings and then launch this program again.`);
            throw Error(`config.ini not found at path '${this.config_path}'`);
        }
        this.config = parse(readFileSync(this.config_path, 'utf-8'));
        if (!this.configValid()) {
            //TODO: Check that all settings used by CS:GO Demo Manager are present and valid
        }
    }

    /**
     * DO NOT CALL THIS METHOD EVER. THIS IS FOR INTERNAL USE INSIDE Config.ts ONLY!!!!!
     * @param inTest set this to true to avoid log output during tests
     * @returns false if config.ini didn't exist and had to be created; true if read successfully
     */
    _initialize(inTest = false): boolean {
        return false;
    }

    configExists(): boolean {
        return existsSync(this.config_path);
    }

    configValid(): boolean {
        //TODO: Implement
        return true;
    }

    public getConfig = (): { [p: string]: any } => {
        if (!this.config) {
            this._initialize();
        }
        return this.config;
    }

    public csgoExeExists(): boolean {
        return existsSync(join(this.config.csgo.csgo_demos_folder, "..", "csgo.exe"));
    }
}