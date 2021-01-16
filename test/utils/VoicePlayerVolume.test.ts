import {SubscriberManager} from "../../src/utils/SubscriberManager";
import {ImportMock, MockManager} from "ts-mock-imports";
import * as configModule from "../../src/utils/Config";
import {SubscriberManagerFactory} from "../../src/utils/SubscriberManagerFactory";
import {createSandbox} from "sinon";
import {VoicePlayerVolume} from "../../src/utils/VoicePlayerVolume";
import {expect, use} from "chai";
import {it} from "mocha";
import * as chaiAsPromised from 'chai-as-promised';
import _ = require("mitm");

use(chaiAsPromised);

describe("VoicePlayerVolume", function () {
    const voicePlayerVolumeOutputListenServer =
        `Player#     Player Name    Volume
-------     -----------    ------
  1   The Lovely Potato      1.00
-------     -----------    ------
Use voice_player_volume player# volume -- to set the player's volume to the given amount`;
    const voicePlayerVolumeOutputMatchmaking =
        `Player#     Player Name    Volume
-------     -----------    ------
  2            Maxhulls      1.00
  3                NOFX      0.35
  4   The Lovely Potato      1.00
  5          bombardius      1.00
  6              R.E.K.      0.99
  7            Bolt Guy      1.00
  13                bowl      1.00
  15               $pent      0.75
-------     -----------    ------
Use voice_player_volume player# volume -- to set the player's volume to the given amount`;
    const voicePlayerVolumeObjectMatchmaking: { Volume: number; PlayerName: string; PlayerNumber: number }[] = [
        {
            PlayerName: "Maxhulls",
            PlayerNumber: 2,
            Volume: 1.00
        },
        {
            PlayerName: "NOFX",
            PlayerNumber: 3,
            Volume: 0.35
        },
        {
            PlayerName: "The Lovely Potato",
            PlayerNumber: 4,
            Volume: 1.00
        },
        {
            PlayerName: "bombardius",
            PlayerNumber: 5,
            Volume: 1.00
        },
        {
            PlayerName: "R.E.K.",
            PlayerNumber: 6,
            Volume: 0.99
        },
        {
            PlayerName: "Bolt Guy",
            PlayerNumber: 7,
            Volume: 1.00
        },
        {
            PlayerName: "bowl",
            PlayerNumber: 13,
            Volume: 1.00
        },
        {
            PlayerName: "$pent",
            PlayerNumber: 15,
            Volume: 0.75
        },
    ];
    const sandbox = createSandbox();
    let subMan: SubscriberManager;
    let mitm = _();
    mitm.disable();
    let configMock: MockManager<configModule.Config>;
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
        mitm = _();
        subMan = SubscriberManagerFactory.getSubscriberManager();
    });

    afterEach(function () {
        configMock.restore();
        mitm.disable();
        SubscriberManagerFactory.clear();
        sandbox.restore();
    });


    it("can set a player's volume by name", async function () {
        const setVoicePlayerVolumeStub = sandbox.stub(VoicePlayerVolume, "setVoicePlayerVolume");
        mitm.on("connection", function (s) {
            s.on("data", function (data) {
                expect(data.toString()).eq('voice_player_volume\n');
                s.write(voicePlayerVolumeOutputMatchmaking + '\n');
                s.end();
            });
        });

        await subMan.init();
        const subManBeginPromise: Promise<void> = subMan.begin();
        await expect(VoicePlayerVolume.setVoicePlayerVolumeByName("The Lovely Potato", .59)).to.eventually.be.fulfilled;
        expect(setVoicePlayerVolumeStub.callCount).to.eq(1);
        await subManBeginPromise;
    });

    it("will fail gracefully when player cannot be found", async function () {
        const setVoicePlayerVolumeStub = sandbox.stub(VoicePlayerVolume, "setVoicePlayerVolume");
        mitm.on("connection", function (s) {
            s.on("data", function (data) {
                expect(data.toString()).eq('voice_player_volume\n');
                s.write(voicePlayerVolumeOutputMatchmaking + '\n');
                s.end();
            });
        });
        await subMan.init();
        const subManBeginPromise: Promise<void> = subMan.begin();
        // For now, this method doesn't throw when the individual can't be found. It only warns.
        await expect(VoicePlayerVolume.setVoicePlayerVolumeByName("A name that doesn't exist", 0.02)).to.eventually.be.fulfilled;
        expect(setVoicePlayerVolumeStub.callCount).to.eq(0);
        await subManBeginPromise;
    });

    it("can set a player's volume by id", async function () {
        mitm.on("connection", function (s) {
            s.on("data", function (data) {
                expect(data.toString()).eq('voice_player_volume 1 0.02\n');
                s.end();
            });
        });
        await subMan.init();
        const subManBeginPromise: Promise<void> = subMan.begin();
        await expect(() => VoicePlayerVolume.setVoicePlayerVolume(1, 0.02)).to.not.throw();
        await subManBeginPromise;
    });

    it("can properly parse voice_player_volume output", async function () {
        mitm.on("connection", function (s) {
            s.on("data", function (data) {
                expect(data.toString()).eq('voice_player_volume\n');
                s.write(voicePlayerVolumeOutputMatchmaking + '\n');
                // And then close this socket shortly afterwards
                s.end();
            });
        });
        await subMan.init();
        const subManBeginPromise: Promise<void> = subMan.begin();
        await expect(VoicePlayerVolume.getVoicePlayerVolumeValues()).to.eventually.be.deep.eq(voicePlayerVolumeObjectMatchmaking);
        await subManBeginPromise;
    });

    it("will only start reading after seeing the padding dashes", async function () {
        mitm.on("connection", function (s) {
            s.on("data", function (data) {
                expect(data.toString()).eq('voice_player_volume\n');
                s.write('4   The Lovely Potato      1.00' + '\n');
                s.write(voicePlayerVolumeOutputMatchmaking + '\n');
                // And then close this socket shortly afterwards
                s.end();
            });
        });
        await subMan.init();
        const subManBeginPromise: Promise<void> = subMan.begin();
        await expect(VoicePlayerVolume.getVoicePlayerVolumeValues()).to.eventually.be.deep.eq(voicePlayerVolumeObjectMatchmaking);
        await subManBeginPromise;
    });
});