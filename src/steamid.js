const axios = require('axios');
const ini = require('ini');
const fs = require('fs');

const config = ini.parse(fs.readFileSync('./config.ini', 'utf-8'));

const steamWebAPIKey = config.steam.steam_web_api_key;
const steamID64 = config.steam.steamID64;
const GetPlayerSummariesV0002 = "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/";

let getPlayerProfileName = async () => {
    let playerName;
    try {
        const response = await axios.get(GetPlayerSummariesV0002 + `?key=${steamWebAPIKey}&steamids=${steamID64}`)
        // console.log(response.data.name);
        playerName = response.data.response["players"][0]["personaname"];
    } catch (error) {
        console.log(error);
    }
    return playerName;
}

module.exports = steamid = {
    getPlayerProfileName
}

// (async () => {
//     let name = await getPlayerProfileName();
//     console.log(name);
// })();