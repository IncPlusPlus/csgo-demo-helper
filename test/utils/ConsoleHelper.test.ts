import {createSandbox, SinonStub, SinonStubbedInstance} from "sinon";
import {SubscriberManagerFactory} from "../../src/utils/SubscriberManagerFactory";
import {ConsoleHelper} from "../../src/utils/ConsoleHelper";
import {expect} from "chai";
import * as subscriberManagerModule from "../../src/utils/SubscriberManager";
import {SubscriberManager} from "../../src/utils/SubscriberManager";
import {ImportMock, MockManager} from "ts-mock-imports";
import * as configModule from "../../src/utils/Config";

describe("ConsoleHelper", function () {
    const sandbox = createSandbox();
    let subMan;
    let sendMessageStub: SinonStubbedInstance<typeof SubscriberManager>;
    let configMock: MockManager<configModule.Config>;
    let subManMock: MockManager<subscriberManagerModule.SubscriberManager>;
    let sendMessageMock: SinonStub<any[], any>;
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
        configMock.mock('getConfig', config);
        subManMock = ImportMock.mockClass(subscriberManagerModule, 'SubscriberManager');
        sendMessageMock = subManMock.mock('sendMessage');
        subManMock.mock("isAlive").returns(false);
        subMan = SubscriberManagerFactory.getSubscriberManager();
        sendMessageStub = sandbox.stub(SubscriberManager);
    });

    afterEach(function () {
        configMock.restore();
        subManMock.restore();
        SubscriberManagerFactory.clear();
        sandbox.restore();
    });

    it("can clear the console", function () {
        ConsoleHelper.clearConsole();
        expect(sendMessageMock.callCount).eq(1);
        expect(sendMessageMock.getCall(0).firstArg).eq('clear');
    });

    describe("repetitive padding just for funzies", function () {
        for (let i = 2; i < 100; i *= 2) {
            it(`can pad the console with ${i} lines`, function () {
                ConsoleHelper.padConsole(i);
                expect(sendMessageMock.callCount).eq(i);
                expect(sendMessageMock.alwaysCalledWithExactly('echo')).to.be.true;
            });
        }
    });

    it("can show the console", function () {
        ConsoleHelper.showConsole();
        expect(sendMessageMock.callCount).eq(1);
        expect(sendMessageMock.getCall(0).firstArg).eq('showconsole');
    });

    it("can hide the console", function () {
        ConsoleHelper.hideConsole();
        expect(sendMessageMock.callCount).eq(1);
        expect(sendMessageMock.getCall(0).firstArg).eq('hideconsole');
    });
});