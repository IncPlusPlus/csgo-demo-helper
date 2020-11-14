import {Config} from "./Config";
import {configure, getLogger, Logger} from 'log4js';

export class LogHelper {
    private static readonly config: { [p: string]: any } = Config.getConfig();

    public static configure = () => {
        // noinspection SpellCheckingInspection
        configure({
            appenders: {
                out: {type: 'stdout'},
                app: {type: 'file', filename: 'application.log'}
            },
            categories: {default: {appenders: ['out', 'app'], level: LogHelper.config.internals.log_level}}
        });
    }

    public static getLogger = (category?: string): Logger => {
        return getLogger(category);
    }
}