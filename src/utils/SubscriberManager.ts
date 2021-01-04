/*
 * While building these utilities I quickly realized that having tons of different functions vying for control
 * of the socket simply wasn't viable. I needed a stupid-simple way for a single authority to hold the socket connection
 * and manage it responsibly, passing text output to whoever needed it.
 */

import {createInterface, ReadLine} from 'readline';
import {connect, Socket} from 'net';
import {v4} from 'uuid';
import {LogHelper} from "./LogHelper";
import {TimeoutPromise} from "./TimeoutPromise";
import {ListenerService} from "../ListenerService";
import {Pair} from './Pair';
import {ConfigFactory} from "./ConfigFactory";
import {WaitOnOptions} from "wait-on";
import pDefer = require('p-defer');

const waitOn = require("wait-on");

export class SubscriberManager {
    /*
     * Console output for checking the cvar game_mode looks like the following
     * "game_mode" = "0" game client replicated                                         - The current game mode (based on game type). See GameModes.txt.
     */
    private readonly cvarEchoRegExp: RegExp = RegExp('^\"([a-zA-Z_]+)\" = \"(\\d+)\".*');
    private readonly config: { [p: string]: any } = ConfigFactory.getConfigInstance().getConfig();
    private readonly port: number = this.config.csgo.netcon_port;
    private readonly log = LogHelper.getLogger('SubscriberManager');
    private readonly subscriberLog = LogHelper.getLogger('SubscriberManager.subscribers');
    private readonly cvarSubscribersLog = LogHelper.getLogger('SubscriberManager.cvarSubscribers');
    private readonly valueListenersLog = LogHelper.getLogger('SubscriberManager.valueListeners');

    private initialized = false;
    private alive: boolean | undefined = undefined;

    private readonly waitOnOpts: WaitOnOptions = {
        resources: [
            `tcp:${this.port}`,
        ],
        interval: 100, // poll interval in ms, default 250ms
        timeout: 90000, // timeout in ms, default Infinity
        // tcpTimeout: 1000, // tcp timeout in ms, default 300ms
        window: 500, // stabilization time in ms, default 750ms
    };

    private socket: Socket | undefined;
    private reader: ReadLine | undefined;
    /** These subscribers are expecting one or more lines of text, unprompted. They're here to stay for the most part. */
    private subscribers: ListenerService[] = [];
    /** These subscribers are expecting a single line of output as soon as possible (like a cvar value) */
    private subscribedCvarValues: Pair<string, pDefer.DeferredPromise<number>>[] = [];
    /**
     * These subscribers act much like the cvar subscribers and are removed once dealt with. A regular expression is
     * used to determine if the given console output is meant for the temporary subscriber. If there's a match,
     * the subscriber is removed and the promise is fulfilled with the line output that matched the RegEx.
     */
    private specialOutputGrabbers: Pair<RegExp, pDefer.DeferredPromise<string>>[] = [];

    public init = async (): Promise<void> => {
        this.log.info('Starting up...');
        this.log.debug(`Waiting to connect to CS:GO's netcon on port ${this.port}.`);
        try {
            await this.waitForConsoleSocket();
        } catch (e) {
            throw e;
        }
        this.socket = connect(this.port, '127.0.0.1');
        this.log.debug(`Connected on port ${this.port}.`);
        this.socket.setEncoding('utf8');
        this.reader = createInterface({
            input: this.socket,
            crlfDelay: Infinity
        });
        this.log.info('Ready!');
        this.initialized = true;
    }

    public begin = async (): Promise<void> => {
        // When this.alive IS SET TO undefined, it means this instance is unused.
        if (this.alive !== undefined) {
            // If this instance is still alive
            if (this.alive) {
                throw Error('Tried to call begin() again on an already active instance of SubscriberManager.');
            } else {
                // Otherwise, this.alive is false and this SubscriberManager has already been used and closed
                throw new Error(`Tried to call begin() when this SubscriberManager was already dead.`);
            }
        }
        this.alive = true;
        for await (const rawLine of this.reader as ReadLine) {
            const line = rawLine.trimEnd();
            let lineHandledBySpecialOutputGrabber: boolean = false;
            for (let i = 0; i < this.specialOutputGrabbers.length; i++) {
                if (this.specialOutputGrabbers[i][0].test(line)) {
                    this.valueListenersLog.trace(`Selected output grabber '${this.specialOutputGrabbers[i]}' to handle line '${line}'.`)
                    this.specialOutputGrabbers[i][1].resolve(line);
                    this.specialOutputGrabbers.splice(i, 1);
                    lineHandledBySpecialOutputGrabber = true;
                    break;
                }
            }
            if (lineHandledBySpecialOutputGrabber) {
                //This line has been processed and passing to other handlers could cause undefined behavior
                //Don't bother handing the line value to anyone else. Await the next line of console output
                continue;
            }
            const lineIsACvarValue = this.cvarEchoRegExp.test(line);
            let lineHandledByCvarListener = false;
            let cvarName, cvarValue;
            if (lineIsACvarValue) {
                const cvarOutput = this.cvarEchoRegExp.exec(line);
                cvarName = cvarOutput![1];
                cvarValue = cvarOutput![2];
            }
            for (let i = 0; i < this.subscribedCvarValues.length; i++) {
                if (this.subscribedCvarValues[i][0] === cvarName) {
                    //Run the callback, providing it with the value of the Cvar it was asking about
                    this.subscribedCvarValues[i][1].resolve(Number(cvarValue));
                    //Remove this subscriber
                    this.subscribedCvarValues.splice(i, 1);
                    lineHandledByCvarListener = true;
                    break;
                }
            }
            if (lineHandledByCvarListener)
                continue;
            for (let i = 0; i <= this.subscribers.length; i++) {
                if (i === this.subscribers.length) {
                    this.log.trace(`No suitable subscriber found for message: ${line}`);
                } else {
                    /*
                     * If the subscribed callback returns true, it means that it is responsible for handling
                     * the provided message. If it returns false, we should keep iterating over our subscribers to find
                     * which
                     */
                    const subscriberCanHandleLine = this.subscribers[i].canHandle(line);
                    if (subscriberCanHandleLine) {
                        this.subscriberLog.debug(`Selected listener '${this.subscribers[i].name()}' to handle line '${line}'.`);
                        //We've found a suitable method to handle the message
                        try {
                            //Can't run 'await this.subscribers[i].handleLine(line);' because this would cause a deadlock
                            this.subscribers[i].handleLine(line).then(() => this.subscriberLog.debug(`Listener '${this.subscribers[i]}' finished handling line '${line}'.`));
                        } catch (e) {
                            this.subscriberLog.error(`Listener '${this.subscribers[i]}' encountered an error handling line '${line}'.`);
                            this.subscriberLog.error(e);
                        }
                        break;
                    }
                }
            }
        }
        this.alive = false;
    }

