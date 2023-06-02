import * as fs from "fs";
import * as path from "path";

export function appConfig(key, defaultValue = undefined) {
	try {
		const pathConfig = path.join("./config", "app.json");
		const configFile = fs.readFileSync(pathConfig, "utf8");
		const configs = JSON.parse(configFile);
		return configs[key] || defaultValue;
	} catch (error) {
		return defaultValue;
	}
}
