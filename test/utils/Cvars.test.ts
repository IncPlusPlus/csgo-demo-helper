import {createSandbox, SinonStub, SinonStubbedInstance} from "sinon";
import {SubscriberManagerFactory} from "../../src/utils/SubscriberManagerFactory";
import {expect, use} from "chai";
import * as subscriberManagerModule from "../../src/utils/SubscriberManager";
import {SubscriberManager} from "../../src/utils/SubscriberManager";
import {ImportMock, MockManager} from "ts-mock-imports";
import * as configModule from "../../src/utils/Config";
import {Cvars} from "../../src/utils/Cvars";
import * as chaiAsPromised from 'chai-as-promised';

use(chaiAsPromised);

describe("Cvars", function () {
    const sandbox = createSandbox();
    let subMan;
    let sendMessageStub: SinonStubbedInstance<typeof SubscriberManager>;
    let configMock: MockManager<configModule.Config>;
    let subManMock: MockManager<subscriberManagerModule.SubscriberManager>;
    let sendMessageMock: SinonStub<any[], any>;
    let requestCvarValueMock: SinonStub<any[], any>;
    const cvarArray = ['game_type', 'game_mode', 'sv_gravity'];
    const cvarValues = ['0', '1', '800'];
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
        requestCvarValueMock = subManMock.mock('requestCvarValue');

        for (let i = 0; i < cvarArray.length; i++) {
            requestCvarValueMock.withArgs(cvarArray[i]).returns(cvarValues[i]);
        }

        subManMock.mock("isAlive").returns(false);
        subMan = SubscriberManagerFactory.getSubscriberManager();
        sendMessageStub = sandbox.stub(SubscriberManager);
    });

    afterEach(function () {
        requestCvarValueMock.reset();
        configMock.restore();
        subManMock.restore();
        SubscriberManagerFactory.clear();
        sandbox.restore();
    });

    it("can set a cvar", function () {
        Cvars.setCvar('sv_cheats', "1");
        expect(sendMessageMock.callCount).eq(1);
        expect(sendMessageMock.getCall(0).firstArg).eq('sv_cheats 1');
    });

    it("can get a cvar", async function () {
        for (let i = 0; i < cvarArray.length; i++) {
            await expect(Cvars.getCvar(cvarArray[i])).to.eventually.eq(cvarValues[i]);
            await expect(requestCvarValueMock.callCount).eq(i + 1);
        }
    });
});