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
 * This helper will echo info into the demo (so long as demo_recordcommands is set to 1) which it will pick up on when
 * playing these demos back. When playing demos back, the command that was used to set your own volume to 0 will
 * play back. However, this tool will change that value back to 1.
 */

const net = require('net');
const readline = require('readline');
const ini = require('ini');
const fs = require('fs');
const consoleHelper = require('./utils/ConsoleHelper.ts')

const config = ini.parse(fs.readFileSync('./config.ini', 'utf-8'));
const port = config.csgo.netcon_port;

const demoRecordingEndRegExp = RegExp('^Completed demo, recording time \\d+\\.\\d+, game frames \\d+\\.$');
//A message like this will be echoed right when the demo starts recording.
const playerMutedByDemoHelperRegExp = RegExp('^DemoHelper set the volume of player (.*) to 0\\.$');
const beginRecordingCommand = 'dh rec';

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let handleBeginRecordingCommand = (incomingMessage) => {
    if(incomingMessage === beginRecordingCommand) {
        //do stuff!!!!!
        return true;
    } else {
        return false;
    }
}

let handlePlayerMutedEchoedInDemo = (incomingMessage) => {
    if(playerMutedByDemoHelperRegExp.test(incomingMessage)) {
        //do stuff!!!!
        return true;
    } else {
        return false;
    }
}

module.exports = demo_recording_helper = {
    handleBeginRecordingCommand,
    handlePlayerMutedEchoedInDemo,
}