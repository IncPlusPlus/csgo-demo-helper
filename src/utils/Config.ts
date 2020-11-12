import {parse} from 'ini';
import {readFileSync} from 'fs';

export class Config {
    private static readonly config: { [p: string]: any } = parse(readFileSync('./config.ini', 'utf-8'));

    public static getConfig = (): { [p: string]: any } => {
        return Config.config;
    }
}