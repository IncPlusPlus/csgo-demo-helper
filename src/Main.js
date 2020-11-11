const subMan = require('./utils/subscriber_manager.js');
const consoleHelper = require('./utils/console_helper.js')
const cvars = require('./utils/cvars.js');
const ini = require('ini');
const fs = require('fs');

const config = ini.parse(fs.readFileSync('./config.ini', 'utf-8'));
const csgoStartupFinishedString = 'ChangeGameUIState: CSGO_GAME_UI_STATE_INTROMOVIE -> CSGO_GAME_UI_STATE_MAINMENU';

const showWelcomeMessageOnStartup = async (incomingMessageText) => {
    if (incomingMessageText === csgoStartupFinishedString) {
        consoleHelper.showConsole();
        consoleHelper.clearConsole();
        consoleHelper.printWelcomeMessage();
        let loopval = await cvars.getCvar('voice_loopback');
        return true;
    } else {
        return false;
    }
}

(async () => {
    if(!fs.existsSync(config.csgo.csgo_demos_folder+'/../csgo.exe')) {
        console.log(`WARNING: Couldn't find CS:GO's executable at the path '${config.csgo.csgo_demos_folder+'/../csgo.exe'}'.`)
    }
    subMan.subscribe(showWelcomeMessageOnStartup);
    await subMan.init();
})();
