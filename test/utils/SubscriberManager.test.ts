import * as mock from 'mock-fs';
import {join} from "path";
import {stringify} from "ini";
import {Config} from "../../src/utils/Config";
import {SubscriberManager} from "../../src/utils/SubscriberManager";
import {SubscriberManagerFactory} from "../../src/utils/SubscriberManagerFactory";
import {SinonStub, stub} from 'sinon';
import _ = require("mitm");

describe("SubscriberManager", function () {
    let mitm = _();
    const config_directory: string = join(__dirname, "..", "..");
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
    let initStub: SinonStub;

    beforeEach(function () {
        mock({
            get [join(config_directory, "config.ini")]() {
                return stringify(config);
            },
            get [join(config_directory, "config.template.ini")]() {
                return stringify(config);
            },
            'C:/Program Files (x86)/Steam/steamapps/common/Counter-Strike Global Offensive': {
                //csgo.exe just needs to exist. We don't read the content so it's fine to just have placeholder content
                'csgo.exe': Buffer.from([8, 6, 7, 5, 3, 0, 9]),
            },
        });
        mitm = _();
        initStub = stub(Config, 'getConfig').returns(config);
    })

    afterEach(function () {
        mock.restore();
        mitm.disable();
        initStub.restore();
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