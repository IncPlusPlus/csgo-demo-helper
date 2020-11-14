/*
 * While building these utilities I quickly realized that having tons of different functions vying for control
 * of the socket simply wasn't viable. I needed a stupid-simple way for a single authority to hold the socket connection
 * and manage it responsibly, passing text output to whoever needed it.
 */
import {createInterface, Interface} from 'readline';
import {connect, Socket} from 'net';
import {v4} from 'uuid';
import {Logger} from "./Logger";
import {Config} from "./Config";
import pDefer = require('p-defer');

const waitOn = require("wait-on");


//TODO: Make the reject method of the promises expire on a timeout to assist with troubleshooting
export class SubscriberManager {
    private static readonly cvarEchoRegExp: RegExp = RegExp('^\"([a-zA-Z_]+)\" = \"(\\d+)\".*');
    private static readonly config: { [p: string]: any } = Config.getConfig();
    private static readonly port: number = SubscriberManager.config.csgo.netcon_port;

//For use with functions that are expecting the game not to be open yet
    private static readonly waitOnOpts = {
        resources: [
            `tcp:${SubscriberManager.port}`,
        ],
        interval: 100, // poll interval in ms, default 250ms
        timeout: 90000, // timeout in ms, default Infinity
        // tcpTimeout: 1000, // tcp timeout in ms, default 300ms
        window: 500, // stabilization time in ms, default 750ms
    };
//For use with all other functions
    private static readonly waitOnOptsImpatient = {
        resources: [
            `tcp:${SubscriberManager.port}`,
        ],
        interval: 50, // poll interval in ms, default 250ms
        timeout: 1000, // timeout in ms, default Infinity
        // tcpTimeout: 1000, // tcp timeout in ms, default 300ms
        window: 500, // stabilization time in ms, default 750ms
    };

    private static socket: Socket;
    private static reader: Interface;
    /** These subscribers are expecting one or more lines of text, unprompted. They're here to stay for the most part. */
    private static subscribers: ListenerService[] = [];
    /** These subscribers are expecting a single line of output as soon as possible (like a cvar value) */
    private static subscribedCvarValues: Pair<string, pDefer.DeferredPromise<number>>[] = [];
    /**
     * These subscribers act much like the cvar subscribers and are removed once dealt with. A regular expression is
     * used to determine if the given console output is meant for the temporary subscriber. If there's a match,
     * the subscriber is removed and the promise is fulfilled with the line output that matched the RegEx.
     */
    private static specialOutputGrabbers: Pair<RegExp, pDefer.DeferredPromise<string>>[] = [];

    public static init = async (): Promise<void> => {
        Logger.info('Starting up...');
        Logger.info(`Waiting to connect to CS:GO's netcon on port ${SubscriberManager.port}.`);
        await SubscriberManager.patientlyWaitForConsoleSocket();
        SubscriberManager.socket = connect(SubscriberManager.port, '127.0.0.1');
        Logger.info(`Connected on port ${SubscriberManager.port}.`);
        SubscriberManager.socket.setEncoding('utf8');
        SubscriberManager.reader = createInterface({
            input: SubscriberManager.socket,
            crlfDelay: Infinity
        });
    }

    public static begin = async (): Promise<void> => {
        for await (const rawLine of SubscriberManager.reader) {
            const line = rawLine.trimEnd();
            let lineHandledBySpecialOutputGrabber: boolean = false;
            for (let i = 0; i < SubscriberManager.specialOutputGrabbers.length; i++) {
                if (SubscriberManager.specialOutputGrabbers[i][0].test(line)) {
                    Logger.fine(`Selected output grabber '${SubscriberManager.specialOutputGrabbers[i]}' to handle line '${line}'.`)
                    SubscriberManager.specialOutputGrabbers[i][1].resolve(line);
                    SubscriberManager.specialOutputGrabbers.splice(i, 1);
                    lineHandledBySpecialOutputGrabber = true;
                    break;
                }
            }
            if (lineHandledBySpecialOutputGrabber) {
                //This line has been processed and passing to other handlers could cause undefined behavior
                //Don't bother handing the line value to anyone else. Await the next line of console output
                continue;
            }
            const lineIsACvarValue = SubscriberManager.cvarEchoRegExp.test(line);
            let lineHandledByCvarListener = false;
            let cvarName, cvarValue;
            if (lineIsACvarValue) {
                const cvarOutput = SubscriberManager.cvarEchoRegExp.exec(line);
                if (cvarOutput) {
                    cvarName = cvarOutput[1];
                    cvarValue = cvarOutput[2];
                } else {
                    Logger.warn(`Cvar RegEX matched output for a cvar but couldn't properly capture the content. Console output was '${line}'.`);
                    continue;
                }
            }
            for (let i = 0; i < SubscriberManager.subscribedCvarValues.length; i++) {
                if (SubscriberManager.subscribedCvarValues[i][0] === cvarName) {
                    //Run the callback, providing it with the value of the Cvar it was asking about
                    SubscriberManager.subscribedCvarValues[i][1].resolve(Number(cvarValue));
                    //Remove this subscriber
                    SubscriberManager.subscribedCvarValues.splice(i, 1);
                    lineHandledByCvarListener = true;
                    break;
                }
            }
            if (lineHandledByCvarListener)
                continue;
            for (let i = 0; i <= SubscriberManager.subscribers.length; i++) {
                if (i === SubscriberManager.subscribers.length) {
                    Logger.finest(`No suitable subscriber found for message: ${line}`);
                } else {
                    /*
                     * If the subscribed callback returns true, it means that it is responsible for handling
                     * the provided message. If it returns false, we should keep iterating over our subscribers to find
                     * which
                     */
                    const subscriberCanHandleLine = await SubscriberManager.subscribers[i].canHandle(line);
                    if (subscriberCanHandleLine) {
                        Logger.fine(`Selected listener '${SubscriberManager.subscribers[i]}' to handle line '${line}'.`)
                        //We've found a suitable method to handle the message
                        SubscriberManager.subscribers[i].handleLine(line).then(() => Logger.fine(`Listener '${SubscriberManager.subscribers[i]}' finished handling line '${line}'.`));
                        break;
                    }
                }
            }
        }
    }

