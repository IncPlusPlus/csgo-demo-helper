const subMan = require('./utils/subscriber_manager.js');
const steamid = require('./steamid.js');
const cvars = require('./utils/cvars.js');
const demohelper = require('./demo_recording_playback_helper.js');
const consoleHelper = require('./utils/console_helper.js');
const fs = require('fs');
const util = require('util');

// (async () => {
    // let name = await steamid.getPlayerProfileName();
    //  await cvars.setVoicePlayerVolumeByName(name, 0.5);
    //  let gameType = await cvars.getCvar('game_type');
    //  let gameModeString = await cvars.getGameModeString();
    //  let mapName = await cvars.getMapName(true);
    // console.log(name);
    // console.log(gameType);
    // console.log(gameModeString);
    // console.log(mapName);
    // await consoleHelper.printWelcomeMessage();

// })();

const readFile = util.promisify(fs.readFile);
async function doFile() {
    try {
        const text = await readFile('F:\\SteamLibrary\\steamapps\\common\\Counter-Strike Global Offensive\\csgo\\glshaders.cfg');
        console.log(text);
    } catch (err) {
        console.log('Error', err);
    }
}
fs.readFile('F:\\SteamLibrary\\steamapps\\common\\Counter-Strike Global Offensive\\csgo\\glshaders.cfg', 'utf8', (text) => {
    console.log(text);
});
