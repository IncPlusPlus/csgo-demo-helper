import {ConsoleHelper} from "../utils/ConsoleHelper";

const helpCommand = 'dh help';

export class ShowHelpMessageWhenAsked implements ListenerService {
    name(): string {
        return ShowHelpMessageWhenAsked.name;
    }

    canHandle(consoleLine: string): boolean {
        return consoleLine === helpCommand;
    }

    async handleLine(consoleLine: string): Promise<void> {
        await ShowHelpMessageWhenAsked.ShowHelpMessageWhenAksed();
    }

    private static ShowHelpMessageWhenAksed = async (): Promise<void> => {
        ConsoleHelper.printHelpMessage();
    }
}