import {ConsoleHelper} from "../utils/ConsoleHelper";

const csgoStartupFinishedString = 'ChangeGameUIState: CSGO_GAME_UI_STATE_INTROMOVIE -> CSGO_GAME_UI_STATE_MAINMENU';

export class ShowWelcomeMessageOnStartup implements ListenerService {
    canHandle(consoleLine: string): boolean {
        return consoleLine === csgoStartupFinishedString;
    }

    async handleLine(consoleLine: string): Promise<void> {
        await ShowWelcomeMessageOnStartup.showWelcomeMessageOnStartup();
    }

    private static showWelcomeMessageOnStartup = async (): Promise<void> => {
        ConsoleHelper.showConsole();
        ConsoleHelper.clearConsole();
        ConsoleHelper.printWelcomeMessage();
        ConsoleHelper.hideConsole();
    }
}