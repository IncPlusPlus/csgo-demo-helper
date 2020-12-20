import {ImportMock, MockManager} from 'ts-mock-imports';
import * as configModule from "../../src/utils/Config";
import {Config} from "../../src/utils/Config";
import {SubscriberManager} from "../../src/utils/SubscriberManager";
import {SubscriberManagerFactory} from "../../src/utils/SubscriberManagerFactory";
import _ = require("mitm");
import chaiAsPromised = require('chai-as-promised');

const chai = require('chai');
chai.use(chaiAsPromised);
const expect = chai.expect;

describe("SubscriberManager", function () {
    let configMock: MockManager<configModule.Config>;
    let mitm = _();
    mitm.disable();
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
            log_level: 'trace',
            console_output_promise_wait_time: 2,
            console_user_input_wait_time: 30,
        }
    };

    beforeEach(function () {
        configMock = ImportMock.mockClass(configModule, 'Config');
        mitm = _();
        configMock.mock('getConfig', config);
    });

    afterEach(function () {
        mitm.disable();
        configMock.restore();
        /*
         * Clear the factory instance. These tests are meant to create a new instance of the Config class
         * as they test parts of the Config constructor.
         */
        SubscriberManagerFactory.clear();
    });

    describe("Basic functionality", function () {
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

    describe("In-depth tests", function () {
        it("test cvar can be retrieved", async function () {
            //Uncomment this line to get logger output during this test
            // LogHelper.configure(config)
            mitm.on("connection", function (s) {
                s.on("data", function (data) {
                    //This is where the request from the client for the value of dummy_cvar occurs
                    s.write('"dummy_cvar" = "2"');
                    s.end();
                });
            });
            const subMan = SubscriberManagerFactory.getSubscriberManager();
            await subMan.init();
            const cvarRequest: Promise<number> = subMan.requestCvarValue("dummy_cvar");
            const subManPromise = subMan.begin().then();
            await expect(cvarRequest).to.be.eventually.eq(2);
            await subManPromise;
        });

        it("times out when console_output_promise_wait_time is exceeded", async function () {
            // Set the timeout to be just long enough for the promise from requestCvarValue to timeout + a little extra.
            // This test will run longer than the timeout but for whatever reason, it's
            // super lenient so I'm only adding a small value because that's all that's necessary.
            this.timeout((config.internals.console_output_promise_wait_time * 1000) + 100);
            //Uncomment this line to get logger output during this test
            // LogHelper.configure(config)
            mitm.on("connection", function (s) {
                s.on("data", function (data) {
                    /*
                     * This is where the request from the client for the value of dummy_cvar occurs. Instead of
                     * providing a response, we wait for the time that SubscriberManager takes to time out (while
                     * it waits to hear back about the cvar value) and then close the connection.
                     */
                    // After we're reasonably sure that the promise for the cvar value has been rejected, shut down SubscriberManager
                    setTimeout(() => s.end(), config.internals.console_output_promise_wait_time + 2000);
                });
            });
            const subMan = SubscriberManagerFactory.getSubscriberManager();
            await subMan.init();
            const cvarRequest: Promise<number> = subMan.requestCvarValue("dummy_cvar");
            // https://www.chaijs.com/guide/styles/#should
            chai.should();

            /*
             * SubscriberManager.begin() has to be called like this and cannot be called with an await or else you'll
             * get PromiseRejectionHandledWarning: Promise rejection was handled asynchronously.
             * This could have something to do with https://github.com/domenic/chai-as-promised/issues/173 but seeing as
             * I can actually work around causing this warning, I'll keep doing this the weird-looking way.
             */
            const sPromise = subMan.begin().then();
            await expect(cvarRequest).to.be.eventually.rejectedWith(RegExp(`^Request for Cvar \'dummy_cvar\' timed out in 2000ms.$`));
            /*
             * Wait for SubscriberManager to shut down. This has to be below the 'await expect()' stuff or else you'll
             * get PromiseRejectionHandledWarning: Promise rejection was handled asynchronously.
             */
            await sPromise;
        });
    });
});