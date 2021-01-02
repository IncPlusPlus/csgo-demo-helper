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

import {existsSync} from 'fs';
import {DemoNamingHelper} from "../utils/DemoNamingHelper";
import {ConsoleHelper} from "../utils/ConsoleHelper";
import {SteamID} from "../utils/SteamID";
import {LogHelper} from "../utils/LogHelper";
import {VoicePlayerVolume} from "../utils/VoicePlayerVolume";
import {Cvars} from "../utils/Cvars";
import {UserDecisionTimeoutException} from "../utils/TimeoutPromise";
import {ListenerService} from "../ListenerService";
import {Pair} from "../utils/Pair";
import {SubscriberManagerFactory} from "../utils/SubscriberManagerFactory";
import {ConfigFactory} from "../utils/ConfigFactory";

export class DemoRecordingHelper implements ListenerService {
    private static readonly log = LogHelper.getLogger('DemoRecordingHelper');
    private static readonly demoRecordingEndRegExp = RegExp('^Completed demo, recording time \\d+\\.\\d+, game frames \\d+\\.$');
    //TODO: Allow user to input command like "dh rec new" to skip the prompt since they'd know if this is a new game or whether they rejoined an existing one
    static readonly BeginRecordingCommand = 'dh rec';
    private static readonly recordSplitOrNewDemoRegExp = RegExp('^dh (new|split|cancel)$');
    private static readonly resultOfRecordCmdRegExp = RegExp('(Already recording\\.)|(Recording to (.*)\\.dem\\.\\.\\.)|(Please start demo recording after current round is over\\.)');
    private static readonly beginRecordingAfterNewRoundRegExp = RegExp('dh roundover|0:\\s+Reinitialized \\d+ predictable entities');
    /** A flag that gets switched on when recording begins and off when recording stops. */
    private static currentlyRecording = false;

    name(): string {
        return DemoRecordingHelper.name;
    }

    canHandle(consoleLine: string): boolean {
        return consoleLine === DemoRecordingHelper.BeginRecordingCommand || DemoRecordingHelper.demoRecordingEndRegExp.test(consoleLine);
    }

    async handleLine(consoleLine: string): Promise<void> {
        if (consoleLine === DemoRecordingHelper.BeginRecordingCommand) {
            try {
                await this.handleStartRecord();
            } catch (e) {
                //It's okay to throw errors in this method because it's an expectation that SubscriberManager knows what to do.
                // throw e;
                DemoRecordingHelper.log.error(e);
            }
            // The only other possible condition is DemoRecordingHelper.demoRecordingEndRegExp.test(consoleLine) being true.
        } else {
            DemoRecordingHelper.currentlyRecording = false;
            DemoRecordingHelper.log.info(consoleLine);
        }
        //when attempting to start the recording process check if we get told to wait for the next round to start to be able to record a demo. Log the fact that recording has to be delayed (both to this console and to the game) but will start when the next round begins. Add a service to wait for the console output indicating a round ended
    }

