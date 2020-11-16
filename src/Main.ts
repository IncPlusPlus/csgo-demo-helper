import {Config} from "./utils/Config";
import {SubscriberManager} from './utils/SubscriberManager';
import {existsSync} from 'fs';
import {ShowWelcomeMessageOnStartup} from "./services/ShowWelcomeMessageOnStartup";
import {DemoRecordingHelper} from "./services/DemoRecordingHelper";
import {DemoPlaybackHelper} from "./services/DemoPlaybackHelper";
import {LogHelper} from "./utils/LogHelper";

const log = LogHelper.getLogger('Main');

(async () => {
    LogHelper.configure();
    if (!existsSync(Config.getConfig().csgo.csgo_demos_folder + '/../csgo.exe')) {
        log.fatal(`Couldn't find CS:GO's executable at the path '${Config.getConfig().csgo.csgo_demos_folder + '/../csgo.exe'}'.\n
        This means that DemoRecordingHelper will be unable to locate the demos folder to check for name conflicts.`);
        throw Error('csgo_demos_folder in config.ini is misconfigured.');
    }
    SubscriberManager.subscribe(new ShowWelcomeMessageOnStartup());
    SubscriberManager.subscribe(new DemoRecordingHelper());
    SubscriberManager.subscribe(new DemoPlaybackHelper());
    await SubscriberManager.init()
    SubscriberManager.begin().then();
})().catch(reason => {
    log.fatal(reason);
    log.fatal('Exited due to a fatal error. Please see above for details.');
});
