import {ImportMock, MockManager} from 'ts-mock-imports';
import * as configModule from "../../src/utils/Config";
import {Config} from "../../src/utils/Config";
import {getLogger, Logger} from "log4js";
import {SubscriberManager} from "../../src/utils/SubscriberManager";
import {SubscriberManagerFactory} from "../../src/utils/SubscriberManagerFactory";
import * as chaiAsPromised from 'chai-as-promised';
import {expect, should, use} from 'chai';
import {createSandbox} from "sinon";
import {ListenerService} from "../../src/ListenerService";
import {LogHelper} from "../../src/utils/LogHelper";
import _ = require("mitm");

use(chaiAsPromised);

describe("SubscriberManager", function () {
    const sandbox = createSandbox();
    let configMock: MockManager<configModule.Config>;
    let mitm = _();
    mitm.disable();
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
        mitm = _();
        configMock.mock('getConfig', config);


    });

    afterEach(function () {
        mitm.disable();
        configMock.restore();
        /*
         * Clear the factory instance. These tests are meant to create a new instance of the Config class
         * as they test parts of the Config constructor.
         */
        SubscriberManagerFactory.clear();
        sandbox.restore();
    });

    describe("init() and begin() tests", function () {
        it("can be initialized with mitm", async function () {
            mitm.on("connection", function (s) {
                s.end();
            });
            await SubscriberManagerFactory.getSubscriberManager().init();
        });

        it("fails to initialize if the console socket has an error", async function () {
            const errMsg = "Socket killed immediately upon connection!";
            should();
            mitm.on("connection", function (s) {
                s.emit("error", Error(errMsg));
                s.destroy();
            });
            const subMan = SubscriberManagerFactory.getSubscriberManager();
            await subMan.init().should.eventually.be.rejectedWith(errMsg);
        });

        it("returns from begin() when socket closes", async function () {
            mitm.on("connection", function (s) {
                s.end();
            });
            const subMan = SubscriberManagerFactory.getSubscriberManager();
            await subMan.init();
            await subMan.begin();
        });

        it("can't send a message when the socket isn't writable", async function () {
            mitm.on("connection", function (s) {
                s.end();
            });
            const subMan = SubscriberManagerFactory.getSubscriberManager();
            await subMan.init();
            await subMan.begin();
            return expect(() => subMan.sendMessage("echo")).to.throw();
        });

        it("can't re-use a dead SubscriberManager", async function () {
            mitm.on("connection", function (s) {
                s.end();
            });
            const subMan = SubscriberManagerFactory.getSubscriberManager();
            await subMan.init();
            await subMan.begin();
            return expect(subMan.begin()).to.eventually.be.rejectedWith('Tried to call begin() when this SubscriberManager was already dead.');
        });

        it("begin() can't be called twice", async function () {
            mitm.on("connection", function (s) {
                setTimeout(() => {
                    s.end();
                }, 500);
            });
            const subMan = SubscriberManagerFactory.getSubscriberManager();
            await subMan.init();
            // Please turn a blind eye to this hackiness. It's merely to simulate the incorrect usage of the begin method
            // noinspection ES6MissingAwait
            subMan.begin();
            return expect(subMan.begin()).to.be.rejectedWith('Tried to call begin() again on an already active instance of SubscriberManager.');
        });

        it("properly updates isInitialized()", async function () {
            should();
            const subMan = SubscriberManagerFactory.getSubscriberManager();
            subMan.isInitialized().should.eq(false);
            mitm.on("connection", function (s) {
                s.end();
            });
            await subMan.init();
            subMan.isInitialized().should.eq(true);
            await subMan.begin();
        });
    });

    describe("In-depth tests", function () {
        it("test cvar can be retrieved", async function () {
            //Uncomment this line to get logger output during this test
            // LogHelper.configure(config)
            mitm.on("connection", function (s) {
                // noinspection JSUnusedLocalSymbols
                s.on("data", function (data) {
                    //This is where the request from the client for the value of dummy_cvar occurs
                    s.write('"dummy_cvar" = "2"\n');
                    s.end();
                });
            });
            const subMan = SubscriberManagerFactory.getSubscriberManager();
            await subMan.init();
            const cvarRequest: Promise<number> = subMan.requestCvarValue("dummy_cvar");
            const subManPromise = subMan.begin().then();
            await expect(cvarRequest).to.be.eventually.eq(2);
            await subManPromise;
        });

        it("times out when console_output_promise_wait_time is exceeded", async function () {
            // Set the timeout to be just long enough for the promise from requestCvarValue to timeout + a little extra.
            // This test will run longer than the timeout but for whatever reason, it's
            // super lenient so I'm only adding a small value because that's all that's necessary.
            this.timeout((config.internals.console_output_promise_wait_time * 1000) + 100);
            //Uncomment this line to get logger output during this test
            // LogHelper.configure(config)
            mitm.on("connection", function (s) {
                // noinspection JSUnusedLocalSymbols
                s.on("data", function (data) {
                    /*
                     * This is where the request from the client for the value of dummy_cvar occurs. Instead of
                     * providing a response, we wait for the time that SubscriberManager takes to time out (while
                     * it waits to hear back about the cvar value) and then close the connection.
                     */
                    // After we're reasonably sure that the promise for the cvar value has been rejected, shut down SubscriberManager
                    setTimeout(() => s.end(), config.internals.console_output_promise_wait_time + 2000);
                });
            });
            const subMan = SubscriberManagerFactory.getSubscriberManager();
            await subMan.init();
            const cvarRequest: Promise<number> = subMan.requestCvarValue("dummy_cvar");

            /*
             * SubscriberManager.begin() has to be called like this and cannot be called with an await or else you'll
             * get PromiseRejectionHandledWarning: Promise rejection was handled asynchronously.
             * This could have something to do with https://github.com/domenic/chai-as-promised/issues/173 but seeing as
             * I can actually work around causing this warning, I'll keep doing this the weird-looking way.
             */
            const sPromise = subMan.begin().then();
            await expect(cvarRequest).to.be.eventually.rejectedWith(RegExp(`^Request for Cvar \'dummy_cvar\' timed out in 2000ms.$`));
            /*
             * Wait for SubscriberManager to shut down. This has to be below the 'await expect()' stuff or else you'll
             * get PromiseRejectionHandledWarning: Promise rejection was handled asynchronously.
             */
            await sPromise;
        });

        describe("Logging and crashing related", function () {
            let subManLogger: Logger = getLogger('Fake Logger For SubscriberManager');
            let subscribersLogger: Logger = getLogger('Fake Logger For SubscriberManager.subscribers');
            let getLoggerStub;

            beforeEach(function () {
                getLoggerStub = sandbox.stub(LogHelper, "getLogger");
                getLoggerStub.withArgs("SubscriberManager").returns(subManLogger);
                getLoggerStub.withArgs("SubscriberManager.subscribers").returns(subscribersLogger);
            });

            // Yeah I'm doing another loop again. It's kinda ugly but it's better than how much code would need to be repeated
            for (let i = 0; i < 2; i++) {
                it(`SubscriberManager doesn't quit when a handler ${i === 0 ? "throws an error" : "returns a rejected promise"}`, async function () {
                    //Uncomment this line to get logger output during this test
                    // LogHelper.configure(config)

                    mitm.on("connection", function (s) {
                        s.write('"dummy_cvar" = "2"\n');
                        s.end();
                    });
                    const subMan = SubscriberManagerFactory.getSubscriberManager();
                    // Subscribe a dummy listener that thinks it can handle anything but throws an error every time it tries
                    subMan.subscribe(new class implements ListenerService {
                        name(): string {
                            return "Dummy Listener Service";
                        }

                        canHandle(consoleLine: string): boolean {
                            // We want the dummy listener to always pipe up and volunteer when there's new input
                            return true;
                        }

                        handleLine(consoleLine: string): Promise<void> {
                            if (i === 1) {
                                throw Error('nice hustle, tons of fun');
                            } else {
                                return new Promise((resolve, reject) => reject(
                                    Error("This error is intentional as the promise is meant to be rejected in the" +
                                        " test and handled gracefully by SubscriberManager.")));
                            }
                        }
                    });
                    const logErrorStub = sandbox.spy(subscribersLogger, "error");
                    await subMan.init();
                    // The await here is important because logErrorStub.callCount will only be updated for sure after begin() has exited
                    expect(logErrorStub.callCount).eq(0);
                    await expect(subMan.begin()).to.eventually.not.be.rejected;
                    expect(logErrorStub.callCount).eq(i === 0 ? 2 : 3);
                });
            }

            it("a message is logged when there's no suitable subscriber to answer for a console line", async function () {
                //Uncomment this line to get logger output during this test
                // LogHelper.configure(config)

                mitm.on("connection", function (s) {
                    s.write('"dummy_cvar" = "2"\n');
                    s.end();
                });
                const subMan = SubscriberManagerFactory.getSubscriberManager();
                // Subscribe a dummy listener service so that there is at least one subscribed listener
                subMan.subscribe(new class implements ListenerService {
                    name(): string {
                        return "Dummy Listener Service";
                    }

                    canHandle(consoleLine: string): boolean {
                        return false;
                    }

                    handleLine(consoleLine: string): Promise<void> {
                        // Handle line should never be called in this particular test as canHandle() is always false
                        return new Promise((resolve, reject) => reject());
                    }
                });

                const logTraceStub = sandbox.spy(subManLogger, "trace");
                expect(logTraceStub.callCount).eq(0);
                await subMan.init();
                await subMan.begin();
                expect(logTraceStub.callCount).eq(1);
            });
        });

        it("can successfully unsubscribe a listener", async function () {
            //Uncomment this line to get logger output during this test
            // LogHelper.configure(config)

            /*
             * This listener will always stay subscribed while the other listener will be removed.
             * The reason this permanent one is kept around is to query how many times its canHandle() method was called
             * to ensure that the temporary listener wasn't removed before the second console line was sent
             * to SubscriberManager for processing.
             */
            const permanentListener = new class implements ListenerService {
                name(): string {
                    return "Permanent Listener Service";
                }

                canHandle(consoleLine: string): boolean {
                    return false;
                }

                handleLine(consoleLine: string): Promise<void> {
                    return new Promise<void>(resolve => resolve());
                }
            };

            const temporaryListener = new class implements ListenerService {
                name(): string {
                    return "Temporary Listener Service";
                }

                canHandle(consoleLine: string): boolean {
                    return true;
                }

                async handleLine(consoleLine: string): Promise<void> {

                    await SubscriberManagerFactory.getSubscriberManager().sendMessage('Time to unsubscribe me!');
                }
            };

            const permanentCanHandle = sandbox.spy(permanentListener, "canHandle");
            const temporaryCanHandle = sandbox.spy(temporaryListener, "canHandle");
            /*
             * Below are the steps involved in testing that a listener is no longer subscribed.
             * 0. Ensure that canHandle hasn't been magically called on either listener before we've even done anything
             * 1. Subscribe both permanent and temporary listeners
             * 2. Send a console line to SubscriberManager
             * 3. Assert that canHandle has now been called once on both listeners (only the temporary one returns true and because it is added as the second subscriber, the permanent listener will always be asked first)
             * 4. Remove the temporary listener
             * 5. Send another console line
             * 6. Ensure that the temporary listener was truly removed by asserting that its canHandle method is still at just 1 call while the permanent listener is now at 2 calls.
             */
            const subMan = SubscriberManagerFactory.getSubscriberManager();
            // Step 1 (adding the permanent first instead of the temporary is important because the temp will accept requests
            subMan.subscribe(permanentListener);
            subMan.subscribe(temporaryListener);

            mitm.on("connection", function (s) {
                // Step 2
                s.write('"dummy_cvar" = "2"\n');
                /*
                 * This is a hacky way of making mitm wait before unsubscribing the temporary listener. We won't know
                 * whether canHandle has been called on both the listeners. A way around this is to allow the temporary
                 * listener's canHandle method to return true and have the handleLine method send data through the socket.
                 * It is upon receiving this data that we know for sure that both the permanent and temporary listeners
                 * have been polled ONCE so far about whether they can respond to the provided line.
                 */
                s.on("data", function () {
                    // Step 3
                    expect(permanentCanHandle.callCount).eq(1);
                    expect(temporaryCanHandle.callCount).eq(1);
                    // Step 4
                    subMan.unsubscribe(temporaryListener);
                    // Step 5
                    s.write('"yet_another_dummy_cvar" = "100"\n');
                    s.end();
                });
            });

            await subMan.init();
            // Step 0
            expect(permanentCanHandle.callCount).eq(0);
            expect(temporaryCanHandle.callCount).eq(0);
            await subMan.begin();
            // Step 6
            expect(permanentCanHandle.callCount).eq(2);
            expect(temporaryCanHandle.callCount).eq(1);
        });
    });
});