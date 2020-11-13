import {Config} from "./Config";

export class Logger {
    private static readonly config: { [p: string]: any } = Config.getConfig();

    public static info = (text: string) => {
        console.log(`[INFO]: ${text}`);
    }

    public static warn = (text: string) => {
        console.log(`[WARNING]: ${text}`);
    }

    public static writingToCStrikeConsole = (text: string) => {
        Logger.fine(`Writing to CStrike console: '${text}'`);
    }

    public static debug = (text: string) => {
        if (Number(Logger.config.internals.print_debug_messages) === 1) {
            console.log(`[DEBUG]: ${text}`);
        }
    }

    public static fine = (text: string) => {
        if (Number(Logger.config.internals.print_fine_messages) === 1) {
            console.log(`[FINE]: ${text}`);
        }
    }

    static finest(text: string) {
        if (Number(Logger.config.internals.print_finest_messages) === 1) {
            console.log(`[FINEST]: ${text}`);
        }
    }
}