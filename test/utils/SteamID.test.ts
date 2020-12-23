import axios from 'axios';
import * as configModule from "../../src/utils/Config";
import {Config} from "../../src/utils/Config";
import {ImportMock, MockManager} from "ts-mock-imports";
import {SteamID} from "../../src/utils/SteamID";
import MockAdapter from 'axios-mock-adapter';
import * as chaiAsPromised from 'chai-as-promised';
import {expect, should, use} from 'chai';

use(chaiAsPromised);

describe("SteamID", function () {
    let mockAdapter: MockAdapter;
    const config: { [p: string]: any } = {
        steam: {
            steam_web_api_key: 'XXXXXXXXXXXXXXXXXXXXXXX',
            steamID64: '76561198152767816',
        }, csgo: {
            netcon_port: 2121,
            csgo_demos_folder: 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Counter-Strike Global Offensive\\csgo',
        }, demo_recording_helper: {
            record_my_voice_in_demos: 1,
            mute_my_voice_while_recording: 1,
        }, demo_playback_helper: {
            playback_voice_player_volume: 1,
        }, demo_naming_helper: {
            explicitly_mark_competitive_demos: 0,
            attempt_hide_map_prefix: 1,
        }, internals: {
            log_level: 'info',
            console_output_promise_wait_time: 2,
            console_user_input_wait_time: 30,
        }
    };
    const GetPlayerSummariesV0002: string = "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/";
    const fullUrl = `${GetPlayerSummariesV0002}?key=${(config.steam.steam_web_api_key)}&steamids=${(config.steam.steamID64)}`;
    const playerName = "The Lovely Potato";
    const steamSuccessResponse = {
        "response": {
            "players": [{
                "steamid": config.steam.steamID64,
                "communityvisibilitystate": 3,
                "profilestate": 1,
                "personaname": playerName,
                "commentpermission": 1,
                "profileurl": "https://steamcommunity.com/id/thedudeguy1_alt/",
                "avatar": "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/f0/f0f197a9c0019d66d6599d7d17a26e92d865dd44.jpg",
                "avatarmedium": "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/f0/f0f197a9c0019d66d6599d7d17a26e92d865dd44_medium.jpg",
                "avatarfull": "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/f0/f0f197a9c0019d66d6599d7d17a26e92d865dd44_full.jpg",
                "avatarhash": "f0f197a9c0019d66d6599d7d17a26e92d865dd44",
                "lastlogoff": 1608654404,
                "personastate": 1,
                "primaryclanid": "103582791454555357",
                "timecreated": 1409606959,
                "personastateflags": 0,
                "loccountrycode": "US"
            }]
        }
    };
    let configMock: MockManager<configModule.Config>;

    beforeEach(function () {
        // This sets the mock adapter on the default instance
        mockAdapter = new MockAdapter(axios);
        configMock = ImportMock.mockClass(configModule, 'Config');
        configMock.mock('getConfig', config);
    });

    afterEach(function () {
        configMock.restore();
        mockAdapter.restore();
    });

    it("should properly parse Steam's response", function () {
        mockAdapter.onGet(fullUrl).reply(200, steamSuccessResponse);
        return expect(new SteamID().getPlayerProfileName()).to.be.eventually.eq(playerName);
    });

    it("should throw an error when the response does not contain a name", async function () {
        // https://github.com/domenic/chai-as-promised/issues/42#issuecomment-43810026
        should();
        mockAdapter.onGet(fullUrl).reply(200);
        await new SteamID().getPlayerProfileName().should.eventually.be.rejectedWith(RegExp(".*Cannot read property '.*' of undefined"));
    });

    describe("Specific error code responses", function () {
        it("should throw an error when the status code is an error code", async function () {
            // https://github.com/domenic/chai-as-promised/issues/42#issuecomment-43810026
            should();
            mockAdapter.onGet(fullUrl).reply(404);
            await new SteamID().getPlayerProfileName().should.eventually.be.rejected.and.has.property('message', 'Request failed with status code 404');
        });

        it("should throw an error when the status code is an error code", async function () {
            // https://github.com/domenic/chai-as-promised/issues/42#issuecomment-43810026
            should();
            mockAdapter.onGet(fullUrl).reply(403);
            await new SteamID().getPlayerProfileName().should.eventually.be.rejected.and.has.property('message', 'Request failed with status code 403');
        });
    });
});