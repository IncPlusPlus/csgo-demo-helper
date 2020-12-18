#!/usr/bin/env node
import {Config} from "./utils/Config";
import {SubscriberManager} from './utils/SubscriberManager';
import {ShowWelcomeMessageOnStartup} from "./services/ShowWelcomeMessageOnStartup";
import {DemoRecordingHelper} from "./services/DemoRecordingHelper";
import {DemoPlaybackHelper} from "./services/DemoPlaybackHelper";
import {LogHelper} from "./utils/LogHelper";
import {ShowHelpMessageWhenAsked} from "./services/ShowHelpMessageWhenAsked";
import {join} from "path";

const log = LogHelper.getLogger('Main');

(async () => {
    LogHelper.configure();
    if (!Config.csgoExeExists()) {
        log.fatal(`Couldn't find CS:GO's executable at the path '${join(Config.getConfig().csgo.csgo_demos_folder, "..", "csgo.exe")}'.`);
        log.fatal(`This means that DemoRecordingHelper will be unable to locate the demos folder to check for name conflicts.`);
        throw Error('csgo_demos_folder in config.ini is misconfigured.');
    }
    SubscriberManager.subscribe(new ShowWelcomeMessageOnStartup());
    SubscriberManager.subscribe(new ShowHelpMessageWhenAsked());
    SubscriberManager.subscribe(new DemoRecordingHelper());
    SubscriberManager.subscribe(new DemoPlaybackHelper());
    await SubscriberManager.init()
    SubscriberManager.begin().then();
})().catch(reason => {
    log.fatal(reason);
    log.fatal('Exited due to a fatal error. Please see above for details.');
});
