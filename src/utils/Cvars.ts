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

import {SubscriberManager} from './SubscriberManager';
import {Logger} from "./Logger";

export class Cvars {
    public static getCvar = async (cvarName: string): Promise<number> => {
        Logger.debug(`Retrieving value of cvar '${cvarName}'...`);
        return await SubscriberManager.requestCvarValue(cvarName);
    }

    public static setCvar = (cvarName: string, value: string) => {
        SubscriberManager.sendMessage(`${cvarName} ${value}`);
        Logger.debug(`Set value of cvar '${cvarName}' to '${value}'.`);
    }
}

// (async () => {
//     let output = await getVoicePlayerVolumeValues();
//     console.log(output);
// })();