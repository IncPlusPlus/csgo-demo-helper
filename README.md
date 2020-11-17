# CS:GO Demo Utilities
This is a collection of tools that I use when I play Counter-Strike: Global Offensive. They help me to record POV demos when I'm playing competitive matches. For information on what drove me to make this, see the [background section](#background) which I've mercifully moved to the bottom of the README because there's a lot to explain.

## Features
Here are the features provided by this set of tools. They can all be configured through a `config.ini` that you will create in the installation process.

### Demo Naming Helper
This is what this toolbox was originally for. If you want to record your own POV demos and go back to them later, you need to have some sort of naming scheme to be able to find a specific demo again. I follow the naming scheme "[game mode]-[map name]-[mm-dd-yyyy]" for my demos and this tool helps automate the process by querying the game for the game mode and map name. Options for this utility can be configured in the `demo_naming_helper` of your `config.ini` file.

If you want to use this tool but use a different naming scheme, make a feature request, and I'll see what I can do to support your style of naming demos.

### POV Demo Voice Recording
This allows you to record your own voice in POV demos without having to hear yourself during the recording process.

Typically, if you want your voice to be audible in your POV demos, you have to turn on `voice_loopback` which will make you hear yourself twice. The solution is to turn on `voice_loopback` but turn down the volume of your voice to 0 with the `voice_player_volume` command. DemoRecordingHelper automates this process and can be configured in the `demo_recording_helper` section of your `config.ini` file.

DemoPlaybackHelper is responsible for _unmuting_ the player who was muted by DemoRecordingHelper (if any).

## Installation
Installation is a piece of cake, but you will need to have a teensy bit of rudimentary knowledge on how to get around the command-line on your OS. This tool should work on any OS that CS:GO runs on.