    public static patientlyWaitForConsoleSocket = async () => {
        await SubscriberManager.waitForConsoleSocket(true);
    }

    public static waitForConsoleSocket = async (patient: boolean) => {
        const requestId = v4();
        try {
            if (patient) {
                Logger.debug(`(Request ID ${requestId}) Waiting on TCP port ${SubscriberManager.port} for ${SubscriberManager.waitOnOpts.timeout / 1000} seconds.`)
                await waitOn(SubscriberManager.waitOnOpts);
                Logger.debug(`(Request ID ${requestId}) Done waiting!`)
            } else {
                Logger.debug(`(Request ID ${requestId}) Waiting on TCP port ${SubscriberManager.port} for ${SubscriberManager.waitOnOptsImpatient.timeout / 1000} seconds.`)
                await waitOn(SubscriberManager.waitOnOptsImpatient);
                Logger.debug(`(Request ID ${requestId}) Done waiting!`)
            }
        } catch (err) {
            console.log(err);
            Logger.warn("Encountered an error when waiting for the console socket to open. See above text for details.\n");
        }
    }

    /**
     * Write one or many commands to the console.
     * @param commandOrArray a single string or an array of strings to be written to the console
     */
    public static sendMessage = (commandOrArray: string | string[]) => {
        if (Array.isArray(commandOrArray)) {
            for (let command of commandOrArray) {
                Logger.writingToCStrikeConsole(command);
                SubscriberManager.socket.write(`${command}\n`);
            }
            //TODO: Research how to PROPERLY use varargs in TypeScript :)
        } else {
            Logger.writingToCStrikeConsole(commandOrArray);
            SubscriberManager.socket.write(`${commandOrArray}\n`);
        }
    }

    public static requestCvarValue = (cvarName: string): Promise<number> => {
        const deferred: pDefer.DeferredPromise<number> = pDefer();
        SubscriberManager.subscribedCvarValues.push([cvarName, deferred]);
        SubscriberManager.sendMessage(cvarName);
        Logger.debug(`Added '${cvarName}' to the cvar subscribers list.`)
        return deferred.promise;
    }

    public static searchForValue = (command: string | string[], regex: RegExp) => {
        const deferred: pDefer.DeferredPromise<string> = pDefer();
        SubscriberManager.specialOutputGrabbers.push([regex, deferred]);
        SubscriberManager.sendMessage(command);
        Logger.debug(`Added a value grabber grabbing output from '${command}' to the grabber list.`)
        return deferred.promise;
    }

    public static subscribe = (listener: ListenerService) => {
        SubscriberManager.subscribers.push(listener);
        Logger.debug(`Added callback '${listener}' to the subscribers list.`)
    }

    public static unsubscribe = (listener: ListenerService) => {
        const index = SubscriberManager.subscribers.indexOf(listener);
        if (index > -1) {
            SubscriberManager.subscribers.splice(index, 1);
        } else {
            Logger.warn(`Attempted to unsubscribe callback function '${listener}' but failed.`);
        }
    }

    /**
     * This helps make sure that potential multi-line console output goes to only one specific callback
     * as it is the only callback that will understand how to operate on the received text.
     *
     * Remove this exclusivity afterwards by running unsubscribeExclusively
     * @param callback a callback to run on every line of received text after this function is run.
     */
    public static subscribeExclusively = (callback: any) => {

    }

    public static unsubscribeExclusively = (callback: any) => {

    }
}