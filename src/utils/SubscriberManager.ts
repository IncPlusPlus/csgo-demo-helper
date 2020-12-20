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
import pDefer = require('p-defer');

const waitOn = require("wait-on");

export class SubscriberManager {
    private readonly cvarEchoRegExp: RegExp = RegExp('^\"([a-zA-Z_]+)\" = \"(\\d+)\".*');
    private readonly config: { [p: string]: any } = ConfigFactory.getConfigInstance().getConfig();
    private readonly port: number = this.config.csgo.netcon_port;
    private readonly log = LogHelper.getLogger('SubscriberManager');
    private readonly subscriberLog = LogHelper.getLogger('SubscriberManager.subscribers');
    private readonly cvarSubscribersLog = LogHelper.getLogger('SubscriberManager.cvarSubscribers');
    private readonly valueListenersLog = LogHelper.getLogger('SubscriberManager.valueListeners');

//For use with functions that are expecting the game not to be open yet
    private readonly waitOnOpts = {
        resources: [
            `tcp:${this.port}`,
        ],
        interval: 100, // poll interval in ms, default 250ms
        timeout: 90000, // timeout in ms, default Infinity
        // tcpTimeout: 1000, // tcp timeout in ms, default 300ms
        window: 500, // stabilization time in ms, default 750ms
    };
//For use with all other functions
    private readonly waitOnOptsImpatient = {
        resources: [
            `tcp:${this.port}`,
        ],
        interval: 50, // poll interval in ms, default 250ms
        timeout: 1000, // timeout in ms, default Infinity
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
            await this.patientlyWaitForConsoleSocket();
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
    }

    public begin = async (): Promise<void> => {
        if (this.reader === undefined) {
            throw new Error(`Someone tried to start SubscriberManager without calling init first!`);
        }
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
                if (cvarOutput) {
                    cvarName = cvarOutput[1];
                    cvarValue = cvarOutput[2];
                } else {
                    this.cvarSubscribersLog.error(`Cvar RegEX matched output for a cvar but couldn't properly capture the content. Console output was '${line}'.`);
                    continue;
                }
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
                        this.subscriberLog.debug(`Selected listener '${this.subscribers[i]}' to handle line '${line}'.`);
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
    }

    public patientlyWaitForConsoleSocket = async () => {
        try {
            await this.waitForConsoleSocket(true);
        } catch (e) {
            throw e;
        }
    }

    public waitForConsoleSocket = async (patient: boolean) => {
        const requestId = v4();
        try {
            if (patient) {
                this.log.debug(`(Request ID ${requestId}) Waiting on TCP port ${this.port} for ${this.waitOnOpts.timeout / 1000} seconds.`)
                await waitOn(this.waitOnOpts);
                this.log.debug(`(Request ID ${requestId}) Done waiting!`)
            } else {
                this.log.debug(`(Request ID ${requestId}) Waiting on TCP port ${this.port} for ${this.waitOnOptsImpatient.timeout / 1000} seconds.`)
                await waitOn(this.waitOnOptsImpatient);
                this.log.debug(`(Request ID ${requestId}) Done waiting!`)
            }
        } catch (err) {
            this.log.error(err);
            this.log.error('Encountered an error when waiting for the console socket to open.');
            throw err;
        }
    }

    /**
     * Write one or many commands to the console.
     * @param commandOrArray a single string or an array of strings to be written to the console
     */
    public sendMessage = (commandOrArray: string | string[]) => {
        if (Array.isArray(commandOrArray)) {
            for (let command of commandOrArray) {
                this.log.debug(`Writing to CStrike console: '${command}'`);
                this.socket?.write(`${command}\n`);
            }
            //TODO: Research if there's a better way to use varargs in TypeScript :)
        } else {
            this.log.debug(`Writing to CStrike console: '${commandOrArray}'`);
            this.socket?.write(`${commandOrArray}\n`);
        }
    }

    public requestCvarValue = (cvarName: string): Promise<number> => {
        const deferred: pDefer.DeferredPromise<number> = pDefer();
        this.subscribedCvarValues.push([cvarName, deferred]);
        this.sendMessage(cvarName);
        this.cvarSubscribersLog.debug(`Added '${cvarName}' to the cvar subscribers list.`)
        return new TimeoutPromise().timeoutPromise(deferred.promise, `Request for Cvar '${cvarName}'`, false);
    }

    public searchForValue = (command: string | string[], regex: RegExp, isUserDecision: boolean) => {
        const deferred: pDefer.DeferredPromise<string> = pDefer();
        this.specialOutputGrabbers.push([regex, deferred]);
        this.sendMessage(command);
        this.valueListenersLog.debug(`Added a value grabber grabbing output from '${command}' to the grabber list.`)
        return new TimeoutPromise().timeoutPromise(deferred.promise, `Request for response to command '${command}'`, isUserDecision);
    }

    public subscribe = (listener: ListenerService) => {
        this.subscribers.push(listener);
        this.subscriberLog.debug(`Added callback '${listener}' to the subscribers list.`)
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