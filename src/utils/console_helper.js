/*
 * Small tools to help with console interaction
 */

const net = require('net');
const ini = require('ini');
const fs = require('fs');
const logger = require('./logger.js');
const subMan = require('./subscriber_manager.js')

const config = ini.parse(fs.readFileSync('./config.ini', 'utf-8'));
const welcomeMessage = [
    "Welcome to IncPlusPlus's CS:GO QOS utils!",
    "Type 'echo ds help' for available commands.",
    "",
    "",
    "",
]


const clearConsole = () => {
    subMan.sendMessage('clear');
}

// /**
//  * Write one or many commands to the console.
//  * @param commandOrArray a single string or an array of strings to be written to the console
//  */
// const writeCommand = async (commandOrArray) => {
//     await waitForConsoleSocket();
//     const socket = net.connect(port, '127.0.0.1');
//     socket.setEncoding('utf8');
//     if (Array.isArray(commandOrArray)) {
//         for (let command of commandOrArray) {
//             logger.writingToCStrikeConsole(command);
//             socket.write(`${command}\n`);
//         }
//     } else if (typeof commandOrArray === 'string' || commandOrArray instanceof String) {
//         logger.writingToCStrikeConsole(commandOrArray);
//         socket.write(`${commandOrArray}\n`);
//     } else {
//         console.log("Unsupported object type sent to 'writeCommand' function.");
//     }
//     socket.end();
// }

const showConsole = () => {
    subMan.sendMessage('showconsole');
}

const hideConsole = () => {
    subMan.sendMessage('hideconsole');
}

const printWelcomeMessage = () => {
    const message = welcomeMessage.map(value => "echo \"" + value + "\"");
    subMan.sendMessage(message);
}

const printHelpMessage = () => {

}



module.exports = console_helper = {
    showConsole,
    hideConsole,
    clearConsole,
    printWelcomeMessage,
    printHelpMessage,
}