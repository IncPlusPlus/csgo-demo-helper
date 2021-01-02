/*
 * Small tools to help with console interaction
 */

import {SubscriberManagerFactory} from "./SubscriberManagerFactory";

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
        SubscriberManagerFactory.getSubscriberManager().sendMessage('clear');
    }

    public static padConsole = (lines: number): void => {
        for (let i = 0; i < lines; i++) {
            SubscriberManagerFactory.getSubscriberManager().sendMessage('echo');
        }
    }

    public static showConsole = (): void => {
        SubscriberManagerFactory.getSubscriberManager().sendMessage('showconsole');
    }

    public static hideConsole = (): void => {
        SubscriberManagerFactory.getSubscriberManager().sendMessage('hideconsole');
    }

    public static printWelcomeMessage = (): void => {
        const message = ConsoleHelper.WelcomeMessage.map(value => "echo \"" + value + "\"");
        SubscriberManagerFactory.getSubscriberManager().sendMessage(message);
    }

    public static printHelpMessage = (): void => {
        const message = ConsoleHelper.HelpMessage.map(value => "echo \"" + value + "\"");
        SubscriberManagerFactory.getSubscriberManager().sendMessage(message);
    }
}