/*
 * See the top comment of DemoRecordingHelper for an explanation of what this class is responsible for.
 *
 * NOTE: YOU NO LONGER NEED TO HAVE THIS RUNNING WHEN PERFORMING DEMO PLAYBACK UNLESS THE DEMO WAS RECORDED
 * WITH A VERSION EARLIER THAN 1.1.0!!! You'll know if you need this running if you
 * notice yourself talking during demo playback but don't hear any audio.
 */

import {VoicePlayerVolume} from "../utils/VoicePlayerVolume";
import {LogHelper} from "../utils/LogHelper";
import {DemoRecordingHelper} from "./DemoRecordingHelper";
import {ListenerService} from "../ListenerService";
import {SubscriberManagerFactory} from "../utils/SubscriberManagerFactory";
import {ConfigFactory} from "../utils/ConfigFactory";

/**
 * DemoPlaybackHelper is responsible for listening to the console for messages left behind by DemoRecordingHelper.
 * For instance, a message about a player being muted might have been left behind and DemoPlaybackHelper acts on this
 * information by unmuting the player. This is just an example of its purpose and isn't actually necessary any more
 * with demos recorded after the changes made in 1.1.0.
 */
export class DemoPlaybackHelper implements ListenerService {
    private static readonly log = LogHelper.getLogger('DemoPlaybackHelper');
    // private static readonly demoPlaybackRegExp = RegExp('^Playing demo from (.*)\\.dem\\.$');
    //A message like this will be echoed right when the demo starts recording.
    private static readonly playerMutedByDemoHelperRegExp = RegExp('^DemoHelper set the volume of player (.*) to 0\\.$');
    private static readonly demoInfoRegExp = RegExp('(Error - Not currently playing back a demo\\.)|(Demo contents for (.*)\\.dem:)');

    name(): string {
        return DemoPlaybackHelper.name;
    }

    canHandle(consoleLine: string): boolean {
        /*
         * Ordinarily, we would just test whether the RegEx matched the line. However, we don't want to unmute the
         * player if we're RECORDING a demo and just printed the line about muting them. We would only want to do that
         * during demo PLAYBACK. To ensure this, DemoRecordingHelper keeps track of whether it's recording a demo or not.
         *
         * I *would* change this to use DemoPlaybackHelper.currentlyPlayingADemo() but canHandle() is not an async method
         * and it becomes deadlock city if we try to convert canHandle into an async method.
         */
        return !DemoRecordingHelper.synchronouslyCheckIfRecording() &&
            DemoPlaybackHelper.playerMutedByDemoHelperRegExp.test(consoleLine);
    }

    async handleLine(consoleLine: string): Promise<void> {
        if (await DemoPlaybackHelper.currentlyPlayingADemo()) {
            if (Number(ConfigFactory.getConfigInstance().getConfig().demo_playback_helper.playback_voice_player_volume) === 1) {
                const match = DemoPlaybackHelper.playerMutedByDemoHelperRegExp.exec(consoleLine);
                const playerName = match![1];
                //TODO: Additional testing required to make sure this doesn't fire before the game is ready to deal with it
                DemoPlaybackHelper.log.info(`DemoPlaybackHelper found a line indicating DemoHelper muted ${playerName} so it unmuted them.`);
                await VoicePlayerVolume.setVoicePlayerVolumeByName(playerName, 1);
            } else {
                DemoPlaybackHelper.log.info("DemoPlaybackHelper found a line indicating DemoHelper muted a player but demo_playback_helper.playback_voice_player_volume was set to 0 in the config file.");
            }
        }
    }

    private static currentlyPlayingADemo = async (): Promise<boolean> => {
        const demoName = await DemoPlaybackHelper.getCurrentDemoName();
        return demoName.length > 0;
    }

    private static getCurrentDemoName = async (): Promise<string> => {
        const consoleLine = await SubscriberManagerFactory.getSubscriberManager().searchForValue('demo_info', DemoPlaybackHelper.demoInfoRegExp, false);
        // Capture group 1 is the error message, group 2 is the other message, and group 3 is the demo name if the other message is received (meaning: playback is occurring).
        const match = DemoPlaybackHelper.demoInfoRegExp.exec(consoleLine);
        // If the demo name exists, return it. If we're not playing a demo, return an empty string.
        return match![3] ? match![3] : '';
    }
}