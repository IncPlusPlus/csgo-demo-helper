import {Config} from "./Config";

export class ConfigFactory {
    private static Config: Config | undefined;

    public static getConfigInstance(inTest = false): Config {
        if (!ConfigFactory.Config) {
            ConfigFactory.Config = new Config(inTest);
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