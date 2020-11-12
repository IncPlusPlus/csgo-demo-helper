/*
 * Assists with the demo recording process. This was originally created to help work around an annoying problem.
 * When recording POV demos in CS:GO, the voices of your teammates will be included in the recording but your own
 * voice will not. By enabling the voice_loopback console variable in CS:GO, your voice WILL be recorded. However,
 * this has a side effect of you hearing your own voice whenever you talk which is annoying in the moment but even worse
 * when reviewing footage recorded with traditional recording software as you'll always hear yourself twice.
 *
 * To solve this issue, this utility enables voice_loopback but uses the voice_player_volume command to lower your volume
 * to 0. When playing back a demo where the voice_player_volume of yourself was set to 0, you won't hear your own voice.
 * However, if you raise your voice_player_volume back to 1 while playing the demo, you WILL be able to hear your own voice!
 * This means that you can mute yourself while recording and now have to hear your own voice while you talk but still
 * have your voice recorded in your demos.
 *
 * This helper will echo info into the demo (so long as demo_recordcommands is set to 1) which DemoPlaybackHelper
 * will pick up on when playing these demos back. When playing demos back, the command that was used to set your
 * own volume to 0 will play back. However, this tool will change that value back to 1 after the fact.
 */

import {Config} from "../utils/Config";
import {existsSync} from 'fs';
import {DemoNamingHelper} from "../utils/DemoNamingHelper";
import {SubscriberManager} from "../utils/SubscriberManager";
import {ConsoleHelper} from "../utils/ConsoleHelper";

export class DemoRecordingHelper implements ListenerService {
    private static readonly demoRecordingEndRegExp = RegExp('^Completed demo, recording time \\d+\\.\\d+, game frames \\d+\\.$');
    //A message like this will be echoed right when the demo starts recording.
    private static readonly playerMutedByDemoHelperRegExp = RegExp('^DemoHelper set the volume of player (.*) to 0\\.$');
    //TODO: Allow user to input command like "dh rec new" to skip the prompt since they'd know if this is a new game or whether they rejoined an existing one
    private static readonly beginRecordingCommand = 'dh rec';
    private static readonly recordSplitOrNewDemoRegExp = RegExp('^dh (new|split|cancel)$');

    canHandle(consoleLine: string): boolean {
        return consoleLine === DemoRecordingHelper.beginRecordingCommand ||
            DemoRecordingHelper.playerMutedByDemoHelperRegExp.test(consoleLine);
    }

    async handleLine(consoleLine: string): Promise<void> {
        if (consoleLine === DemoRecordingHelper.beginRecordingCommand) {
            await DemoRecordingHelper.handleStartRecord();
        } else if (DemoRecordingHelper.playerMutedByDemoHelperRegExp.test(consoleLine)) {

        }
        //when attempting to start the recording process check if we get told to wait for the next round to start to be able to record a demo. Log the fact that recording has to be delayed (both to this console and to the game) but will start when the next round begins. Add a service to wait for the console output indicating a round ended
    }

    /**
     * @param demoName the name of the demo to look for (before a "-2" or "-3" or "-pt2" or "-pt3)
     * @returns a Pair with the left number being the highest demo number found with this name and the right number being the highest part number associated with the highest demo number. If one of these values is 0, that respective part of the demo name doesn't exist in the latest demo under the specified demoName.
     */
    private static findLatestDemoWithName(demoName: string): Pair<number, number> {
        //Highest demo number with the given demoName
        let highestDemoNumber = 1;
        let highestPartNumber = 1;
        while (existsSync(`${Config.getConfig().csgo.csgo_demos_folder}/${demoName}${highestDemoNumber > 1 ? `-${highestDemoNumber}` : ``}.dem`)) {
            highestDemoNumber++;
        }
        //Decrement by 1 because the above loop continues until a demo with highestDemoNumber cannot be found. Therefore, decrementing this by 1 makes this point to a valid, existing demo.
        highestDemoNumber--;
        while (existsSync(`${Config.getConfig().csgo.csgo_demos_folder}/${demoName}${highestDemoNumber > 1 ? `-${highestDemoNumber}` : ``}${highestPartNumber > 1 ? `-pt${highestPartNumber}` : ``}.dem`)) {
            highestPartNumber++;
        }
        //Decrement by 1 because the above loop continues until a demo with highestPartNumber cannot be found. Therefore, decrementing this by 1 makes this point to a valid, existing demo.
        highestPartNumber--;
        return [highestDemoNumber, highestPartNumber];
    }

