import {expect} from 'chai';
import * as mock from 'mock-fs';
import {join} from "path";
import {stringify} from "ini";
import {existsSync, readFileSync} from "fs";
import {Config} from "../../src/utils/Config";
import {ConfigFactory} from "../../src/utils/ConfigFactory";
import {type} from "os";

describe("Config", function () {
    let csgo_demos_folder = '';
    let csgo_executable_name = '';
    switch (type()) {
        case 'Windows_NT':
            csgo_demos_folder = 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Counter-Strike Global Offensive\\csgo';
            csgo_executable_name = 'csgo.exe';
            break;
        case 'Linux':
            csgo_demos_folder = '/home/ryan/.steam/steam/steamapps/common/Counter-Strike Global Offensive/csgo';
            csgo_executable_name = 'csgo_linux64';
            break
        case 'Darwin':
            csgo_demos_folder = '/Users/ryan/Library/Application Support/Steam/SteamApps/common/Counter-Strike Global Offensive/csgo';
            csgo_executable_name = 'csgo_osx64';
            break;
        default:
            throw Error(`UNSUPPORTED OS TYPE ${type()}`);
    }
    const config_directory: string = join(__dirname, "..", "..");
    let config: { [p: string]: any } = {
        steam: {
            steam_web_api_key: 'XXXXXXXXXXXXXXXXXXXXXXX',
            steamID64: '76561197960435530',
        }, csgo: {
            netcon_port: 2121,
            csgo_demos_folder: csgo_demos_folder,
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
    }

    beforeEach(function () {
        mock({
            get [join(config_directory, "config.ini")]() {
                return stringify(config);
            },
            get [join(config_directory, "config.template.ini")]() {
                return stringify(config);
            },
            get [join(csgo_demos_folder, "..", csgo_executable_name)]() {
                //csgo.exe just needs to exist. We don't read the content so it's fine to just have placeholder content
                return Buffer.from([8, 6, 7, 5, 3, 0, 9]);
            },
        });
    })

    afterEach(function () {
        mock.restore();
        /*
         * Clear the factory instance. These tests are meant to create a new instance of the Config class
         * as they test parts of the Config constructor.
         */
        ConfigFactory.clear();
    });

    it("should find config.ini", function () {
        //From the docs at https://www.chaijs.com/api/bdd/#throwerrorlike-errmsgmatcher-msg
        //"... when testing if a function named fn throws, provide fn instead of fn() as the target for the assertion."
        expect(ConfigFactory.getConfigInstance).to.not.throw();
        //double-check that a value got loaded
        expect(ConfigFactory.getConfigInstance().getConfig().steam.steamID64).eq(config.steam.steamID64);
        //TODO: Perform a deep comparison to determine that the config file and config object above are exactly equal
    });

    it("should fail to find config.ini if missing and create new a one from the template", function () {
        mock({
            get [join(config_directory)]() {
                //Create an empty directory
                return {};
            },
            //And then add only the template
            get [join(config_directory, "config.template.ini")]() {
                return stringify(config);
            }
        });
        //config.ini shouldn't exist yet
        expect(existsSync(join(config_directory, "config.ini"))).eq(false);
        expect(() => ConfigFactory.getConfigInstance(true)).to.throw();
        //config.ini should have just been created
        expect(existsSync(join(config_directory, "config.ini"))).eq(true);
        //the newly created config.ini should have the exact same content as config.template.ini
        expect(
            readFileSync(join(config_directory, "config.ini"))
                .equals(readFileSync(join(config_directory, "config.template.ini")))
        ).eq(true)
    });

    it("should be undefined on invalid key access", function () {
        expect(ConfigFactory.getConfigInstance).to.not.throw();
        expect(ConfigFactory.getConfigInstance().getConfig().steam.dummy_key).to.eq(undefined);
    });

    it("should find csgo.exe when present", function () {
        expect(ConfigFactory.getConfigInstance().csgoExeExists()).eq(true);
    });

    it("should not find csgo.exe when absent", function () {
        mock({
            get [join(config_directory, "config.ini")]() {
                return stringify(config);
            },
            get [join(config_directory, "config.template.ini")]() {
                return stringify(config);
            },
            //create the directory that should contain csgo.exe as an empty directory. The exe shouldn't be found
            get [join(csgo_demos_folder, "..")]() {
                return {};
            },
        });
        expect(ConfigFactory.getConfigInstance().csgoExeExists()).eq(false);
    });
});