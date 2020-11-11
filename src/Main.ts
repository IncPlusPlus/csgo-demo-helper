const subMan = require('./utils/SubscriberManager');
import {ConsoleHelper} from "./utils/ConsoleHelper";
import {Cvars} from "./utils/Cvars";

const ini = require('ini');
const fs = require('fs');

const config = ini.parse(fs.readFileSync('./config.ini', 'utf-8'));
const csgoStartupFinishedString = 'ChangeGameUIState: CSGO_GAME_UI_STATE_INTROMOVIE -> CSGO_GAME_UI_STATE_MAINMENU';

async function showWelcomeMessageOnStartup(incomingMessageText: string): Promise<boolean> {
    if (incomingMessageText === csgoStartupFinishedString) {
        ConsoleHelper.showConsole();
        ConsoleHelper.clearConsole();
        ConsoleHelper.printWelcomeMessage();
        let loopval = await Cvars.getCvar('voice_loopback');
        return true;
    } else {
        return false;
    }
}

(async () => {
    if(!fs.existsSync(config.csgo.csgo_demos_folder+'/../csgo.exe')) {
        console.log(`WARNING: Couldn't find CS:GO's executable at the path '${config.csgo.csgo_demos_folder+'/../csgo.exe'}'.`)
    }
    subMan.SubscriberManager.subscribe(showWelcomeMessageOnStartup);
    await subMan.SubscriberManager.init()
    subMan.SubscriberManager.begin().then();
    let gameModeVar = await subMan.SubscriberManager.requestCvarValue('fps_screenshot_frequency');
    console.log(`fps_screenshot_frequency is ${gameModeVar}`);
})();
