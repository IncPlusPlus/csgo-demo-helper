export interface ListenerService {
    name(): string;

    canHandle(consoleLine: string): boolean;

    handleLine(consoleLine: string): Promise<void>;
}