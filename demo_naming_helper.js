/*
 * When I record POV demos, I like to keep them organized by naming them by gamemode, map, and date. If I've already
 * played the same map and gamemode as a previous demo, I append "-2" or a greater number to the end of the demo name
 * to indicate it was the second time playing that combination of gamemode and map that day. If I have to disconnect
 * and stop recording the demo, I typically append "-pt2" to indicate this is the second part of the same demo.
 * This tool helps by automating the naming process including checking for existing demos.
 */
const ini = require('ini');
const fs = require('fs');

const config = ini.parse(fs.readFileSync('./config.ini', 'utf-8'));

const makeTimestamp = () => {
    const d = new Date();
    return `${d.getMonth()}-${d.getDay()}-${d.getFullYear()}`;
}

module.exports = demo_naming_helper = {
    makeTimestamp,
}