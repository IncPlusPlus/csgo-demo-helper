import {configure, getLogger, Logger} from 'log4js';

export class LogHelper {
    // private readonly config: { [p: string]: any } = ConfigFactory.getConfigInstance().getConfig();

    public static configure = (config: { [p: string]: any }) => {
        // noinspection SpellCheckingInspection
        configure({
            appenders: {
                out: {type: 'stdout'},
                app: {type: 'file', filename: 'application.log'}
            },
            categories: {default: {appenders: ['out', 'app'], level: config.internals.log_level}}
        });
    }

    public static getLogger = (category?: string): Logger => {
        return getLogger(category);
    }
}