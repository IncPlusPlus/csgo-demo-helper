import {ImportMock, MockManager} from 'ts-mock-imports';
import * as configModule from "../../src/utils/Config";
import {Config} from "../../src/utils/Config";
import {SubscriberManager} from "../../src/utils/SubscriberManager";
import {SubscriberManagerFactory} from "../../src/utils/SubscriberManagerFactory";
import _ = require("mitm");

describe("SubscriberManager", function () {
    let configMock: MockManager<configModule.Config>;
    let mitm = _();
    let config: { [p: string]: any } = {
        steam: {
            steam_web_api_key: 'XXXXXXXXXXXXXXXXXXXXXXX',
            steamID64: '76561197960435530',
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
            log_level: 'debug',
            console_output_promise_wait_time: 2,
            console_user_input_wait_time: 30,
        }
    }

    beforeEach(function () {
        configMock = ImportMock.mockClass(configModule, 'Config');
        mitm = _();
        configMock.mock('getConfig', config);
    })

    afterEach(function () {
        mitm.disable();
        configMock.restore();
    })

    it("can be initialized with mitm", async function () {
        mitm.on("connection", function (s) {
            s.end();
        });
        await SubscriberManagerFactory.getSubscriberManager().init();
    });

    it("returns from begin() when socket closes", async function () {
        mitm.on("connection", function (s) {
            s.end();
        });
        const subMan = SubscriberManagerFactory.getSubscriberManager();
        await subMan.init();
        await subMan.begin();
    });
});