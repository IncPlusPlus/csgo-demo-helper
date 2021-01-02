/*
 * A utility for retrieving the values of console variables.
 *
 * Console variables are normally set by naming them and specifying their value like so: "voice_loopback 1".
 * To retrieve the current value of a console variable, you can simply submit its name and the console will return
 * its value. The format is a little loose so this utility provides helper functions for retrieving the values.
 * Here is the output from submitting "game_mode":
 *
 * "game_mode" = "1" ( def. "0" ) game client replicated                            - The current game mode (based on game type). See GameModes.txt.
 */

import {LogHelper} from "./LogHelper";
import {SubscriberManagerFactory} from "./SubscriberManagerFactory";

export class Cvars {
    private static readonly log = LogHelper.getLogger('Cvars');

    public static getCvar = async (cvarName: string): Promise<number> => {
        Cvars.log.debug(`Retrieving value of cvar '${cvarName}'...`);
        return await SubscriberManagerFactory.getSubscriberManager().requestCvarValue(cvarName);
    }

    public static setCvar = (cvarName: string, value: string) => {
        SubscriberManagerFactory.getSubscriberManager().sendMessage(`${cvarName} ${value}`);
        Cvars.log.debug(`Set value of cvar '${cvarName}' to '${value}'.`);
    }
}