import {Config} from "./Config";

export class TimeoutPromise {
    private static readonly config: { [p: string]: any } = Config.getConfig();
    private static readonly consolePromiseTimeoutMs: number = TimeoutPromise.config.internals.console_output_promise_wait_time * 1000;

    public static timeoutPromise = <T>(promise: Promise<T>, descriptiveTaskName: string): Promise<T> => {
        // Create a promise that rejects in <ms> milliseconds
        let timeout = new Promise<T>((resolve, reject) => {
            let id = setTimeout(() => {
                clearTimeout(id);
                reject(`${descriptiveTaskName} timed out in ${TimeoutPromise.consolePromiseTimeoutMs}ms.`);
            }, TimeoutPromise.consolePromiseTimeoutMs);
        })

        // Returns a race between our timeout and the passed in promise
        return Promise.race([
            promise,
            timeout
        ]);
    }
}