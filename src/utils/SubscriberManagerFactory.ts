import {SubscriberManager} from "./SubscriberManager";

export class SubscriberManagerFactory {
    private static subscriberManager: SubscriberManager | undefined;

    public static getSubscriberManager(): SubscriberManager {
        if (!SubscriberManagerFactory.subscriberManager || !SubscriberManagerFactory.subscriberManager.isAlive()) {
            SubscriberManagerFactory.subscriberManager = new SubscriberManager();
        }
        return SubscriberManagerFactory.subscriberManager;
    }

    /**
     * @test THIS IS FOR TESTING PURPOSES ONLY
     */
    public static clear() {
        this.subscriberManager = undefined;
    }
}