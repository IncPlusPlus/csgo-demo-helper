import {Config} from "./utils/Config";
import {SubscriberManager} from './utils/SubscriberManager';
import {ConsoleHelper} from "./utils/ConsoleHelper";
import {Cvars} from "./utils/Cvars";
import {existsSync} from 'fs';
import {ShowWelcomeMessageOnStartup} from "./services/ShowWelcomeMessageOnStartup";
import {DemoRecordingHelper} from "./services/DemoRecordingHelper";

const config = Config.getConfig();

(async () => {
    if (!existsSync(config.csgo.csgo_demos_folder + '/../csgo.exe')) {
        console.log(`WARNING: Couldn't find CS:GO's executable at the path '${config.csgo.csgo_demos_folder + '/../csgo.exe'}'.`)
    }
    SubscriberManager.subscribe(new ShowWelcomeMessageOnStartup());
    SubscriberManager.subscribe(new DemoRecordingHelper());
    await SubscriberManager.init()
    SubscriberManager.begin().then();
    let gameModeVar = await SubscriberManager.requestCvarValue('fps_screenshot_frequency');
    console.log(`fps_screenshot_frequency is ${gameModeVar}`);
})();