    /**
     * @param demoName the name of the demo to look for (before a "-2" or "-3" or "-pt2" or "-pt3)
     * @returns a Pair with the left number being the highest demo number found with this name and the right number being the highest part number associated with the highest demo number. If one of these values is 0, that respective part of the demo name doesn't exist in the latest demo under the specified demoName.
     */
    private findLatestDemoWithName(demoName: string): Pair<number, number> {
        //Highest demo number with the given demoName
        let highestDemoNumber = 1;
        let highestPartNumber = 1;
        while (existsSync(`${ConfigFactory.getConfigInstance().getConfig().csgo.csgo_demos_folder}/${demoName}${highestDemoNumber > 1 ? `-${highestDemoNumber}` : ``}.dem`)) {
            highestDemoNumber++;
        }
        //Decrement by 1 because the above loop continues until a demo with highestDemoNumber cannot be found. Therefore, decrementing this by 1 makes this point to a valid, existing demo.
        highestDemoNumber--;
        while (existsSync(`${ConfigFactory.getConfigInstance().getConfig().csgo.csgo_demos_folder}/${demoName}${highestDemoNumber > 1 ? `-${highestDemoNumber}` : ``}${highestPartNumber > 1 ? `-pt${highestPartNumber}` : ``}.dem`)) {
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

    private async promptUserForNewOrSplitDemo(demoName: string, mostRecentDemoName: string, existingDemoInfo: Pair<number, number>): Promise<string> {
        let highestDemoNumber = existingDemoInfo[0];
        let highestPartNumber = existingDemoInfo[1];
        let promptMessage = [`Demo with name '${mostRecentDemoName}' already exists.`, `If you want to record a new demo, use the command 'echo dh new'.`, `This will make a demo named '${demoName}-${highestDemoNumber + 1}'.`, `If you're rejoining a game and want to pick up where you left off, use the command 'echo dh split'.`, `This will make a demo named '${demoName}${highestDemoNumber > 1 ? `-${highestDemoNumber}` : ``}-pt${highestPartNumber + 1}'.`, `Use the command 'echo dh cancel' to back out of this prompt and cancel the request to record.`];
        promptMessage = promptMessage.map(value => "echo \"" + value + "\"");
        const decisionLine = await SubscriberManagerFactory.getSubscriberManager().searchForValue(promptMessage, DemoRecordingHelper.recordSplitOrNewDemoRegExp, true);
        const userDecision = DemoRecordingHelper.recordSplitOrNewDemoRegExp.exec(decisionLine);
        switch (userDecision![1]) {
            case 'new':
                return `${demoName}-${highestDemoNumber + 1}`
            case 'split':
                return `${demoName}${highestDemoNumber > 1 ? `-${highestDemoNumber}` : ``}-pt${highestPartNumber + 1}`;
            case 'cancel':
                return '';
        }
        throw Error(`Finished execution of ${this.promptUserForNewOrSplitDemo} without properly returning.`);
    }

    //TODO: Maybe make this stop a potential current demo recording session to avoid one more error checking case
    private async handleStartRecord() {
        let demoName = '';
        let gameMode, mapName;
        try {
            gameMode = await DemoNamingHelper.getGameModeString();
            mapName = await DemoNamingHelper.getMapName(ConfigFactory.getConfigInstance().getConfig().demo_naming_helper.attempt_hide_map_prefix);
        } catch (e) {
            throw e;
        }
        const timeStamp = DemoNamingHelper.makeTimestamp();
        ConsoleHelper.padConsole(5);
        if (gameMode === 'competitive') {
            if (Number(ConfigFactory.getConfigInstance().getConfig().demo_naming_helper.explicitly_mark_competitive_demos) === 1) {
                demoName += `${gameMode}-`
            }
        } else {
            demoName += `${gameMode}-`
        }
        demoName += `${mapName}-${timeStamp}`
        //If this demo name already exists, prompt as to whether this is a new game or whether this is a continued recording of a yet-unfinished game
        if (existsSync(`${ConfigFactory.getConfigInstance().getConfig().csgo.csgo_demos_folder}/${demoName}.dem`)) {
            const existingDemoInfo = this.findLatestDemoWithName(demoName);
            try {
                demoName = await this.promptUserForNewOrSplitDemo(demoName, DemoRecordingHelper.mostRecentDemoInfoToString(demoName, existingDemoInfo), existingDemoInfo);
            } catch (e) {
                const t = e as UserDecisionTimeoutException;
                if (t?.taskName) {
                    ConsoleHelper.padConsole(5);
                    SubscriberManagerFactory.getSubscriberManager().sendMessage(`echo \"Timed out waiting ${t.timeOut / 1000}s for user to respond to the demo splitting prompt. Cancelling...\"`)
                    ConsoleHelper.padConsole(5);
                    DemoRecordingHelper.log.warn(`Timed out waiting ${t.timeOut / 1000}s for user to respond to the demo splitting prompt. Cancelling...`)
                    demoName = '';
                } else {
                    DemoRecordingHelper.log.warn('Encountered an error when prompting the user whether to split or make a new demo.');
                    throw e;
                }

            }
            if (!demoName) {
                //User cancelled the request to record a demo
                SubscriberManagerFactory.getSubscriberManager().sendMessage('echo Cancelling');
                DemoRecordingHelper.log.debug('User cancelled when prompted whether to split or make a new demo.');
                return;
            }
        }
        // Maybe check before and after this.attemptStartRecording() to make sure a new .dem file is created.
        await this.attemptStartRecording(demoName);
    }

    private async applyRecordingPreferences(): Promise<string[]> {
        let thingsToPrintToConsole = [];
        DemoRecordingHelper.log.info("Applying recording preferences...");
        if (Number(ConfigFactory.getConfigInstance().getConfig().demo_recording_helper.record_my_voice_in_demos) === 1) {
            Cvars.setCvar('voice_loopback', "1");
            DemoRecordingHelper.log.info(`DemoHelper set voice_loopback 1.`);
        } else {
            Cvars.setCvar('voice_loopback', "0");
            DemoRecordingHelper.log.info(`DemoHelper set voice_loopback 0.`);
        }
        let myName;
        try {
            myName = await new SteamID().getPlayerProfileName();
        } catch (e) {
            DemoRecordingHelper.log.error(e);
            throw e;
        }
        if (Number(ConfigFactory.getConfigInstance().getConfig().demo_recording_helper.mute_my_voice_while_recording) === 1) {
            await VoicePlayerVolume.setVoicePlayerVolumeByName(myName, 0);
            thingsToPrintToConsole.push(`echo DemoHelper set the volume of player ${myName} to 0.`);
            DemoRecordingHelper.log.info(`DemoHelper set the volume of player ${myName} to 0.`);
        } else {
            await VoicePlayerVolume.setVoicePlayerVolumeByName(myName, 1);
            thingsToPrintToConsole.push(`echo DemoHelper set the volume of player ${myName} to 1.`);
            DemoRecordingHelper.log.info(`DemoHelper set the volume of player ${myName} to 1.`);
        }
        DemoRecordingHelper.log.info("Finished applying recording preferences.");
        return thingsToPrintToConsole;
    }

    private async attemptStartRecording(demoName: string) {
        const thingsToPrintToConsole = await this.applyRecordingPreferences();
        DemoRecordingHelper.log.info(`Attempting to start recording...`);
        const recordResultLine = await SubscriberManagerFactory.getSubscriberManager().searchForValue(`record ${demoName}`, DemoRecordingHelper.resultOfRecordCmdRegExp, false);
        const match = DemoRecordingHelper.resultOfRecordCmdRegExp.exec(recordResultLine);
        if (match![1]) {
            //Already recording
            SubscriberManagerFactory.getSubscriberManager().sendMessage('echo Already recording a demo!!');
        } else if (match![2]) {
            //Recording properly started. All clear
            ConsoleHelper.padConsole(5);
            SubscriberManagerFactory.getSubscriberManager().sendMessage(`echo DemoHelper started recording demo successfully!`);
            DemoRecordingHelper.log.info(match![2]);
            DemoRecordingHelper.log.info(`DemoHelper started recording demo '${match![3]}' successfully!`);
            DemoRecordingHelper.currentlyRecording = true;
            ConsoleHelper.padConsole(5);
            SubscriberManagerFactory.getSubscriberManager().sendMessage(`echo DemoHelper applied recording preferences and recorded a message in demo successfully!`);
            SubscriberManagerFactory.getSubscriberManager().sendMessage(thingsToPrintToConsole);
        } else if (match![4]) {
            //Please start demo recording after current round is over.
            // noinspection SpellCheckingInspection
            SubscriberManagerFactory.getSubscriberManager().sendMessage(['echo Failed to begin recording demo because a round was already in progress. Waiting for next round.', `If recording doesn't start on the next round, you may issue the command 'echo dh roundover' to begin recording.`]);
            await SubscriberManagerFactory.getSubscriberManager().searchForValue('echo', DemoRecordingHelper.beginRecordingAfterNewRoundRegExp, false);
            await this.attemptStartRecording(demoName);
        }
    }

    /**
     * This method is a synchronous way to check if DemoRecordingHelper is facilitating the recording of a demo.
     * It does _not_ interact with CS:GO's console meaning it can be used without causing a deadlock in
     * various ListenerService.canHandle() methods.
     * This method was created for the express purpose of preventing DemoPlaybackHelper from immediately
     * unmuting the player when recording began (as the message that DemoPlaybackHelper is meant to read is printed
     * to the console with an echo, intending for it to be read when playing the demo back).
     * @returns whether DemoRecordingHelper is currently managing the recording of a demo
     */
    public static synchronouslyCheckIfRecording(): boolean {
        return DemoRecordingHelper.currentlyRecording;
    }
}