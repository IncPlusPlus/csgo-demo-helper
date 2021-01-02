import {ConsoleHelper} from "../utils/ConsoleHelper";
import {ListenerService} from "../ListenerService";


export class ShowWelcomeMessageOnStartup implements ListenerService {
    public static readonly CsgoStartupFinishedString = 'ChangeGameUIState: CSGO_GAME_UI_STATE_INTROMOVIE -> CSGO_GAME_UI_STATE_MAINMENU';

    name(): string {
        return ShowWelcomeMessageOnStartup.name;
    }

    canHandle(consoleLine: string): boolean {
        return consoleLine === ShowWelcomeMessageOnStartup.CsgoStartupFinishedString;
    }

    async handleLine(consoleLine: string): Promise<void> {
        await ShowWelcomeMessageOnStartup.showWelcomeMessageOnStartup();
    }

    private static showWelcomeMessageOnStartup = async (): Promise<void> => {
        // ConsoleHelper.showConsole();
        ConsoleHelper.clearConsole();
        ConsoleHelper.printWelcomeMessage();
        // ConsoleHelper.hideConsole();
    }
}