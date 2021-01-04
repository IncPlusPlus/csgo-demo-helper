import {parse} from 'ini';
import {constants, copyFileSync, existsSync, readFileSync} from 'fs';
import {configure, getLogger} from 'log4js';
import {join} from 'path';
import {type} from "os";

export class Config {
    private readonly config: { [p: string]: any };
    private config_path: string = join(__dirname, "..", "..", "config.ini");
    private config_template_path: string = join(__dirname, "..", "..", "config.template.ini");

    constructor() {
        if (!this.configExists()) {
            // noinspection SpellCheckingInspection
            configure({
                appenders: {
                    out: {type: 'stdout'},
                    app: {type: 'file', filename: 'application.log'}
                },
                categories: {default: {appenders: ['out', 'app'], level: `info`}}
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
        // if (!this.configValid()) {
        //     //TODO: Check that all settings used by CS:GO Demo Manager are present and valid
        // }
    }

    configExists(): boolean {
        return existsSync(this.config_path);
    }

    //TODO: Implement
    // configValid(): boolean {
    //     return true;
    // }

    public getConfig = (): { [p: string]: any } => {
        return this.config;
    }

    public csgoExeNameForPlatform = (): string => {
        switch (type()) {
            case 'Windows_NT':
                return 'csgo.exe';
            case 'Linux':
                return 'csgo_linux64';
            case 'Darwin':
                return 'csgo_osx64';
            default:
                throw Error(`UNSUPPORTED OS TYPE ${type()}`);
        }
    }

    public csgoExeExists(): boolean {
        return existsSync(join(this.getConfig().csgo.csgo_demos_folder, "..", this.csgoExeNameForPlatform()));
    }
}