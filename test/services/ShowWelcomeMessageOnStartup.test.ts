import {ImportMock, MockManager} from 'ts-mock-imports';
import * as configModule from '../../src/utils/Config';
import {Config} from '../../src/utils/Config';
import {expect} from 'chai';
import {ShowHelpMessageWhenAsked} from "../../src/services/ShowHelpMessageWhenAsked";
import {ConsoleHelper} from "../../src/utils/ConsoleHelper";
import {SubscriberManagerFactory} from "../../src/utils/SubscriberManagerFactory";
import {ShowWelcomeMessageOnStartup} from "../../src/services/ShowWelcomeMessageOnStartup";
import _ = require("mitm");

describe("ShowHelpMessageWhenAsked", function () {
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
            log_level: 'info',
            console_output_promise_wait_time: 2,
            console_user_input_wait_time: 30,
        }
    };

    beforeEach(function () {
        configMock = ImportMock.mockClass(configModule, 'Config');
        mitm = _();
    });

    afterEach(function () {
        configMock.restore();
        mitm.disable();
    });

    it("should print the welcome message when it detects startup", async function () {
        //Uncomment this line to get logger output during this test
        // LogHelper.configure(config)
        configMock.mock('getConfig', config);
        let messageLineIndex = 0;
        let clearCommandSent = false;
        mitm.on("connection", function (s) {
            s.on("data", function (data) {
                if (clearCommandSent) {
                    expect(data.toString()).eq(ConsoleHelper.WelcomeMessage.map(value => "echo \"" + value + "\"\n")[messageLineIndex]);
                    messageLineIndex++;
                    if (messageLineIndex === ConsoleHelper.WelcomeMessage.length - 1) {
                        s.end();
                    }
                } else {
                    expect(data.toString()).eq('clear\n');
                    clearCommandSent = true;
                }
            });
            s.write(ShowWelcomeMessageOnStartup.CsgoStartupFinishedString + "\n");
        })
        const subMan = SubscriberManagerFactory.getSubscriberManager();
        subMan.subscribe(new ShowWelcomeMessageOnStartup());
        await subMan.init();
        await subMan.begin();
    });
});