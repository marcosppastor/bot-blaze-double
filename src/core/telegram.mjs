import ora from "ora";
import { Telegraf } from "telegraf";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { readFileSync } from "node:fs";
import { EnvironmentVariablesError } from "../error/index.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class Telegram {
	constructor() {
		if (!process.env.BOT_TOKEN)
			throw new EnvironmentVariablesError("BOT_TOKEN");
		if (process.env.BOT_TOKEN.split(":").length !== 2)
			throw new EnvironmentVariablesError("BOT_TOKEN INVALID");

		this.status = "pause";
		this.client = new Telegraf(process.env.BOT_TOKEN);

		this.messageInfoBot = [
			"🤖 <b>Bot Info:</b> \n",
			`<b>Author:</b> Felipe Medeiros`,
			`<b>Instagram:</b> <a href="https://instagram.com/fmedeiros95">@fmedeiros95</a>\n`,
			"🔭 Aproveite todos meus serviços nos canais.",
		];
	}
	async start() {
		var startingOra = ora("Iniciando BOT...").start();
		try {
			await this.client.launch();
			this.status = "on";

			startingOra.succeed("Bot iniciado com sucesso!");

			this.client.use(async (ctx, next) => {
				let { type, id } = await ctx.getChat();

				if (type === "private") {
					await ctx.deleteMessage();
					await ctx.telegram.sendMessage(
						id,
						`⚠️ Não é possivel enviar mensagem privada`
					);
					// await ctx.telegram.sendMessage(id, this.messageInfoBot.join("\n"), {
					// 	parse_mode: "HTML",
					// });
					return;
				}

				return next();
			});

			this.client.on("message", (ctx) => console.log("GroupId:", ctx.chat.id));

			process.once("SIGINT", () => this.client.stop("SIGINT"));
			process.once("SIGTERM", () => this.client.stop("SIGTERM"));
		} catch (err) {
			startingOra.fail("Erro ao startar bot");
			throw new Error(`erro ao startar bot: [${err.message}]`);
		}
	}
	async send(message, clientId, options = { parse_mode: "HTML" }) {
		if (this.status !== "on")
			return { status: "error", message: "bot ainda não foi startado!" };
		if (!message || !clientId)
			return {
				status: "error",
				message: "mensagem e id do chat são argumentos obrigatorios",
			};

		try {
			if (typeof clientId === "object" && Array.isArray(clientId)) {
				for (let index = 0; index < clientId.length; index++) {
					await this.client.telegram.sendMessage(
						clientId[index],
						message,
						options
					);
				}
			} else if (typeof clientId === "string") {
				try {
					await this.client.telegram.sendMessage(clientId, message, options);
				} catch (e) {
					console.log(e);
				}
			} else {
				return {
					status: "error",
					message: "chat id deve ser uma string ou um array de string",
				};
			}
		} catch (err) {
			return { status: "error", message: "erro ao enviar mensagem" };
		}

		return { status: "success", message: "mensagem enviada com sucesso" };
	}
	async sendSticker(sticker, clientId) {
		if (this.status !== "on")
			return { status: "error", message: "bot ainda não foi startado!" };
		if (!sticker || !clientId)
			return {
				status: "error",
				message: "sticker e id do chat são argumentos obrigatorios",
			};

		let file = resolve(__dirname, "../", "../", "sticker", sticker);
		try {
			readFileSync(file);
		} catch (err) {
			return { status: "error", message: "sticker não existe" };
		}

		try {
			if (typeof clientId === "object" && Array.isArray(clientId)) {
				for (let index = 0; index < clientId.length; index++) {
					await this.client.telegram.sendSticker(clientId[index], {
						source: readFileSync(file),
					});
				}
			} else if (typeof clientId === "string") {
				try {
					await this.client.telegram.sendSticker(clientId, {
						source: readFileSync(file),
					});
				} catch (e) {
					console.log(e);
				}
			} else {
				return {
					status: "error",
					message: "chat id deve ser uma string ou um array de string",
				};
			}
		} catch (err) {
			return { status: "error", message: "erro ao enviar sticker" };
		}

		return { status: "success", message: "sticket enviado com sucesso" };
	}
	close() {
		this.client.stop();

		console.log("telegram closed successful");
	}
	getColorNameOrEmoticon(color, emoticon = false, pt = false) {
		if (color === 0) return emoticon ? "⚪️" : pt ? "branco" : "white";
		if (color === 1) return emoticon ? "🔴" : pt ? "vermelho" : "red";
		if (color === 2) return emoticon ? "⚫" : pt ? "preto" : "black";

		return "";
	}
}
