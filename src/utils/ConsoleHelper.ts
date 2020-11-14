/*
 * Small tools to help with console interaction
 */

import {SubscriberManager} from "./SubscriberManager";

export class ConsoleHelper {
    private static readonly welcomeMessage: string[] = [
        "Welcome to IncPlusPlus's CS:GO QOS utils!",
        "Type 'echo ds help' for available commands.",
        "",
        "",
        "",
    ];

    public static clearConsole = (): void => {
        SubscriberManager.sendMessage('clear');
    }

    public static padConsole = (lines: number): void => {
        for (let i = 0; i < lines; i++) {
            SubscriberManager.sendMessage('echo');
        }
    }

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
        //TODO: Make an actual help section
    }
}