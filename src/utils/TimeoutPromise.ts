import {Config} from "./Config";

export class TimeoutPromise {
    private static readonly config: { [p: string]: any } = Config.getConfig();
    private static readonly consolePromiseTimeoutMs: number = TimeoutPromise.config.internals.console_output_promise_wait_time * 1000;
    private static readonly consoleUserInputPromiseTimeoutMs: number = TimeoutPromise.config.internals.console_user_input_wait_time * 1000;

    /**
     * @see https://italonascimento.github.io/applying-a-timeout-to-your-promises/
     * @param promise a promise to add a timeout to
     * @param descriptiveTaskName some name that will make sense to someone when they're trying to figure out the specific promise that failed and what it was doing
     * @param isUserDecision whether or not this promise is for a user's decision, in which case the promise should wait console_user_input_wait_time seconds (per config.ini)
     * @returns a promise that will be rejected after config.internals.console_output_promise_wait_time milliseconds but won't be rejected if the provided promise resolves or is rejected before then
     */
    public static timeoutPromise = <T>(promise: Promise<T>, descriptiveTaskName: string, isUserDecision: boolean): Promise<T> => {
        // Create a promise that rejects in <ms> milliseconds
        let timeout = new Promise<T>((resolve, reject) => {
            let id = setTimeout(() => {
                clearTimeout(id);
                if (isUserDecision) {
                    reject(new UserDecisionTimeoutException(descriptiveTaskName, TimeoutPromise.consoleUserInputPromiseTimeoutMs));
                } else {
                    reject(`${descriptiveTaskName} timed out in ${TimeoutPromise.consolePromiseTimeoutMs}ms.`);
                }
            }, isUserDecision ? TimeoutPromise.consoleUserInputPromiseTimeoutMs : TimeoutPromise.consolePromiseTimeoutMs);
        })

        // Returns a race between our timeout and the passed in promise
        return Promise.race([
            promise,
            timeout
        ]);
    }
}

export class UserDecisionTimeoutException {
    public readonly taskName: string;
    public readonly timeOut: number;

    constructor(taskName: string, timeOut: number) {
        this.taskName = taskName;
        this.timeOut = timeOut;
    }
}