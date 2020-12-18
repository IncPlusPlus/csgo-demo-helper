/*
 * Small tools to help with console interaction
 */

import {SubscriberManager} from "./SubscriberManager";

//TODO: Remove padding from messages and just use the method available in ConsoleHelper
export class ConsoleHelper {
    public static readonly WelcomeMessage: string[] = [
        "Welcome to IncPlusPlus's CS:GO QOS utils!",
        "Type 'echo ds help' for available commands.",
        "",
        "",
        "",
    ];
    public static readonly HelpMessage: string[] = [
        "Type 'dh rec' to record a new POV demo.",
        "That's really all that there is for now...",
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
        const message = ConsoleHelper.WelcomeMessage.map(value => "echo \"" + value + "\"");
        SubscriberManager.sendMessage(message);
    }

    public static printHelpMessage = (): void => {
        const message = ConsoleHelper.HelpMessage.map(value => "echo \"" + value + "\"");
        SubscriberManager.sendMessage(message);
    }
}