1. [Install Git](https://git-scm.com/downloads)
1. Install Node.js in one of two ways
   1. [Install using a package manager for your OS](https://nodejs.org/en/download/package-manager/) (recommended as this makes updating Node.js easier)
   2. [Download and run the Node.js installer for your OS](https://nodejs.org/en/download/) (please avoid this if possible as this may cause permission issues when using npm later)
1. Ensure Node.js and npm are installed by making sure a valid version number comes back by running `node -v` and `npm -v`. Most installs of Node.js come with npm. Installing npm is not covered by this guide. If your install of Node.js is missing it, see [here](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm).
1. Clone this repository using `git clone https://github.com/IncPlusPlus/csgo-demo-helper.git`.
1. Create your own config file by making a copy of [config.template.ini](./config.template.ini) and renaming it to "config.ini". Configure the values to your liking but be sure to read what they do!
1. Set the `netconport` launch option to whatever you have set in your `config.ini` for the `netcon_port` option. Your launch options should be set to "-netconport 2121" (without the quotes) if you intend to use port 2121 for this tool to communicate with the game.
1. Set `steam_web_api_key` in your `config.ini by [creating and getting a Steam Web API Key](https://steamcommunity.com/dev/apikey)
1. Set `steamID64` in your `config.ini` by looking up your steam ID with [SteamID.io](https://steamid.io/) and copying the value called "steamID64". There should be a little red icon to the right which lets you copy it.
1. With your terminal set to the directory you cloned the project into (probably "csgo-demo-helper"), run the command `npm i`. This grabs everything this tool needs to run and dumps it into the node_modules folder.
1. Profit!

## Usage
1. Run one of the start scripts by double-clicking it. If you're on Windows, double-click `start.bat`. If you're on Linux, I'm sure you can figure it out.
2. Launch Counter-Strike: Global Offensive
3. Open the in-game console. There should be enough information printed in there to get you started.

## FAQ
1. Do I risk getting a VAC ban by using this tool?
   1. No. Everything this tool does is kosher. The _only_ way this tool interacts with CS:GO is by writing to and reading from the in-game console, a process that players do all the time.
1. How do I set my launch options
   1. See [this article from Steam's support page](https://support.steampowered.com/kb_article.php?ref=1040-JWMT-2947)

## Background
This section is just drivel about the woes of someone who wants to use demos as well as how and why I've created this monstrosity. It's more detailed than necessary, but you should read this before asking questions like "Why not do X to solve Y instead of the solution used in this repo?" unless I've had a truly stupid oversight.

On occasion, I make YouTube videos out of the `f u n n y  m o m e n t s` and cool frags that have happened in the games I've played. I tend to record the event using [ShadowPlay](https://www.nvidia.com/en-us/geforce/geforce-experience/shadowplay/) after the fact. However, if I want to get higher-quality footage or slow something down, I'll record footage of the demo itself.

### GOTV Demos
After playing a competitive game on official Valve Matchmaking servers, players can download a "demo" of the match (These will be called GOTV demos from here on). GOTV demos allow the player to watch the entire game recreated in the engine as recorded by the server. GOTV demos also allow players to spectate anybody's perspective or take any perspective not bound to a player ("freecam").

#### Problems
There are two problems that come with Valve's GOTV demos:
1. They are recorded as 32-tick despite the fact that the server runs at 64 ticks. This often causes visual artifacts and events that occurred in the match may not show up properly or at all during demo playback. For example, a really cool flickshot, during demo playback, can end up looking like you never even looked in the enemy's direction. I really wish valve didn't do this but [that's a different plate of cookies for a different glass of milk](https://youtu.be/66676_b8U0I?t=76).
2. They don't record voice chat

### POV Demos
POV demos are demos recorded by the player themself with the command `record [DEMO_NAME]` in the in-game console. These solve both the problems listed in the GOTV Demos section aren't free of trouble.

#### Problems
1. No freecam. POV demos record only the perspective of the player (this can't and won't be resolved by these tools).
2. _Your own voice_ will **not** be recorded. Although you will see an indicator for your name whenever you had been talking during the game, you will not hear your voice as the data has simply not been recorded.
   1. There is a workaround to allow your own voice to be recorded in a POV demo. If you set the Cvar `voice_loopback` to 1, your voice will be included in the demo. The drawback to this is that you hear what you say which is irritating for two reasons.
      1. Whenever you talk in-game, you'll hear a slightly delayed, somewhat low-quality version of yourself talking as well. I've gotten used to this, but it's always been irritating.
      2. ShadowPlay clips (or whatever you might use for an "instant replay" recording solution) will record your voice from your microphone and from the loopback the game is providing. Making speech really difficult to understand in a video.
3. You have to name these demos yourself which means you need to come up with some sort of system to organize their names

#### Solution
I originally made this tool just to solve problem 3 with POV demos by making a program that would automate the "[game mode]-[map name]-[mm-dd-yyyy]" demo naming scheme I had been manually following for years.

I had sort of accepted that I'd just always hear double when recording a POV demo. After doing some research, I discovered that I could also create a solution to problem 2. I would still have to use `voice_loopback 1` to record my own voice but using the command `voice_player_volume`, I could adjust the volume of everybody who would be audible to me when playing a game _**including myself**_. This would be a bit of a chore to do before every match, so I implemented an automated solution to this.

The one last issue to solve was actually created by `voice_player_volume` solution itself. The Cvar [`demo_recordcommands`](https://totalcsgo.com/command/demorecordcommands) is set to 1 by default. This means that the command to mute myself will be run again when playing the demo back. The voice data for myself _will_ be in the demo, I will just have to unmute myself every time. To remedy this, DemoRecordingHelper echoes a special message into the console after muting the player that DemoPlaybackHelper will pick up on when playing the demo back and know who to unmute. In hindsight, I probably could do the mute operation _before_ starting the recording. This would skirt around the edge case that a user has `demo_recordcommands` set to 0. Maybe I'll do that in the future. At least there's _a_ solution at the moment. 
