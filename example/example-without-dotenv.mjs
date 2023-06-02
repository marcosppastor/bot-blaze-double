import ora from "ora";
import gradient from "gradient-string";
import figlet from "figlet";

import { BotBlazeWithTelegram } from "../src/index.mjs";
import { getColorNameOrEmoticon } from "../src/util/blaze.mjs";

figlet("Blaze with Telegram", (_, screen) => {
	console.log(gradient.vice(screen));
	console.log("       " + gradient.cristal("by: Elizandro Dantas"));
	console.log();
	start();
});

async function start() {
	let appOra = ora("Iniciando aplicação").start();

	let controllerBot = new BotBlazeWithTelegram({
		timeAfterWin: {
			message: "Tempo para analise apos win",
			time: 1,
		},
		sticker: {
			win: "win.jpg",
			winGale: "win-in-gale.jpg",
			winWhite: "win-white.jpg",
			loss: "loss.jpg",
		},
		timeAfterLoss: {
			time: 1,
			message: "Tempo para analise apos loss",
		},
		summaryOfResult: {
			interval: 1,
			message: (number) => {
				return (
					`Total de jogadas: ${number.total}` +
					`\nWins seguidos: ${number.consecutive} ✅` +
					`\nTotal de win: ${number.win} ✅` +
					`\nTotal de loss: ${number.loss} ❌` +
					`\nTaxa de acertividade: ${(
						(number.win / number.total) *
						100
					).toFixed(1)}%`
				);
			},
		},
		messageEnterBet: (current, recents, cb) => {
			// cb('test callback');

			return (
				"🔎 <b>SINAL ENCONTRADO:</b>\n" +
				`\nENTRE NO ${getColorNameOrEmoticon(current.color, {
					emoticon: true,
				})} ${getColorNameOrEmoticon(current.color, {
					pt: true,
					upper: true,
				})}` +
				`\nPROTEJA NO ${getColorNameOrEmoticon(0, {
					emoticon: true,
				})} ${getColorNameOrEmoticon(0, { pt: true, upper: true })}` +
				`\n\n<pre>https://blaze.com/${
					process.env.REF ? "r/" + process.env.REF : ""
				}</pre>`
			);
		},
		gale: 2,
	});

	await controllerBot.run();

	appOra.succeed("Aplicação iniciada com sucesso!");

	process.on("SIGINT", () => {
		controllerBot.telegram.close();
		controllerBot.blaze.socket.closeSocket();
		process.exit();
	});
	process.on("SIGQUIT", () => {
		controllerBot.telegram.close();
		controllerBot.blaze.socket.closeSocket();
		process.exit();
	});
	process.on("SIGTERM", () => {
		controllerBot.telegram.close();
		controllerBot.blaze.socket.closeSocket();
		process.exit();
	});
}
