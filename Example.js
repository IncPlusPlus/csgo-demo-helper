const steamid = require('./steamid.js');
const cvars = require('./cvars.js');

(async () => {
    let name = await steamid.getPlayerProfileName();
     await cvars.setVoicePlayerVolumeByName(name, 0.5);
     let gameType = await cvars.getCvar('game_type');
     let gameModeString = await cvars.getGameModeString();
     let mapName = await cvars.getMapName(true);
    console.log(name);
    console.log(gameType);
    console.log(gameModeString);
    console.log(mapName);
})();