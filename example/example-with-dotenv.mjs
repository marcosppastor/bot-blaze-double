import "dotenv/config";
import ora from "ora";
import gradient from "gradient-string";
import figlet from "figlet";

import { BotBlazeWithTelegram } from "../src/index.mjs";
import { getColorNameOrEmoticon } from "../src/util/blaze.mjs";
import { random } from "../src/util/random.mjs";

figlet("Blaze Bot", (_, screen) => {
	console.log(gradient.vice(screen));
	console.log(
		" " + gradient.cristal("by: Felipe Medeiros & Marcos Pastor"),
		" |  " + gradient.cristal("v0.1.1")
	);
	console.log();
	start();
});

async function start() {
	let appOra = ora("Iniciando aplicação").start(),
		controllerBot = new BotBlazeWithTelegram({
			maxGales: 2,
			enterProtection: true,
			sticker: {
				win: "win.jpg",
				winGale: "win-in-gale.jpg",
				winWhite: "win-white.jpg",
				loss: "loss.jpg",
			},
			timeAfterWin: {
				time: 1,
				message: "🔎 <b>Analisando possível entrada...</b>",
			},
			timeAfterLoss: {
				time: 2,
				message: "🔎 <b>Analisando o loss...</b>",
			},
			messageEnterBet: (
				current,
				protection,
				maxGales,
				lastRoll,
				recents,
				cb
			) => {
				const message = [];
				message.push(`🔥 <b>SINAL ENCONTRADO</b> 🔥\n`);
				message.push(
					`🚥 <b>Entrada para:</b> ${getColorNameOrEmoticon(current.color, {
						emoticon: true,
					})} ${
						protection
							? `+ ${getColorNameOrEmoticon(0, { emoticon: true })}`
							: ""
					}\n`
				);
				message.push(
					`🚨 <b>Entrada após:</b> ${getColorNameOrEmoticon(lastRoll.color, {
						emoticon: true,
					})} ${lastRoll.roll}`
				);
				if (maxGales)
					message.push(`✳️ Realizar até <b>${maxGales} Martingale(s)</b>.`);
				message.push(`⚠️ Fique atento ao gerenciamento de banca!`);
				message.push(`🚷 Não entre contra tendência!\n`);
				message.push(
					`▶️ <b>Iniciar apostas:</b> <a href="https://blaze.com/${
						process.env.REF ? "r/" + process.env.REF : ""
					}">blaze.com/pt/games/double</a>`
				);
				return message.join("\n");
			},
			messageOfGale: (current, betplayed, gale, cb) => {
				const message = [];
				message.push(`📍ATENÇÃO📍\n`);
				message.push(`Bora fazer o ${gale.sequence + 1}º gale!`);
				return message.join("\n");
			},
			messageWin: (current, betplayed, protection, cb) => {
				const message = [];
				message.push(`🔰 RESULTADO DO GIRO 🔰\n`);
				message.push(
					`🔸 <b>Entrada:</b> ${getColorNameOrEmoticon(betplayed.color, {
						emoticon: true,
					})} ${
						protection
							? `+ ${getColorNameOrEmoticon(0, { emoticon: true })}`
							: ""
					}`
				);
				message.push(
					"🔹 <b>Resultado:</b> " +
						getColorNameOrEmoticon(current.color, { emoticon: true })
				);
				return message.join("\n");
			},
			messageLoss: (current, betplayed, protection, cb) => {
				const message = [];
				message.push(`🔰 RESULTADO DO GIRO 🔰\n`);
				message.push(
					`🔸 <b>Entrada:</b> ${getColorNameOrEmoticon(betplayed.color, {
						emoticon: true,
					})} ${
						protection
							? `+ ${getColorNameOrEmoticon(0, { emoticon: true })}`
							: ""
					}`
				);
				message.push(
					"🔹 <b>Resultado:</b> " +
						getColorNameOrEmoticon(current.color, { emoticon: true })
				);
				return message.join("\n");
			},
			summaryOfResult: {
				interval: random(2, 5),
				message: (number) => {
					const message = [];
					message.push(`🔰 <b>ESTATÍSTICAS</b> 🔰\n`);
					message.push(`🔔 <b>Entradas:</b> ${number.total}`);
					message.push(`✅ <b>Wins Seguidos:</b> ${number.consecutive}`);
					message.push(`✅ <b>Wins:</b> ${number.win}`);
					message.push(`❌ <b>Losses:</b> ${number.loss}`);
					message.push(`⚪️ <b>Brancos:</b> ${number.white}`);
					message.push(
						`➡️ <b>Assertividade:</b> ${(
							(number.win / number.total) *
							100
						).toFixed(2)}%`
					);

					return message.join("\n");
				},
			},
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
