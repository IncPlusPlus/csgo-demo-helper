/*
 * While building these utilities I quickly realized that having tons of different functions vying for control
 * of the socket simply wasn't viable. I needed a stupid-simple way for a single authority to hold the socket connection
 * and manage it responsibly, passing text output to whoever needed it.
 */
const net = require('net');
const readline = require('readline');
const ini = require('ini');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger.js');
const waitOn = require("wait-on");

const cvarEchoRegExp = RegExp('^\"([a-zA-Z_]+)\" = \"(\\d+)\".*');
const config = ini.parse(fs.readFileSync('./config.ini', 'utf-8'));
const port = config.csgo.netcon_port;

//For use with functions that are expecting the game not to be open yet
const waitOnOpts = {
    resources: [
        `tcp:${port}`,
    ],
    interval: 100, // poll interval in ms, default 250ms
    timeout: 90000, // timeout in ms, default Infinity
    // tcpTimeout: 1000, // tcp timeout in ms, default 300ms
    window: 500, // stabilization time in ms, default 750ms
};
//For use with all other functions
const waitOnOptsImpatient = {
    resources: [
        `tcp:${port}`,
    ],
    interval: 50, // poll interval in ms, default 250ms
    timeout: 1000, // timeout in ms, default Infinity
    // tcpTimeout: 1000, // tcp timeout in ms, default 300ms
    window: 500, // stabilization time in ms, default 750ms
};

let socket, reader;
let subscribers = [];
/** These subscribers are expecting a single line of output as soon as possible (like a cvar value) */
let subscribedCvarValues = [];

let init = async () => {
    await patientlyWaitForConsoleSocket();
    socket = net.connect(port, '127.0.0.1');
    socket.setEncoding('utf8');
    reader = readline.createInterface({
        input: socket,
        crlfDelay: Infinity
    });
    for await (const line of reader) {
        const lineIsACvarValue = cvarEchoRegExp.test(line);
        let lineHandledByCvarListener = false;
        let cvarName, cvarValue;
        if(lineIsACvarValue) {
            const cvarOutput = cvarEchoRegExp.exec(line);
            cvarName = cvarOutput[1];
            cvarValue = cvarOutput[2];
        }
        for(let i = 0; i < subscribedCvarValues.length; i++) {
            if(subscribedCvarValues[i][0] === cvarName) {
                //Run the callback, providing it with the value of the Cvar it was asking about
                subscribedCvarValues[i][1](cvarValue);
                //Remove this subscriber
                subscribedCvarValues.splice(i, 1);
                lineHandledByCvarListener = true;
                break;
            }
        }
        if(lineHandledByCvarListener)
            continue;
        for(let i = 0; i <= subscribers.length; i++) {
            if(i === subscribers.length) {
                logger.fine(`No suitable subscriber found for message: ${line}`);
            }else {
                /*
                 * If the subscribed callback returns true, it means that it is responsible for handling
                 * the provided message. If it returns false, we should keep iterating over our subscribers to find
                 * which
                 */
                if(subscribers[i](line)){
                    //We've found a suitable method to handle the message
                    break;
                }
            }
        }
    }
}









const patientlyWaitForConsoleSocket = async () => {
    await waitForConsoleSocket(true);
}

const waitForConsoleSocket = async (patient) => {
    const requestId = uuidv4();
    try {
        if(patient) {
            logger.debug(`(Request ID ${requestId}) Waiting on TCP port ${port} for ${waitOnOpts.timeout/1000} seconds.`)
            await waitOn(waitOnOpts);
            logger.debug(`(Request ID ${requestId}) Done waiting!`)
        } else {
            logger.debug(`(Request ID ${requestId}) Waiting on TCP port ${port} for ${waitOnOptsImpatient.timeout/1000} seconds.`)
            await waitOn(waitOnOptsImpatient);
            logger.debug(`(Request ID ${requestId}) Done waiting!`)
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
const sendMessage = (commandOrArray) => {
    if (Array.isArray(commandOrArray)) {
        for (let command of commandOrArray) {
            logger.writingToCStrikeConsole(command);
            socket.write(`${command}\n`);
        }
    } else if (typeof commandOrArray === 'string' || commandOrArray instanceof String) {
        logger.writingToCStrikeConsole(commandOrArray);
        socket.write(`${commandOrArray}\n`);
    } else {
        console.log("Unsupported object type sent to 'writeCommand' function.");
    }
}

const requestCvarValue = (cvarName, callback) => {
    subscribedCvarValues.push([cvarName, callback]);
    logger.debug(`Added callback '${callback}' to the temporary subscribers list.`)
}

const subscribe = (callback) => {
    subscribers.push(callback);
    logger.debug(`Added callback '${callback}' to the subscribers list.`)
}

const unsubscribe = (callback) => {
    const index = subscribers.indexOf(callback);
    if(index > -1) {
        subscribers.splice(index, 1);
    } else {
        logger.warn(`Attempted to unsubscribe callback function '${callback}' but failed.`);
    }
}

/**
 * This helps make sure that potential multi-line console output goes to only one specific callback
 * as it is the only callback that will understand how to operate on the received text.
 *
 * Remove this exclusivity afterwards by running unsubscribeExclusively
 * @param callback a callback to run on every line of received text after this function is run.
 */
let subscribeExclusively = (callback) => {

}

let unsubscribeExclusively = (callback) => {

}

module.exports = subscriber_manager = {
    init,
    sendMessage,
    requestCvarValue,
    subscribe,
    unsubscribe,
    subscribeExclusively,
    unsubscribeExclusively,
}