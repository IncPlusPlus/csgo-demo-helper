import {Config} from "./Config";

export class ConfigFactory {
    private static Config: Config | undefined;

    public static getConfigInstance(): Config {
        if (!ConfigFactory.Config) {
            ConfigFactory.Config = new Config();
        }
        return ConfigFactory.Config;
    }

    /**
     * @test THIS IS FOR TESTING PURPOSES ONLY
     */
    public static clear() {
        this.Config = undefined;
    }
}