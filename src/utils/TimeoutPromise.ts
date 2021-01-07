import {ConfigFactory} from "./ConfigFactory";

export class TimeoutPromise {
    private readonly config: { [p: string]: any } = ConfigFactory.getConfigInstance().getConfig();
    private readonly consolePromiseTimeoutMs: number = this.config.internals.console_output_promise_wait_time * 1000;
    private readonly consoleUserInputPromiseTimeoutMs: number = this.config.internals.console_user_input_wait_time * 1000;

    /**
     * @see https://italonascimento.github.io/applying-a-timeout-to-your-promises/
     * @param promise a promise to add a timeout to
     * @param descriptiveTaskName some name that will make sense to someone when they're trying to figure out the specific promise that failed and what it was doing
     * @param isUserDecision whether or not this promise is for a user's decision, in which case the promise should wait console_user_input_wait_time seconds (per config.ini)
     * @param additionalDetailsAboutRequest provides additional context for why this request was made. For example, 'to get the name of the current map'
     * @returns a promise that will be rejected after config.internals.console_output_promise_wait_time milliseconds but won't be rejected if the provided promise resolves or is rejected before then
     */
    public timeoutPromise = <T>(promise: Promise<T>, descriptiveTaskName: string, isUserDecision: boolean, additionalDetailsAboutRequest?: string): Promise<T> => {
        // Create the error here to not mess up the stacktrace
        let err = Error(`${descriptiveTaskName} timed out in ${this.consolePromiseTimeoutMs}ms${isUserDecision ? ' while waiting for user input' : ''}.${additionalDetailsAboutRequest ? ` The purpose of this request was ${additionalDetailsAboutRequest}.` : ''}`);
        // Create a promise that rejects in <ms> milliseconds
        let timeout = new Promise<T>((resolve, reject) => {
            let id = setTimeout(() => {
                clearTimeout(id);
                reject(err);
            }, isUserDecision ? this.consoleUserInputPromiseTimeoutMs : this.consolePromiseTimeoutMs);
        })

        // Returns a race between our timeout and the passed in promise
        return Promise.race([
            promise,
            timeout
        ]);
    }
}