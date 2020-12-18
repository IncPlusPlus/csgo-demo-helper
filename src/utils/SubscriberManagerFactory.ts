import {SubscriberManager} from "./SubscriberManager";

export class SubscriberManagerFactory {
    private static subscriberManager: SubscriberManager;

    public static getSubscriberManager(): SubscriberManager {
        if (!SubscriberManagerFactory.subscriberManager) {
            SubscriberManagerFactory.subscriberManager = new SubscriberManager();
        }
        return SubscriberManagerFactory.subscriberManager;
    }
}