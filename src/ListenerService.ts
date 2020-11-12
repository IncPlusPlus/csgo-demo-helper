interface ListenerService {
    canHandle(consoleLine: string): boolean;

    handleLine(consoleLine: string): Promise<void>;
}