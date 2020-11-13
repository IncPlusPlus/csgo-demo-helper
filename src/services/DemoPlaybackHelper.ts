/*
 * See the top comment of DemoRecordingHelper for an explanation of what this class is responsible for.
 */

import {Config} from "../utils/Config";
import {VoicePlayerVolume} from "../utils/VoicePlayerVolume";
import {Logger} from "../utils/Logger";
import {SubscriberManager} from "../utils/SubscriberManager";
import {DemoRecordingHelper} from "./DemoRecordingHelper";

export class DemoPlaybackHelper implements ListenerService {
    // private static readonly demoPlaybackRegExp = RegExp('^Playing demo from (.*)\\.dem\\.$');
    //A message like this will be echoed right when the demo starts recording.
    private static readonly playerMutedByDemoHelperRegExp = RegExp('^DemoHelper set the volume of player (.*) to 0\\.$');
    private static readonly demoInfoRegExp = RegExp('(Error - Not currently playing back a demo\\.)|(Demo contents for (.*)\\.dem:)');

    name(): string {
        return DemoPlaybackHelper.name;
    }

    canHandle(consoleLine: string): boolean {
        return !DemoRecordingHelper.synchronouslyCheckIfRecording() &&
            DemoPlaybackHelper.playerMutedByDemoHelperRegExp.test(consoleLine);
    }

    async handleLine(consoleLine: string): Promise<void> {
        if (await DemoPlaybackHelper.currentlyPlayingADemo()) {
            if (DemoPlaybackHelper.playerMutedByDemoHelperRegExp.test(consoleLine)) {
                if (Config.getConfig().demo_playback_helper.playback_voice_player_volume === "1") {
                    const match = DemoPlaybackHelper.playerMutedByDemoHelperRegExp.exec(consoleLine);
                    if (!match)
                        throw Error('Got null match when determining player name from the message left behind in the demo.');
                    const playerName = match[1];
                    //TODO: Additional testing required to make sure this doesn't fire before the game is ready to deal with it
                    Logger.info(`DemoPlaybackHelper found a line indicating DemoHelper muted ${playerName} so it unmuted them.`);
                    await VoicePlayerVolume.setVoicePlayerVolumeByName(playerName, 1);
                } else {
                    Logger.info("DemoPlaybackHelper found a line indicating DemoHelper muted a player but demo_playback_helper.playback_voice_player_volume was set to 0 in the config file.");
                }
            }
        }
    }

    private static currentlyPlayingADemo = async (): Promise<boolean> => {
        const demoName = await DemoPlaybackHelper.getCurrentDemoName();
        return demoName.length > 0;
    }

    private static getCurrentDemoName = async (): Promise<string> => {
        const consoleLine = await SubscriberManager.searchForValue('demo_info', DemoPlaybackHelper.demoInfoRegExp);
        const match = DemoPlaybackHelper.demoInfoRegExp.exec(consoleLine);
        if (!match)
            throw Error(`Failed to execute RegExp on the console's response to demo_info.`);
        return match[3] ? match[3] : '';
    }
}