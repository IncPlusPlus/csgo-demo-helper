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
import * as readline from 'readline';
import * as net from 'net';
// const util = require('util');
import {SubscriberManager} from './SubscriberManager';
import {Logger} from "./Logger";
import {Config} from "./Config";

export class Cvars {
    private static readonly config: { [p: string]: any } = Config.getConfig();
    private static readonly whitespaceRegExp: RegExp = /\s{2,}/g;
    private static readonly paddingDashesRegExp: RegExp = RegExp('-{2,}');
    private static readonly voicePlayerVolumeRegExp: RegExp = RegExp('(\\d+)\ +(.*)\ +(\\d\\.\\d{2})')
    private static readonly port: number = Cvars.config.csgo.netcon_port;

    public static getCvar = async (cvarName: string): Promise<number> => {
        let outval = await SubscriberManager.requestCvarValue(cvarName);
        return outval;
    }

    public static setCvar = (cvarName: string, value: string) => {
        SubscriberManager.sendMessage(`${cvarName} ${value}\n`);
    }

    public static setVoicePlayerVolumeByName = async (playerName: string, volume: number) => {
        let players = await Cvars.getVoicePlayerVolumeValues();
        const player = players.find((value: { PlayerName: string; }) => value.PlayerName === playerName);
        if (!player) {
            console.log(`Couldn't find player with name '${playerName}'.`)
        } else {
            await Cvars.setVoicePlayerVolume(player.PlayerNumber, volume);
        }
    }

    public static setVoicePlayerVolume = async (playerNumber: number, volume: number) => {
        const socket = net.connect(Cvars.port, '127.0.0.1');
        socket.setEncoding('utf8');
        socket.write(`voice_player_volume ${playerNumber} ${volume}\n`);
        socket.end();
    }

    public static getVoicePlayerVolumeValues = async (): Promise<{ Volume: number; PlayerName: string; PlayerNumber: number }[]> => {
        const isVoicePlayerVolumePadding = (text: string) => {
            const processedLine = text.replace(Cvars.whitespaceRegExp, ' ').trim();
            const splitText = processedLine.split(' ');
            let parsedLineIsPaddingCharacters = true;
            for (let element of splitText) {
                if (!Cvars.paddingDashesRegExp.test(element)) {
                    parsedLineIsPaddingCharacters = false;
                    break;
                }
            }
            return parsedLineIsPaddingCharacters;
        }
        let players = [];
        let reading = false;

        const socket = net.connect(Cvars.port, '127.0.0.1');
        socket.setEncoding('utf8');
        const reader = readline.createInterface({
            input: socket,
            crlfDelay: Infinity
        });

        socket.write('voice_player_volume\n');

        for await (const line of reader) {
            if (reading) {
                if (isVoicePlayerVolumePadding(line)) {
                    //The second time we see padding, the command output is effectively done.
                    reading = false;
                    reader.close();
                    socket.end();
                    return players;
                }

                let playerInfo = Cvars.voicePlayerVolumeRegExp.exec(line);
                if (playerInfo) {
                    const playerVolume = {
                        PlayerNumber: Number(playerInfo[1]),
                        PlayerName: String(playerInfo[2].trim()),
                        Volume: Number(playerInfo[3]),
                    };
                    if (reading) {
                        players.push(playerVolume);
                    }
                } else {
                    Logger.warn('Failed to split output for player volume info using RegExp.exec()');
                }
            }
            if (isVoicePlayerVolumePadding(line)) {
                reading = true;
                players = [];
            }
        }
        throw Error("Finished for loop in getVoicePlayerVolumeValues but couldn't return a value for some reason.");
    }
}

// (async () => {
//     let output = await getVoicePlayerVolumeValues();
//     console.log(output);
// })();