import * as fs from "fs";
import * as path from "path";
import request from "request-promise";
import { appConfig } from "./config.mjs";

export function getColorNameOrEmoticon(color, option) {
	let x = {
		0: { e: "⚪️", pt: "branco", text: "white" },
		1: { e: "🔴", pt: "vermelho", text: "red" },
		2: { e: "⚫", pt: "preto", text: "black" },
	};

	if (option.emoticon) return x[color]?.e;
	let text = option.pt ? x[color]?.pt : x[color]?.text;
	return option.upper ? text?.toUpperCase() : text;
}

export function readResults() {
	const currentDay = new Date().toJSON().slice(0, 10);
	const pathResults = path.join("./results", `${currentDay}.json`);
	try {
		let summary = fs.readFileSync(pathResults, "utf8");
		return JSON.parse(summary);
	} catch (error) {
		return false;
	}
}

export async function recents() {
	try {
		let data = await request.get(
			process.env.BASE_URL + "/api/roulette_games/recent",
			{ json: true }
		);
		return { status: true, error: null, response: data };
	} catch (err) {
		return { status: false, error: err.message, response: [] };
	}
}

export async function verifyBetTrend(color) {
	let { status, response } = await recents();
	if (!status) return false;

	let sequenceForTrend = parseInt(appConfig("sequenceForTrend") || 3);
	if (response && response.length >= sequenceForTrend) {
		let lastResults = response.reverse().slice(-sequenceForTrend);
		let dontBet = lastResults.every((result) => result.color !== color);
		return Boolean(dontBet);
	}
}
