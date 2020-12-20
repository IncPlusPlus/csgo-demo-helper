import axios from 'axios';
import {LogHelper} from "./LogHelper";
import {ConfigFactory} from "./ConfigFactory";

export class SteamID {
    private readonly log = LogHelper.getLogger('SteamID');
    private readonly config: { [p: string]: any } = ConfigFactory.getConfigInstance().getConfig();
    private readonly steamWebAPIKey: string = this.config.steam.steam_web_api_key;
    private readonly steamID64: string = this.config.steam.steamID64;
    private readonly GetPlayerSummariesV0002: string = "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/";

    public async getPlayerProfileName(): Promise<string> {
        let playerName;
        try {
            const response = await axios.get(`${this.GetPlayerSummariesV0002}?key=${(this.steamWebAPIKey)}&steamids=${(this.steamID64)}`)
            // console.log(response.data.name);
            playerName = response.data.response["players"][0]["personaname"];
        } catch (error) {
            this.log.error(error);
            throw error;
        }
        return playerName;
    }
}