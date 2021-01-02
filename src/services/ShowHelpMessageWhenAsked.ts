import {ConsoleHelper} from "../utils/ConsoleHelper";
import {ListenerService} from "../ListenerService";

export class ShowHelpMessageWhenAsked implements ListenerService {
    public static readonly HelpCommand = 'dh help';

    name(): string {
        return ShowHelpMessageWhenAsked.name;
    }

    canHandle(consoleLine: string): boolean {
        return consoleLine === ShowHelpMessageWhenAsked.HelpCommand;
    }

    async handleLine(consoleLine: string): Promise<void> {
        await ShowHelpMessageWhenAsked.ShowHelpMessageWhenAsked();
    }

    private static ShowHelpMessageWhenAsked = async (): Promise<void> => {
        ConsoleHelper.printHelpMessage();
    }
}