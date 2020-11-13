import {Config} from "./utils/Config";
import {SubscriberManager} from './utils/SubscriberManager';
import {existsSync} from 'fs';
import {ShowWelcomeMessageOnStartup} from "./services/ShowWelcomeMessageOnStartup";
import {DemoRecordingHelper} from "./services/DemoRecordingHelper";
import {DemoPlaybackHelper} from "./services/DemoPlaybackHelper";
import {Logger} from "./utils/Logger";

(async () => {
    if (!existsSync(Config.getConfig().csgo.csgo_demos_folder + '/../csgo.exe')) {
        Logger.warn(`Couldn't find CS:GO's executable at the path '${Config.getConfig().csgo.csgo_demos_folder + '/../csgo.exe'}'.`)
    }
    SubscriberManager.subscribe(new ShowWelcomeMessageOnStartup());
    SubscriberManager.subscribe(new DemoRecordingHelper());
    SubscriberManager.subscribe(new DemoPlaybackHelper());
    await SubscriberManager.init()
    SubscriberManager.begin().then();
})();
