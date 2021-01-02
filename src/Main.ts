#!/usr/bin/env node
import {ShowWelcomeMessageOnStartup} from "./services/ShowWelcomeMessageOnStartup";
import {DemoRecordingHelper} from "./services/DemoRecordingHelper";
import {DemoPlaybackHelper} from "./services/DemoPlaybackHelper";
import {LogHelper} from "./utils/LogHelper";
import {ShowHelpMessageWhenAsked} from "./services/ShowHelpMessageWhenAsked";
import {join} from "path";
import {SubscriberManagerFactory} from "./utils/SubscriberManagerFactory";
import {ConfigFactory} from "./utils/ConfigFactory";

const log = LogHelper.getLogger('Main');

const waitForUserInputThenExit = () => {
    // https://stackoverflow.com/a/19692588/1687436
    console.log('Press any key to exit');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', process.exit.bind(process, 0));
}

(async () => {
    try {
        LogHelper.configure(ConfigFactory.getConfigInstance().getConfig());
    } catch (e) {
        console.log(e);
        console.log('Exited due to a fatal error. Please see above for details.');
        waitForUserInputThenExit();
    }
    const subscriberManager = SubscriberManagerFactory.getSubscriberManager();
    if (!ConfigFactory.getConfigInstance().csgoExeExists()) {
        log.fatal(`Couldn't find CS:GO's executable at the path '${join(ConfigFactory.getConfigInstance().getConfig().csgo.csgo_demos_folder, "..", "csgo.exe")}'.`);
        log.fatal(`This means that DemoRecordingHelper will be unable to locate the demos folder to check for name conflicts.`);
        throw Error('csgo_demos_folder in config.ini is misconfigured.');
    }
    subscriberManager.subscribe(new ShowWelcomeMessageOnStartup());
    subscriberManager.subscribe(new ShowHelpMessageWhenAsked());
    subscriberManager.subscribe(new DemoRecordingHelper());
    subscriberManager.subscribe(new DemoPlaybackHelper());
    await subscriberManager.init()
    subscriberManager.begin().then();
})().catch(reason => {
    log.fatal(reason);
    log.fatal('Exited due to a fatal error. Please see above for details.');
    waitForUserInputThenExit();
});
