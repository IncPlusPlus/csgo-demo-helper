import {ImportMock, MockManager} from 'ts-mock-imports';
import * as configModule from '../../src/utils/Config';
import {Config} from '../../src/utils/Config';
import {expect} from 'chai';
import {ShowHelpMessageWhenAsked} from "../../src/services/ShowHelpMessageWhenAsked";
import {SubscriberManagerFactory} from "../../src/utils/SubscriberManagerFactory";
import {DemoPlaybackHelper} from "../../src/services/DemoPlaybackHelper";
import {createSandbox} from 'sinon';
import {SubscriberManager} from '../../src/utils/SubscriberManager';
import {VoicePlayerVolume} from "../../src/utils/VoicePlayerVolume";
import _ = require("mitm");

describe("ShowHelpMessageWhenAsked", function () {
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
    });

    //TODO: The tests below this line can probably be revised a bit by calling a function which runs the assertions they all have in common

    // This test doesn't care about whether or not the player actually ends up unmuted. It's merely to ensure special characters don't break it.
    describe("Test unmuting with different demo and player names", function () {
        const sandbox = createSandbox();
        // This might be a little overboard. I might reduce this list later
        // noinspection SpellCheckingInspection
        const playerNames = [`Ricardo`, `The Lovely Potato`, `Puunk_`, `Brogle Mastah`, ``, `♥ Big Love! ♥`, `and thєη he ĐIED!`, `⚜ leó (shyberopsh)`, `🅻 🅴 🅶 🅸 🆃 💥💦`, `nubˢᶜʳᵘᵇ`, `I'm cute ♡`, `𝚖𝚎 𝚊𝚗𝚍 𝚢𝚘𝚞`,
            "˛˚˛*˛°.˛*.˛°˛.*★˚˛*˛°.˛*.˛°˛.*★*★* 。*˛.", "˛°_██_*.。*./ ♥ \ .˛* .˛。.˛.*.★* *★ 。*", "˛. (´• ̮•)*.。*/♫.♫\*˛.* ˛_Π_____.♥ ♥ ˛* ˛*", ".°( . • . ) ˛°./• '♫ ' •\.˛*./______/~＼*. ˛*.。˛* ˛.*。", "*(...'•'.. ) *˛╬╬╬╬╬˛°.｜田田 ｜門｜╬╬╬╬╬*˚ .˛", '¯˜"*°••°*" ˜¯`´¯˜"*°••°*"˜¯` ´¯˜"*°´¯˜"*°••°*"˜¯`´¯˜"*°","•*´❄`*•.¸.•*´❄`*•.¸.•*´❄`*•.¸.•*´❄`*•.¸.•*´❄`*•.¸.•*´❄`*•.', "(☆✦✦ℳerry ℭhristmas & a ℋappy 2021!✦✦*☆ )", "*•.✩.•*´*•.✩.•*´*•.✩.•*´*•.✩.•*´*•.✩.•*´*•.✩.•*´*•.✩.•*",
            "௵﷽﷽﷽﷽﷽﷽﷽﷽﷽﷽﷽﷽﷽﷽﷽﷽﷽﷽﷽﷽", "✨🌟", "●▬▬▬▬๑۩۩๑▬▬▬▬▬●", "Продам аккаунт за 2к рублей", "ͬͬͤ ͦͬͬͤ ͬͦͬͬͤ ͤͬ ͪ ͪ ͪ ͪͪͪͪͪͪͪͪͪͪ⎠", "", "", " ", "", "𝒐𝒓𝒑𝒉𝒊𝒄;", ".¸.•*´", " 9", "   ", "     ", "            "
        ];
        // noinspection SpellCheckingInspection
        const demoNames = [`office-10-20-2020`, `wingman-vertigo-1-31-2021`, `deathmatch-dust2-11-8-2020`, `de_nuke-11-13-2020`, `deathmatch-de_nuke-9-20-2020`];

        afterEach(function () {
            sandbox.restore();
        });

        for (let playerName of playerNames) {
            for (let demoName of demoNames) {
                it(`Demo '${demoName}' and player '${playerName}'`, async function () {
                    mitm.on("connection", function (s) {
                        s.on("data", function (data) {
                            // When the socket receives data, it should just be the demo_info command.
                            expect(data.toString()).eq('demo_info\n');
                            // We respond back with a phrase matching the search RegExp
                            s.write(`Demo contents for ${demoName}.dem:\n`);
                            // And then close this socket shortly afterwards
                            s.end();
                        });
                        //Put the info about a player being muted into the console
                        s.write(`DemoHelper set the volume of player ${playerName} to 0.\n`);
                    });
                    //Uncomment this line to get logger output during this test
                    // LogHelper.configure(config)
                    const playbackHelper = new DemoPlaybackHelper();
                    subMan.subscribe(playbackHelper);
                    const canHandleSpy = sandbox.spy(playbackHelper, "canHandle");
                    const handleLineSpy = sandbox.spy(playbackHelper, "handleLine");
                    //We use a stub here instead of a spy because the unmuting action needn't complete since that's not part of the SUT
                    const setPlayerVolumeStub = sandbox.stub(VoicePlayerVolume, "setVoicePlayerVolumeByName");
                    await subMan.init();
                    await subMan.begin();
                    expect(canHandleSpy.callCount).eq(1);
                    expect(handleLineSpy.callCount).eq(1);
                    expect(setPlayerVolumeStub.callCount).eq(1);
                    //Assert that VoicePlayerVolume.setVoicePlayerVolumeByName() was called with the right player name and the volume value of 1
                    expect(setPlayerVolumeStub.getCall(0).args[0]).eq(playerName);
                    expect(setPlayerVolumeStub.getCall(0).args[1]).eq(1);
                });
            }
        }
    });

    describe("Ensure player stays muted if the user wants it so", function () {
        const sandbox = createSandbox();

        afterEach(function () {
            sandbox.restore();
        });

        after(function () {
            // Return the config variable to how it was outside of this test
            // This should already return to 1 but this is to be absolutely certain
            config.demo_playback_helper.playback_voice_player_volume = 1;
        });

        // With i=0, the player stays muted. With i=1, the player should be unmuted. Doing this in a loop saves space.
        for (let i = 0; i < 2; i++) {
            it(`Player ${i === 0 ? 'STAYS muted' : 'is UNMUTED'} if the user so wishes`, async function () {
                config.demo_playback_helper.playback_voice_player_volume = i;
                mitm.on("connection", function (s) {
                    s.on("data", function (data) {
                        // When the socket receives data, it should just be the demo_info command.
                        expect(data.toString()).eq('demo_info\n');
                        // We respond back with a phrase matching the search RegExp
                        s.write(`Demo contents for office-8-20-2019.dem:\n`);
                        // And then close this socket shortly afterwards
                        s.end();
                    });
                    //Put the info about a player being muted into the console
                    s.write(`DemoHelper set the volume of player The Lovely Potato to 0.\n`);
                });
                //Uncomment this line to get logger output during this test
                // LogHelper.configure(config)
                const playbackHelper = new DemoPlaybackHelper();
                subMan.subscribe(playbackHelper);
                const canHandleSpy = sandbox.spy(playbackHelper, "canHandle");
                const handleLineSpy = sandbox.spy(playbackHelper, "handleLine");
                //We use a stub here instead of a spy because the unmuting action needn't complete since that's not part of the SUT
                const setPlayerVolumeStub = sandbox.stub(VoicePlayerVolume, "setVoicePlayerVolumeByName");
                await subMan.init();
                await subMan.begin();
                expect(canHandleSpy.callCount).eq(1);
                expect(handleLineSpy.callCount).eq(1);
                expect(setPlayerVolumeStub.callCount).eq(i);
            });
        }
    })

    describe("Test currentlyPlayingADemo (and getCurrentDemoName)", function () {
        const sandbox = createSandbox();

        afterEach(function () {
            sandbox.restore();
        });

        // Run the same test twice to reduce code duplication. The i=0 run is when we're not playing a demo and the other is for when we are
        for (let i = 0; i < 2; i++) {
            it(`PlaybackHelper ${i === 0 ? 'does nothing when there is no' : 'operates when a'} demo being played`, async function () {
                config.demo_playback_helper.playback_voice_player_volume = i;
                mitm.on("connection", function (s) {
                    s.on("data", function (data) {
                        // When the socket receives data, it should just be the demo_info command.
                        expect(data.toString()).eq('demo_info\n');
                        // We respond back with a phrase matching the search RegExp
                        s.write(`${i === 0 ? 'Error - Not currently playing back a demo.' : 'Demo contents for office-8-20-2019.dem:'}\n`);
                        // And then close this socket shortly afterwards
                        s.end();
                    });
                    //Put the info about a player being muted into the console
                    s.write(`DemoHelper set the volume of player The Lovely Potato to 0.\n`);
                });
                //Uncomment this line to get logger output during this test
                // LogHelper.configure(config)
                const playbackHelper = new DemoPlaybackHelper();
                subMan.subscribe(playbackHelper);
                const canHandleSpy = sandbox.spy(playbackHelper, "canHandle");
                const handleLineSpy = sandbox.spy(playbackHelper, "handleLine");
                //We use a stub here instead of a spy because the unmuting action needn't complete since that's not part of the SUT
                const setPlayerVolumeStub = sandbox.stub(VoicePlayerVolume, "setVoicePlayerVolumeByName");
                await subMan.init();
                await subMan.begin();
                expect(canHandleSpy.callCount).eq(1);
                expect(handleLineSpy.callCount).eq(1);
                expect(setPlayerVolumeStub.callCount).eq(i);
            });
        }
    })
});

