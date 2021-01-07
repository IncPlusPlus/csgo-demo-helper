import {ImportMock, MockManager} from "ts-mock-imports";
import * as configModule from "../../src/utils/Config";
import {TimeoutPromise} from "../../src/utils/TimeoutPromise";
import {expect, should, use} from "chai";
import * as chaiAsPromised from 'chai-as-promised';
import pDefer = require("p-defer");

use(chaiAsPromised);

describe("TimeoutPromise", function () {
    let configMock: MockManager<configModule.Config>;
    let config = {
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
            //shortened times just to cut down on test time
            console_output_promise_wait_time: 0.5,
            console_user_input_wait_time: 1,
        }
    };

    beforeEach(function () {
        configMock = ImportMock.mockClass(configModule, 'Config');
        configMock.mock('getConfig', config);
    });

    afterEach(function () {
        configMock.restore();
    });

    it("Will not cause unhandled rejection issues when a promise is resolved.", async function () {
        const stringValueWhenResolved = "Hi there! I'm all done now!";
        const deferred: pDefer.DeferredPromise<string> = pDefer();
        const timeoutPromise = new TimeoutPromise(config).timeoutPromise(deferred.promise, 'Some task name', false,);
        expect(timeoutPromise).to.not.be.fulfilled;
        deferred.resolve(stringValueWhenResolved);
        await expect(timeoutPromise).to.eventually.not.be.rejected;
        await expect(timeoutPromise).to.eventually.equal(stringValueWhenResolved);
    });

    it("Will reject the TimeoutPromise when time runs out", function () {
        const stringValueWhenResolved = "Hi there! I'm all done now!";
        const deferred: pDefer.DeferredPromise<string> = pDefer();
        setTimeout(function () {
            deferred.resolve(stringValueWhenResolved);
        }, (config.internals.console_output_promise_wait_time * 1000) + 500);
        return expect(new TimeoutPromise(config).timeoutPromise(deferred.promise, 'Some task name', false,)).to.eventually.be.rejected;
    });

    it("Will not cause unhandled rejection issues when a promise is resolved (user decision).", async function () {
        const stringValueWhenResolved = "Hi there! I'm all done now!";
        const deferred: pDefer.DeferredPromise<string> = pDefer();
        const timeoutPromise = new TimeoutPromise(config).timeoutPromise(deferred.promise, 'Some task name', true,);
        expect(timeoutPromise).to.not.be.fulfilled;
        deferred.resolve(stringValueWhenResolved);
        await expect(timeoutPromise).to.eventually.not.be.rejected;
        await expect(timeoutPromise).to.eventually.equal(stringValueWhenResolved);
    });

    it("Will reject the TimeoutPromise when time runs out (user decision)", function () {
        should();
        this.timeout(4000);
        const stringValueWhenResolved = "Hi there! I'm all done now!";
        const deferred: pDefer.DeferredPromise<string> = pDefer();
        setTimeout(function () {
            deferred.resolve(stringValueWhenResolved);
        }, (config.internals.console_user_input_wait_time * 1000) + 1500);
        return new TimeoutPromise(config).timeoutPromise(deferred.promise, 'Some task name', true,).should.eventually.be.rejectedWith(RegExp('.*user input.*'));
    });
});