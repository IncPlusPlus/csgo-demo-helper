/*
 * When I record POV demos, I like to keep them organized by naming them by game mode, map, and date. If I've already
 * played the same map and game mode as a previous demo, I append "-2" or a greater number to the end of the demo name
 * to indicate it was the second time playing that combination of game mode and map that day. If I have to disconnect
 * and stop recording the demo, I typically append "-pt2" to indicate this is the second part of the same demo.
 * This tool helps by automating the naming process including checking for existing demos.
 */

import {Cvars} from "./Cvars";
import {SubscriberManager} from "./SubscriberManager";
import {LogHelper} from "./LogHelper";

export class DemoNamingHelper {
    // noinspection SpellCheckingInspection
    private static readonly gameModeStrings: string[][] = [
        ["casual", "armsrace", "training", "custom", "cooperative", "skirmish"],
        ["competitive", "demolition"],
        ["wingman", "deathmatch"]
    ];
    private static readonly log = LogHelper.getLogger('DemoNamingHelper');
    private static readonly mapFromStatusRegExp: RegExp = RegExp('map\\s+: ([a-zA-Z_]+).*');

    /**
     * See https://totalcsgo.com/command/gametype
     * @returns {Promise<string>} the human friendly summarization of what
     * game mode is being played. This ignores the case of Scrim Competitive 5v5
     * and will always refer to Scrim Competitive 5v5 and 2v2 as "wingman".
     */
    public static getGameModeString = async (): Promise<string> => {
        let gameMode, gameType;
        try {
            gameMode = Number(await Cvars.getCvar('game_mode'));
            gameType = Number(await Cvars.getCvar('game_type'));
        } catch (e) {
            throw e;
        }

        return DemoNamingHelper.gameModeStrings[gameMode][gameType];
    }

    public static makeTimestamp = () => {
        const d = new Date();
        return `${d.getMonth() + 1}-${d.getDate()}-${d.getFullYear()}`;
    }

    public static getMapName = async (excludePrefix: boolean): Promise<string> => {
        const mapLine = await SubscriberManager.searchForValue('status', DemoNamingHelper.mapFromStatusRegExp);
        const mapName = DemoNamingHelper.mapFromStatusRegExp.exec(mapLine);
        if (mapName) {
            if (excludePrefix) {
                //Attempt to remove the first underscore in the map name and everything before it
                return mapName[1].substr(mapName[1].indexOf('_') + 1);
            } else {
                return mapName[1];
            }
        } else {
            DemoNamingHelper.log.error('Failed to match regex when looking for map name.');
            return 'UNKNOWN';
        }
    }
}