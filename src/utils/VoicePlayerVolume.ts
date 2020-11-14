import pDefer = require("p-defer");
import {LogHelper} from "./LogHelper";
import {SubscriberManager} from "./SubscriberManager";

export class VoicePlayerVolume {
    private static readonly log = LogHelper.getLogger('VoicePlayerVolume');

    public static setVoicePlayerVolumeByName = async (playerName: string, volume: number) => {
        let players = await VoicePlayerVolume.getVoicePlayerVolumeValues();
        const player = players.find((value: { PlayerName: string; }) => value.PlayerName === playerName);
        if (!player) {
            VoicePlayerVolume.log.warn(`Couldn't find player with name '${playerName}' when attempting to set voice volume.`);
        } else {
            VoicePlayerVolume.setVoicePlayerVolume(player.PlayerNumber, volume);
        }
    }

    public static setVoicePlayerVolume = (playerNumber: number, volume: number) => {
        SubscriberManager.sendMessage(`voice_player_volume ${playerNumber} ${volume}`);
    }

    public static getVoicePlayerVolumeValues = async (): Promise<{ Volume: number; PlayerName: string; PlayerNumber: number }[]> => {
        const deferred: pDefer.DeferredPromise<{ Volume: number; PlayerName: string; PlayerNumber: number }[]> = pDefer();
        const listener = new VoicePlayerVolumeListener(deferred);
        SubscriberManager.subscribe(listener);
        SubscriberManager.sendMessage('voice_player_volume');
        deferred.promise.then(() => SubscriberManager.unsubscribe(listener));
        return deferred.promise;
    }
}

class VoicePlayerVolumeListener implements ListenerService {
    private static readonly whitespaceRegExp: RegExp = /\s{2,}/g;
    private static readonly paddingDashesRegExp: RegExp = RegExp('-{2,}');
    private static readonly voicePlayerVolumeRegExp: RegExp = RegExp('(\\d+)\ +(.*)\ +(\\d\\.\\d{2})');
    private players: { Volume: number; PlayerName: string; PlayerNumber: number }[] = [];
    private reading = false;
    private promise: pDefer.DeferredPromise<{ Volume: number; PlayerName: string; PlayerNumber: number }[]>;
    private static log = LogHelper.getLogger('VoicePlayerVolumeListener');

    constructor(promise: pDefer.DeferredPromise<{ Volume: number; PlayerName: string; PlayerNumber: number }[]>) {
        this.promise = promise;
    }

    name(): string {
        return VoicePlayerVolumeListener.name;
    }

    canHandle(consoleLine: string): boolean {
        return VoicePlayerVolumeListener.isVoicePlayerVolumePadding(consoleLine) || VoicePlayerVolumeListener.voicePlayerVolumeRegExp.test(consoleLine);
    }

    handleLine(consoleLine: string): Promise<void> {
        if (!this.reading && VoicePlayerVolumeListener.paddingDashesRegExp.test(consoleLine)) {
            this.reading = true;
        } else if (this.reading && VoicePlayerVolumeListener.voicePlayerVolumeRegExp.test(consoleLine)) {
            let playerInfo = VoicePlayerVolumeListener.voicePlayerVolumeRegExp.exec(consoleLine);
            if (playerInfo) {
                const playerVolume = {
                    PlayerNumber: Number(playerInfo[1]),
                    PlayerName: String(playerInfo[2].trim()),
                    Volume: Number(playerInfo[3]),
                };
                if (this.reading) {
                    this.players.push(playerVolume);
                }
            } else {
                //Maybe throw error here
                VoicePlayerVolumeListener.log.error('Failed to split output for player volume info using RegExp.exec()');
            }
        } else if (this.reading && VoicePlayerVolumeListener.paddingDashesRegExp.test(consoleLine)) {
            this.reading = false;
            this.promise.resolve(this.players);
        }
        return Promise.resolve(undefined);
    }

    private static isVoicePlayerVolumePadding = (text: string): boolean => {
        const processedLine = text.replace(VoicePlayerVolumeListener.whitespaceRegExp, ' ').trim();
        const splitText = processedLine.split(' ');
        let parsedLineIsPaddingCharacters = true;
        for (let element of splitText) {
            if (!VoicePlayerVolumeListener.paddingDashesRegExp.test(element)) {
                parsedLineIsPaddingCharacters = false;
                break;
            }
        }
        return parsedLineIsPaddingCharacters;
    }
}