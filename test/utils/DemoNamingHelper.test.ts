import {ImportMock, MockManager} from 'ts-mock-imports';
import * as configModule from '../../src/utils/Config';
import {Config} from '../../src/utils/Config';
import {expect, use} from 'chai';
import {DemoNamingHelper} from "../../src/utils/DemoNamingHelper";
import {createSandbox} from 'sinon';
import {Cvars} from "../../src/utils/Cvars";
import * as chaiAsPromised from 'chai-as-promised';
import {it} from "mocha";
import * as subscriberManagerModule from "../../src/utils/SubscriberManager";
import {SubscriberManager} from "../../src/utils/SubscriberManager";
import _ = require("mitm");

use(chaiAsPromised);

describe("DemoNamingHelper", function () {
    const sandbox = createSandbox();
    let mitm = _();
    mitm.disable();
    let configMock: MockManager<configModule.Config>;
    let subManMock: MockManager<subscriberManagerModule.SubscriberManager>;
    // This string contains all of the characters that exist before the map name appears in the output of the status cmd
    const prefixInStatusMessageBeforeMapName = 'map     : ';
    const sampleMapNames = ['cs_agency', 'cs_assault', 'cs_italy', 'cs_militia', 'cs_office', 'de_ancient', 'de_anubis', 'de_bank', 'de_cache', 'de_canals', 'de_cbble', 'de_dust2', 'de_elysion', 'de_engage', 'de_guard', 'de_inferno', 'de_lake', 'de_mirage', 'de_nuke', 'de_oldnuke', 'de_overpass', 'de_safehouse', 'de_shortnuke', 'de_stmark', 'de_sugarcane', 'de_train', 'de_vertigo', 'gd_cbble'];
    const truncatedMapNames = sampleMapNames.map(value => value.substr(3));

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
            log_level: 'info',
            console_output_promise_wait_time: 2,
            console_user_input_wait_time: 30,
        }
    };

    beforeEach(function () {
        configMock = ImportMock.mockClass(configModule, 'Config');
        subManMock = ImportMock.mockClass(subscriberManagerModule, 'SubscriberManager');
        configMock.mock('getConfig', config);
        mitm = _();
    });

    afterEach(function () {
        configMock.restore();
        subManMock.restore();
        sandbox.restore();
        mitm.disable();
    });

    describe("getGameModeString", function () {
        it("provides correct output", function () {
            //TODO
            this.skip();
        });

        it("fails properly", function () {
            //Uncomment this line to get logger output during this test
            // LogHelper.configure(config)

            const getCvarStub = sandbox.stub(Cvars, "getCvar");
            getCvarStub.returns(new Promise((resolve, reject) => reject(Error('Rejected intentionally'))));
            return expect(DemoNamingHelper.getGameModeString()).to.eventually.be.rejected;
        });
    });

    it("makes a proper timestamp", function () {
        const d = new Date();
        // This function is so simple but coverage is necessary so this test exists anyways
        expect(DemoNamingHelper.makeTimestamp()).to.equal(`${d.getMonth() + 1}-${d.getDate()}-${d.getFullYear()}`);
    });

    describe("getMapName", function () {
        for (let i = 0; i < 2; i++) {
            for (let j = 0; j < sampleMapNames.length; j++) {
                it(`properly ${i ? 'gets' : 'truncates'} the name of ${sampleMapNames[j]}`, async function () {
                    const searchForValueMock = subManMock.mock("searchForValue");
                    searchForValueMock.returns(`${prefixInStatusMessageBeforeMapName}${sampleMapNames[j]}`);
                    // Get a new SubscriberManager every time. For some reason the test fails without this.
                    subManMock.mock("isAlive").returns(false);
                    // !!i is an easy way to cast the integer to a boolean
                    await expect(DemoNamingHelper.getMapName(!!i)).to.eventually.eq(i ? truncatedMapNames[j] : sampleMapNames[j]);
                });
            }
        }
    });
});