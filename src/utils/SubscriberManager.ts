/*
 * While building these utilities I quickly realized that having tons of different functions vying for control
 * of the socket simply wasn't viable. I needed a stupid-simple way for a single authority to hold the socket connection
 * and manage it responsibly, passing text output to whoever needed it.
 */
import * as readline from 'readline';
import * as net from 'net';
import * as ini from 'ini';
import * as fs from 'fs';
import * as uuid from 'uuid';
import * as util from 'util';
import pDefer = require('p-defer');
// const { v4: uuidv4 } = require('uuid');
import {Logger} from "./Logger";
const waitOn = require("wait-on");
type Pair<T,K> = [T,K];
export class SubscriberManager {

    private static readonly cvarEchoRegExp : RegExp = RegExp('^\"([a-zA-Z_]+)\" = \"(\\d+)\".*');
    private static readonly config : { [p: string]: any } = ini.parse(fs.readFileSync('./config.ini', 'utf-8'));
    private static readonly port : number = SubscriberManager.config.csgo.netcon_port;

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

    private static socket: net.Socket;
    private static reader: any;
    private static subscribers: any[] = [];
    /** These subscribers are expecting a single line of output as soon as possible (like a cvar value) */
    private static subscribedCvarValues : Pair<string, pDefer.DeferredPromise<number>>[] = [];

    public static init = async ():Promise<void> => {
        await SubscriberManager.patientlyWaitForConsoleSocket();
        SubscriberManager.socket = net.connect(SubscriberManager.port, '127.0.0.1');
        SubscriberManager.socket.setEncoding('utf8');
        SubscriberManager.reader = readline.createInterface({
            input: SubscriberManager.socket,
            crlfDelay: Infinity
        });
    }

    public static begin = async () :Promise<void> => {
        for await (const line of SubscriberManager.reader) {
            const lineIsACvarValue = SubscriberManager.cvarEchoRegExp.test(line);
            let lineHandledByCvarListener = false;
            let cvarName, cvarValue;
            if(lineIsACvarValue) {
                const cvarOutput = SubscriberManager.cvarEchoRegExp.exec(line);
                if(cvarOutput) {
                    cvarName = cvarOutput[1];
                    cvarValue = cvarOutput[2];
                } else {
                    //TODO: WARN HERE
                    continue;
                }
            }
            for(let i = 0; i < SubscriberManager.subscribedCvarValues.length; i++) {
                if(SubscriberManager.subscribedCvarValues[i][0] === cvarName) {
                    //Run the callback, providing it with the value of the Cvar it was asking about
                    SubscriberManager.subscribedCvarValues[i][1].resolve(Number(cvarValue));
                    //Remove this subscriber
                    SubscriberManager.subscribedCvarValues.splice(i, 1);
                    lineHandledByCvarListener = true;
                    break;
                }
            }
            if(lineHandledByCvarListener)
                continue;
            for(let i = 0; i <= SubscriberManager.subscribers.length; i++) {
                if(i === SubscriberManager.subscribers.length) {
                    Logger.fine(`No suitable subscriber found for message: ${line}`);
                }else {
                    /*
                     * If the subscribed callback returns true, it means that it is responsible for handling
                     * the provided message. If it returns false, we should keep iterating over our subscribers to find
                     * which
                     */
                    if(SubscriberManager.subscribers[i](line)){
                        //We've found a suitable method to handle the message
                        break;
                    }
                }
            }
        }
    }









    public static patientlyWaitForConsoleSocket = async () => {
        await SubscriberManager.waitForConsoleSocket(true);
    }

    public static  waitForConsoleSocket = async (patient : boolean) => {
        const requestId = uuid.v4();
        try {
            if(patient) {
                Logger.debug(`(Request ID ${requestId}) Waiting on TCP port ${SubscriberManager.port} for ${SubscriberManager.waitOnOpts.timeout/1000} seconds.`)
                await waitOn(SubscriberManager.waitOnOpts);
                Logger.debug(`(Request ID ${requestId}) Done waiting!`)
            } else {
                Logger.debug(`(Request ID ${requestId}) Waiting on TCP port ${SubscriberManager.port} for ${SubscriberManager.waitOnOptsImpatient.timeout/1000} seconds.`)
                await waitOn(SubscriberManager.waitOnOptsImpatient);
                Logger.debug(`(Request ID ${requestId}) Done waiting!`)
            }
        } catch (err) {
            console.log(err);
            console.log("Encountered an error when waiting for the console socket to open. See above text for details.\n");
        }
    }

    /**
     * Write one or many commands to the console.
     * @param commandOrArray a single string or an array of strings to be written to the console
     */
    public static sendMessage = (commandOrArray: any) => {

        if (Array.isArray(commandOrArray)) {
            for (let command of commandOrArray) {
                Logger.writingToCStrikeConsole(command);
                SubscriberManager.socket.write(`${command}\n`);
            }
        } else if (typeof commandOrArray === 'string') {
            Logger.writingToCStrikeConsole(commandOrArray);
            SubscriberManager.socket.write(`${commandOrArray}\n`);
        } else if (commandOrArray instanceof String) {
            throw 'idiot over the fence';
            // Logger.writingToCStrikeConsole(commandOrArray);
            // SubscriberManager.socket.write(`${commandOrArray}\n`);
        } else {
            console.log("Unsupported object type sent to 'writeCommand' function.");
        }
    }

    public static requestCvarValue = (cvarName: string) : Promise<number> => {
        const deferred : pDefer.DeferredPromise<number> = pDefer();
        SubscriberManager.subscribedCvarValues.push([cvarName, deferred]);
        SubscriberManager.sendMessage(cvarName);
        Logger.debug(`Added callback for '${cvarName}' to the temporary subscribers list.`)
        return deferred.promise;
    }

    public static  subscribe = (callback: any) => {
        SubscriberManager.subscribers.push(callback);
        Logger.debug(`Added callback '${callback}' to the subscribers list.`)
    }

    public static unsubscribe = (callback: any) => {
        const index = SubscriberManager.subscribers.indexOf(callback);
        if(index > -1) {
            SubscriberManager.subscribers.splice(index, 1);
        } else {
            Logger.warn(`Attempted to unsubscribe callback function '${callback}' but failed.`);
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