    private static mostRecentDemoInfoToString(demoName: string, existingDemoInfo: Pair<number, number>): string {
        let highestDemoNumber = existingDemoInfo[0];
        let highestPartNumber = existingDemoInfo[1];
        return `${demoName}${highestDemoNumber > 1 ? `-${highestDemoNumber}` : ``}${highestPartNumber > 1 ? `-pt${highestPartNumber}` : ``}`;
    }

    private static async promptUserForNewOrSplitDemo(demoName: string, mostRecentDemoName: string, existingDemoInfo: Pair<number, number>): Promise<string> {
        let highestDemoNumber = existingDemoInfo[0];
        let highestPartNumber = existingDemoInfo[1];
        let promptMessage = [`Demo with name '${mostRecentDemoName}' already exists.`, `If you want to record a new demo, use the command 'echo dh new'.`, `This will make a demo named '${demoName}-${highestDemoNumber + 1}'.`, `If you're rejoining a game and want to pick up where you left off, use the command 'echo dh split'.`, `This will make a demo named '${demoName}${highestDemoNumber > 1 ? `-${highestDemoNumber}` : ``}-pt${highestPartNumber + 1}'.`, `Use the command 'echo dh cancel' to back out of this prompt and cancel the request to record.`];
        promptMessage = promptMessage.map(value => "echo \"" + value + "\"");
        const decisionLine = await SubscriberManager.searchForValue(promptMessage, DemoRecordingHelper.recordSplitOrNewDemoRegExp);
        const userDecision = DemoRecordingHelper.recordSplitOrNewDemoRegExp.exec(decisionLine);
        if (!userDecision) {
            throw Error('User response for whether to record new or split demo came back null!!!!')
        }
        switch (userDecision[1]) {
            case 'new':
                return `${demoName}-${highestDemoNumber + 1}`
            case 'split':
                return `${demoName}${highestDemoNumber > 1 ? `-${highestDemoNumber}` : ``}-pt${highestPartNumber + 1}`;
            case 'cancel':
                return '';
        }
        throw Error(`Finished execution of ${DemoRecordingHelper.promptUserForNewOrSplitDemo} without properly returning.`);
    }

    //TODO: Maybe make this stop a potential current demo recording session
    private static async handleStartRecord() {
        let demoName = '';
        const gameMode = await DemoNamingHelper.getGameModeString();
        const mapName = await DemoNamingHelper.getMapName(Config.getConfig().demo_naming_helper.attempt_hide_map_prefix);
        const timeStamp = DemoNamingHelper.makeTimestamp();
        ConsoleHelper.padConsole(5);
        if (gameMode === 'competitive') {
            if (Config.getConfig().demo_naming_helper.explicitly_mark_competitive_demos === "1") {
                demoName += `${gameMode}-`
            }
        } else {
            demoName += `${gameMode}-`
        }
        demoName += `${mapName}-${timeStamp}`
        //If this demo name already exists, prompt as to whether this is a new game or whether this is a continued recording of a yet-unfinished game
        if (existsSync(`${Config.getConfig().csgo.csgo_demos_folder}/${demoName}.dem`)) {
            const existingDemoInfo = DemoRecordingHelper.findLatestDemoWithName(demoName);
            demoName = await DemoRecordingHelper.promptUserForNewOrSplitDemo(demoName, DemoRecordingHelper.mostRecentDemoInfoToString(demoName, existingDemoInfo), existingDemoInfo);
            if (!demoName)
                //User cancelled the request to record a demo
                return;
        }
        SubscriberManager.sendMessage(`record ${demoName}`);
    }
}