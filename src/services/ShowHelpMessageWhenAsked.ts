import {ConsoleHelper} from "../utils/ConsoleHelper";

export class ShowHelpMessageWhenAsked implements ListenerService {
    public static readonly HelpCommand = 'dh help';

    name(): string {
        return ShowHelpMessageWhenAsked.name;
    }

    canHandle(consoleLine: string): boolean {
        return consoleLine === ShowHelpMessageWhenAsked.HelpCommand;
    }

    async handleLine(consoleLine: string): Promise<void> {
        await ShowHelpMessageWhenAsked.ShowHelpMessageWhenAksed();
    }

    private static ShowHelpMessageWhenAksed = async (): Promise<void> => {
        ConsoleHelper.printHelpMessage();
    }
}