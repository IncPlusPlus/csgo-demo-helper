/*
 * Small tools to help with console interaction
 */

import {parse} from 'ini';
import {readFileSync} from 'fs';
// const logger = require('./Logger.ts');
import {SubscriberManager} from "./SubscriberManager";

export class ConsoleHelper {
    private static readonly config: { [p: string]: any } = parse(readFileSync('./config.ini', 'utf-8'));
    private static readonly welcomeMessage: string[] = [
        "Welcome to IncPlusPlus's CS:GO QOS utils!",
        "Type 'echo ds help' for available commands.",
        "",
        "",
        "",
    ]


    public static clearConsole = (): void => {
        let p : Promise<string> = new Promise<string>((resolve, reject) => {

        });

        SubscriberManager.sendMessage('clear');
    }

// /**
//  * Write one or many commands to the console.
//  * @param commandOrArray a single string or an array of strings to be written to the console
//  */
// const writeCommand = async (commandOrArray) => {
//     await waitForConsoleSocket();
//     const socket = net.connect(port, '127.0.0.1');
//     socket.setEncoding('utf8');
//     if (Array.isArray(commandOrArray)) {
//         for (let command of commandOrArray) {
//             logger.writingToCStrikeConsole(command);
//             socket.write(`${command}\n`);
//         }
//     } else if (typeof commandOrArray === 'string' || commandOrArray instanceof String) {
//         logger.writingToCStrikeConsole(commandOrArray);
//         socket.write(`${commandOrArray}\n`);
//     } else {
//         console.log("Unsupported object type sent to 'writeCommand' function.");
//     }
//     socket.end();
// }

    public static showConsole = (): void => {
        SubscriberManager.sendMessage('showconsole');
    }

    public static hideConsole = (): void => {
        SubscriberManager.sendMessage('hideconsole');
    }

    public static printWelcomeMessage = (): void => {
        const message = ConsoleHelper.welcomeMessage.map(value => "echo \"" + value + "\"");
        SubscriberManager.sendMessage(message);
    }

    public static printHelpMessage = (): void => {

    }
}