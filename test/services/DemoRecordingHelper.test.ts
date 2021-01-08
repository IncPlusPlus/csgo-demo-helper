import {ImportMock, MockManager} from 'ts-mock-imports';
import * as configModule from '../../src/utils/Config';
import {Config} from '../../src/utils/Config';
import * as steamIDModule from '../../src/utils/SteamID';
import {expect} from 'chai';
import {SubscriberManagerFactory} from "../../src/utils/SubscriberManagerFactory";
import {createSandbox} from 'sinon';
import {SubscriberManager} from '../../src/utils/SubscriberManager';
import {DemoRecordingHelper} from "../../src/services/DemoRecordingHelper";
import {VoicePlayerVolume} from "../../src/utils/VoicePlayerVolume";
import {DemoNamingHelper} from "../../src/utils/DemoNamingHelper";
import * as mock from "mock-fs";
import {join} from 'path';
import {Pair} from "../../src/utils/Pair";
import {Cvars} from "../../src/utils/Cvars";
import {ConsoleHelper} from "../../src/utils/ConsoleHelper";
import _ = require("mitm");

describe("DemoRecordingHelper", function () {
    const sandbox = createSandbox();
    let subMan: SubscriberManager;
    let mitm = _();
    mitm.disable();
    let configMock: MockManager<configModule.Config>;
    let steamIDMock: MockManager<steamIDModule.SteamID>;
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
    const expectedCommandsWhenRecordingStartsSuccessfully = ['echo DemoHelper started recording demo successfully!\n', 'echo DemoHelper applied recording preferences and recorded a message in demo successfully!\n', 'echo DemoHelper set the volume of player The Lovely Potato to 0.\n'];
    const statusLineValveMatchmakingServer = (mapName: string) => {
        return `Connected to =[A:1:1075843077:16207]:0
hostname: Valve CS:GO US East Server (srcds084.121.5)
version : 1.37.7.5 secure
os      :  Linux
type    :  official dedicated
map     : ${mapName}
players : 3 humans, 9 bots (16/0 max) (not hibernating)

# userid name uniqueid connected ping loss state rate
# 37 2 "TrailOfTears" STEAM_1:1:498153454 29:09 46 0 active 196608
#54 "John" BOT active 64
#55 "Wade" BOT active 64
#56 "Erik" BOT active 64
#57 "Joe" BOT active 64
#58 "Quinn" BOT active 64
#59 "Seth" BOT active 64
#60 "Brad" BOT active 64
#61 "Cory" BOT active 64
#62 "Derek" BOT active 64
# 63 12 "Cop Her DMS" STEAM_1:0:185787149 02:52 47 0 active 196608
# 64 13 "The Lovely Potato" STEAM_1:0:96251044 00:40 55 0 active 786432
#end`;
    };
    const statusLineListenServer = (mapName: string) => {
        return `hostname: The Lovely Potato
version : 1.37.7.5/13775 1216/8012 secure  [A:1:2298375179:16207]
udp/ip  : 172.30.160.1:27015
os      :  Windows
type    :  listen
map     : ${mapName} at: -1087 x, -1851 y, -271 z
connected to loopback
players : 1 humans, 9 bots (10/0 max) (not hibernating)

netcon  :  172.30.160.1:2121
# userid name uniqueid connected ping loss state rate adr
#  2 1 "The Lovely Potato" STEAM_1:0:96251044 00:22 15 0 active 786432 loopback
# 3 "Fergus" BOT active 64
# 4 "Waldo" BOT active 64
# 5 "Bert" BOT active 64
# 6 "Allen" BOT active 64
# 7 "Ulric" BOT active 64
# 8 "Elliot" BOT active 64
# 9 "Ernie" BOT active 64
#10 "Uri" BOT active 64
#11 "Neil" BOT active 64
#end`;
    };


    beforeEach(function () {
        configMock = ImportMock.mockClass(configModule, 'Config');
        configMock.mock('getConfig', config);
        steamIDMock = ImportMock.mockClass(steamIDModule, 'SteamID');
        steamIDMock.mock('getPlayerProfileName', 'The Lovely Potato');
        sandbox.stub(DemoNamingHelper, "makeTimestamp").returns("1-1-2021");
        mitm = _();
        subMan = SubscriberManagerFactory.getSubscriberManager();
    });

    afterEach(function () {
        configMock.restore();
        steamIDMock.restore();
        mitm.disable();
        SubscriberManagerFactory.clear();
        sandbox.restore();
    });

    describe("Recording scenarios", function () {

        // This suite is for the if/else block in attemptStartRecording
        describe("Handling the different outcomes of the record command", function () {
            it(`All defaults. New demo and no others exist at the moment. Demo recording begins successfully`, async function () {
                //Uncomment this line to get logger output during this test
                // LogHelper.configure(config);

                const expectedRecordCommand = 'record casual-office-1-1-2021\n';
                let recording = false;
                let postRecordingIndex = 0;
                mitm.on("connection", function (s) {
                    s.on("data", function (data) {
                        if (!recording) {
                            expect(data.toString()).eq(expectedRecordCommand);
                            expect(DemoRecordingHelper.synchronouslyCheckIfRecording()).eq(false);
                            if (data.toString() === expectedRecordCommand) {
                                s.write('Recording to casual-office-1-1-2021.dem...\n');
                                recording = true;
                            }
                        } else {
                            expect(DemoRecordingHelper.synchronouslyCheckIfRecording()).eq(true);
                            expect(data.toString()).eq(expectedCommandsWhenRecordingStartsSuccessfully[postRecordingIndex]);
                            postRecordingIndex++;
                            if (postRecordingIndex >= expectedCommandsWhenRecordingStartsSuccessfully.length) {
                                s.write('Completed demo, recording time 45.7, game frames 1807.\n');
                                s.end();
                            }
                        }
                    });
                    s.write(`${DemoRecordingHelper.BeginRecordingCommand}\n`);
                });
                const setCvarStub = sandbox.stub(Cvars, "setCvar");
                const getCvarStub = sandbox.stub(Cvars, "getCvar");
                const getMapNameStub = sandbox.stub(DemoNamingHelper, "getMapName");
                sandbox.stub(ConsoleHelper, "padConsole");
                getCvarStub.withArgs('game_mode').returns(new Promise(resolve => resolve(0)));
                getCvarStub.withArgs('game_type').returns(new Promise(resolve => resolve(0)));
                getMapNameStub.returns(new Promise(resolve => resolve('office')));
                const recordingHelper = new DemoRecordingHelper();
                subMan.subscribe(recordingHelper);
                const canHandleSpy = sandbox.spy(recordingHelper, "canHandle");
                const handleLineSpy = sandbox.spy(recordingHelper, "handleLine");
                const setPlayerVolumeStub = sandbox.stub(VoicePlayerVolume, "setVoicePlayerVolumeByName");
                expect(DemoRecordingHelper.synchronouslyCheckIfRecording()).eq(false);
                await subMan.init();
                await subMan.begin();
                expect(canHandleSpy.callCount).eq(2);
                expect(handleLineSpy.callCount).eq(2);
                expect(setPlayerVolumeStub.callCount).eq(1);
                expect(getCvarStub.calledWith('game_mode')).to.eq(true);
                expect(getCvarStub.calledWith('game_type')).to.eq(true);
                expect(setCvarStub.callCount).eq(1);
                expect(DemoRecordingHelper.synchronouslyCheckIfRecording()).eq(false);
            });
        });

        describe("Handling naming conflicts + user decisions", function () {
            it(`All defaults. New 'office-1-8-2021-2-pt3' exists already`, async function () {
            });
        });
    });

    describe("Single function tests", function () {
        const sampleDemoName = "office-1-8-2021";
        describe("findLatestDemoWithName", function () {
            let recordingHelper: DemoRecordingHelper;
            beforeEach(function () {
                recordingHelper = new DemoRecordingHelper();
            });
            afterEach(function () {
                mock.restore();
            });
            it("can tell when there are no demos", function () {
                mock({
                    get [join(config.csgo.csgo_demos_folder)]() {
                        return {};
                    }
                });
                const result: Pair<number, number> = new DemoRecordingHelper().findLatestDemoWithName(sampleDemoName);
                const highestDemoNumber = result[0];
                const highestPartNumber = result[1];
                expect(highestDemoNumber).to.eq(0);
                expect(highestPartNumber).to.eq(0);
            });

            it("can tell that one demo exists", function () {
                mock({
                    get [join(config.csgo.csgo_demos_folder, sampleDemoName + '.dem')]() {
                        return Buffer.from([8, 6, 7, 5, 3, 0, 9]);
                    }
                });
                const result: Pair<number, number> = new DemoRecordingHelper().findLatestDemoWithName(sampleDemoName);
                const highestDemoNumber = result[0];
                const highestPartNumber = result[1];
                expect(highestDemoNumber).to.eq(1);
                expect(highestPartNumber).to.eq(1);
            });

            it("can tell that the latest demo exists and has two parts", function () {
                mock({
                    get [join(config.csgo.csgo_demos_folder, `${sampleDemoName}.dem`)]() {
                        return Buffer.from([8, 6, 7, 5, 3, 0, 9]);
                    },
                    get [join(config.csgo.csgo_demos_folder, `${sampleDemoName}-pt2.dem`)]() {
                        return Buffer.from([8, 6, 7, 5, 3, 0, 9]);
                    }
                });
                const result: Pair<number, number> = new DemoRecordingHelper().findLatestDemoWithName(sampleDemoName);
                const highestDemoNumber = result[0];
                const highestPartNumber = result[1];
                expect(highestDemoNumber).to.eq(1);
                expect(highestPartNumber).to.eq(2);
            });

            it("can tell that the latest demo exists and is a sequel", function () {
                mock({
                    get [join(config.csgo.csgo_demos_folder, sampleDemoName + '.dem')]() {
                        return Buffer.from([8, 6, 7, 5, 3, 0, 9]);
                    },
                    get [join(config.csgo.csgo_demos_folder, sampleDemoName + '-2.dem')]() {
                        return Buffer.from([8, 6, 7, 5, 3, 0, 9]);
                    }
                });
                const result: Pair<number, number> = new DemoRecordingHelper().findLatestDemoWithName(sampleDemoName);
                const highestDemoNumber = result[0];
                const highestPartNumber = result[1];
                expect(highestDemoNumber).to.eq(2);
                expect(highestPartNumber).to.eq(1);
            });

            it("can tell that the latest demo exists and is a sequel with three parts", function () {
                mock({
                    get [join(config.csgo.csgo_demos_folder, sampleDemoName + '.dem')]() {
                        return Buffer.from([8, 6, 7, 5, 3, 0, 9]);
                    },
                    get [join(config.csgo.csgo_demos_folder, sampleDemoName + '-2.dem')]() {
                        return Buffer.from([8, 6, 7, 5, 3, 0, 9]);
                    },
                    get [join(config.csgo.csgo_demos_folder, sampleDemoName + '-2-pt2.dem')]() {
                        return Buffer.from([8, 6, 7, 5, 3, 0, 9]);
                    },
                    get [join(config.csgo.csgo_demos_folder, sampleDemoName + '-2-pt3.dem')]() {
                        return Buffer.from([8, 6, 7, 5, 3, 0, 9]);
                    }
                });
                const result: Pair<number, number> = new DemoRecordingHelper().findLatestDemoWithName(sampleDemoName);
                const highestDemoNumber = result[0];
                const highestPartNumber = result[1];
                expect(highestDemoNumber).to.eq(2);
                expect(highestPartNumber).to.eq(3);
            });
        });

        describe("mostRecentDemoInfoToString", function () {
            it("should produce the correct name for a demo that doesn't exist yet (i.e. no naming conflict)", function () {
                expect(DemoRecordingHelper.mostRecentDemoInfoToString(sampleDemoName, [0, 0])).to.eq(sampleDemoName);
            });
            it("should produce the correct name for a demo that exists currently and has no extra parts", function () {
                expect(DemoRecordingHelper.mostRecentDemoInfoToString(sampleDemoName, [1, 1])).to.eq(sampleDemoName);
            });
            it("should produce the correct name for a demo that exists in two parts", function () {
                expect(DemoRecordingHelper.mostRecentDemoInfoToString(sampleDemoName, [1, 2])).to.eq(sampleDemoName + '-pt2');
            });
            it("should produce the correct name for a sequel demo", function () {
                expect(DemoRecordingHelper.mostRecentDemoInfoToString(sampleDemoName, [2, 1])).to.eq(sampleDemoName + '-2');
            });
            it("should produce the correct name for a sequel demo with three parts", function () {
                expect(DemoRecordingHelper.mostRecentDemoInfoToString(sampleDemoName, [2, 3])).to.eq(sampleDemoName + '-2-pt3');
            });
        });
    });
});
