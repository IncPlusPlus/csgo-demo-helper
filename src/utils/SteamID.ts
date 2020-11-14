import axios from 'axios';
import {Config} from "./Config";
import {LogHelper} from "./LogHelper";

export class SteamID {
    private static readonly log = LogHelper.getLogger('SteamID');
    private static readonly config: { [p: string]: any } = Config.getConfig();
    private static readonly steamWebAPIKey: string = SteamID.config.steam.steam_web_api_key;
    private static readonly steamID64: string = SteamID.config.steam.steamID64;
    private static readonly GetPlayerSummariesV0002: string = "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/";

    public static async getPlayerProfileName(): Promise<string> {
        let playerName;
        try {
            const response = await axios.get(`${SteamID.GetPlayerSummariesV0002}?key=${(SteamID.steamWebAPIKey)}&steamids=${(SteamID.steamID64)}`)
            // console.log(response.data.name);
            playerName = response.data.response["players"][0]["personaname"];
        } catch (error) {
            SteamID.log.error(error);
            throw error;
        }
        return playerName;
    }
}