    public waitForConsoleSocket = async () => {
        const requestId = v4();
        try {
            this.log.debug(`(Request ID ${requestId}) Waiting on TCP port ${this.port} for ${this.waitOnOpts.timeout! / 1000} seconds.`);
            await waitOn(this.waitOnOpts);
            this.log.debug(`(Request ID ${requestId}) Done waiting!`);
        } catch (err) {
            this.log.error(err);
            this.log.error('Encountered an error when waiting for the console socket to open.');
            throw err;
        }
    }

    /**
     * @returns whether this instance has had init() called on it
     */
    public isInitialized = (): boolean => {
        return this.initialized;
    }

    /**
     * Determines whether this instance is alive or not. You should always check isInitialized() first.
     * isAlive() will return false if init() hasn't been called and this would mean that this instance ISN'T DEAD
     * but simply has not been initialized yet.
     *
     * @returns whether this instance is still alive or not (has an open socket and is still running the the big for loop)
     * If still running, this will be true. If not started yet, undefined will be returned. If the loop has since stopped,
     * false will be returned.
     */
    public isAlive = (): boolean | undefined => {
        return this.alive;
    }

    /**
     * Write one or many commands to the console.
     * @param commandOrArray a single string or an array of strings to be written to the console
     */
    public sendMessage = (commandOrArray: string | string[]) => {
        if (!this.socket!.writable) {
            throw new Error(`Tried to write to a socket that wasn't writable!`);
        }
        if (Array.isArray(commandOrArray)) {
            for (let command of commandOrArray) {
                this.log.debug(`Writing to CStrike console: '${command}'`);
                this.socket!.write(`${command}\n`);
            }
            //TODO: Research if there's a better way to use varargs in TypeScript :)
        } else {
            this.log.debug(`Writing to CStrike console: '${commandOrArray}'`);
            this.socket!.write(`${commandOrArray}\n`);
        }
    }

    public requestCvarValue = (cvarName: string): Promise<number> => {
        const deferred: pDefer.DeferredPromise<number> = pDefer();
        this.subscribedCvarValues.push([cvarName, deferred]);
        this.sendMessage(cvarName);
        this.cvarSubscribersLog.debug(`Added '${cvarName}' to the cvar subscribers list.`);
        return new TimeoutPromise().timeoutPromise(deferred.promise, `Request for Cvar '${cvarName}'`, false);
    }

    public searchForValue = (command: string | string[], regex: RegExp, isUserDecision: boolean, additionalDetailsAboutRequest?: string) => {
        const deferred: pDefer.DeferredPromise<string> = pDefer();
        this.specialOutputGrabbers.push([regex, deferred]);
        this.sendMessage(command);
        this.valueListenersLog.debug(`Added a value grabber grabbing output from '${command}' to the grabber list.`);
        return new TimeoutPromise().timeoutPromise(deferred.promise, `Request for response to command '${command}'`, isUserDecision, additionalDetailsAboutRequest);
    }

    public subscribe = (listener: ListenerService) => {
        this.subscribers.push(listener);
        this.subscriberLog.debug(`Added callback '${listener}' to the subscribers list.`);
    }

    public unsubscribe = (listener: ListenerService) => {
        const index = this.subscribers.indexOf(listener);
        if (index > -1) {
            this.subscribers.splice(index, 1);
        } else {
            this.subscriberLog.warn(`Attempted to unsubscribe callback function '${listener}' but failed.`);
        }
    }

    //Maybe I'll implement these in the future if necessary

    // /**
    //  * This helps make sure that potential multi-line console output goes to only one specific callback
    //  * as it is the only callback that will understand how to operate on the received text.
    //  *
    //  * Remove this exclusivity afterwards by running unsubscribeExclusively
    //  * @param callback a callback to run on every line of received text after this function is run.
    //  */
    // public static subscribeExclusively = (callback: any) => {
    //
    // }
    //
    // public static unsubscribeExclusively = (callback: any) => {
    //
    // }
}