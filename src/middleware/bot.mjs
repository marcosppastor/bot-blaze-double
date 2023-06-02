import {
	Analise,
	BlazeCore,
	Telegram,
	Simulator,
	AutoBet,
} from "../core/index.mjs";
import chalk from "chalk";
import { question } from "readline-sync";
import {
	appConfig,
	setVariable,
	isNumber,
	isString,
	random,
	isFunction,
	getColorNameOrEmoticon,
	verifyBetTrend,
} from "../util/index.mjs";
import {
	StaticMessageEnterBet,
	StaticMessageGale,
	StaticMessageWinAndLoss,
} from "../static/index.mjs";
import { Messages } from "../structure/index.mjs";
import * as fs from "fs";
import * as path from "path";

const { ID_GROUP_MESSAGE, URL_BLAZE, BASE_URL, BOT_TOKEN, BLAZE_TOKEN } = process.env;

export class BotBlazeWithTelegram {
	constructor(options) {
		if (!URL_BLAZE) {
			let VALUE = question(
				`${chalk.red("[!required]")} Digite URL WSS da blaze: [${chalk.cyan(
					"wss://api-v2.blaze.com/replication/?EIO=3&transport=websocket"
				)}] `,
				{
					defaultInput:
						"wss://api-v2.blaze.com/replication/?EIO=3&transport=websocket",
					validate: (value) =>
						value.indexOf("wss://") && value.match(/blaze.com/g),
				}
			);

			setVariable("URL_BLAZE", VALUE);
		}

		if (!BASE_URL) {
			let VALUE = question(
				`${chalk.red("[!required]")} Digite URL HTTP da blaze: [${chalk.cyan(
					"https://blaze.com"
				)}] `,
				{
					defaultInput: "https://blaze.com",
					validate: (value) =>
						value.indexOf("https://") && value.match(/blaze.com/g),
				}
			);

			setVariable("BASE_URL", VALUE);
		}

		if (!BOT_TOKEN) {
			let VALUE = question(
				`${chalk.red("[!required]")} Token do BOT TELEGRAM: [${chalk.cyan(
					"00000000:ad4f6a77..."
				)}] `,
				{
					validate: (value) => value.split(/:/g).length === 2,
				}
			);

			setVariable("BOT_TOKEN", VALUE);
		}

		if (!ID_GROUP_MESSAGE) {
			let VALUE = question(
				`${chalk.red(
					"[!required]"
				)} ID GRUP/CHANNEL/CHAT que ira receber os sinais: [${chalk.cyan(
					"-999999999"
				)}] `,
				{
					validate: (value) => value,
				}
			);

			setVariable("ID_GROUP_MESSAGE", VALUE);
		}

		if (!BLAZE_TOKEN) {
			let VALUE = question(
				`${chalk.red(
					"[!required]"
				)} Token JWT para integração com a blaze: [${chalk.cyan(
					"eyJhbG..........eyJpZC....XJTW..."
				)}] `,
				{
					validate: (value) => value,
				}
			);

			setVariable("BLAZE_TOKEN", VALUE);
		}

		if (isString(options.refBlaze)) setVariable("REF", options.refBlaze);
		else setVariable("REF", process.env.REF);

		this.telegram = new Telegram();
		this.blaze = new BlazeCore();
		this.analise = new Analise();
		this.simulator = new Simulator(Boolean(appConfig("enterProtection"))); // options.enterProtection
		this.autobet = new AutoBet();

		this._loadSummary();

		this.gale = {
			sequence: 0,
			phase: "pause",
		};

		this.options = options;

		this.bet = {
			phase: "pause",
			jump: null,
			color: null,
			roll: null,
			id: null,
		};

		this.cb = (message) =>
			this.telegram.send(message, process.env.ID_GROUP_MESSAGE);
		if (Boolean(options?.summaryOfResult)) {
			this._summary({
				send: { rule: Number(options?.summaryOfResult.interval || 1) },
			});
		}
	}
	async run() {
		this.blaze.start();
		await this.telegram.start();
		await this.autobet.start();

		if (Boolean(appConfig('allowAutoBet', false))) {
			// Set initial data for the simulator
			this.simulator.setInitialData({
					balance: parseFloat(this.autobet.wallet?.balance || 0),
					initialBetColor: Number(appConfig('initialBetColor', 5.1)),
					initialBetWhite: Number(appConfig('initialBetWhite', 1.1))
			});
		}

		// Instance AutoBet with simulator
		this.simulator.instanceAutoBet(this.autobet);

		this.blaze.ev.on("game_waiting", (data) => {
			console.log(
				chalk.cyan(`[${new Date().toLocaleString()}]`),
				chalk.yellow("Status:"),
				"Jogadores apostando..."
			);
			this._summary({ verifyDate: true });
		});

		this.blaze.ev.on("game_rolling", async (data) => {
			data &&
				console.log(
					chalk.cyan(`[${new Date().toLocaleString()}]`),
					chalk.yellow("Status:"),
					// "Girando... Resultado:",
					"Resultado:",
					`[cor: ${chalk.yellow(
						getColorNameOrEmoticon(data.color, { pt: true })
					)} - número: ${chalk.yellow(data.roll)}]`
				);
			this._summary({ verifyDate: true });

			data && this._saveResult(data);

			data && (await this.invokeResult(data));
		});

		this.blaze.ev.on("game_complete", async (data) => {
			data &&
				console.log(
					chalk.cyan(`[${new Date().toLocaleString()}]`),
					chalk.yellow("Status:"),
					"Giro finalizado!"
				);
			this._summary({ verifyDate: true });

			data && (await this.invokeAnalyst(data));
		});
	}
	async invokeAnalyst(lastRoll) {
		if (this.bet.jump) {
			return { status: "jump" };
		}

		let { status, response, error } = await this.blaze.recents();
		if (!status || !response) {
			return { status: "error", message: error };
		}

		let { verify, last, recents } = this.analise.last({
			status: true,
			response,
		});

		if (verify) {
			if (this.bet.color === null) {
				const isBetTrend = await verifyBetTrend(last.color);
				if (isBetTrend) {
					console.log(
						chalk.cyan(`[${new Date().toLocaleString()}]`),
						chalk.yellow("Status:"),
						chalk.red('Identificado contra tendência!')
					);
					return;
				}

				this._updateBet("bet", true, last.color, last.roll, last.id);

				this.simulator.makeBet(last.color, false);
				if (isFunction(this.options?.messageEnterBet)) {
					return this.telegram.send(
						new Messages(
							this.options.messageEnterBet(
								last,
								this.options.enterProtection,
								this.options.maxGales,
								lastRoll,
								recents,
								this.cb
							)
						).message,
						process.env.ID_GROUP_MESSAGE
					);
				}

				return this.telegram.send(
					new Messages(
						StaticMessageEnterBet(
							last,
							this.options.enterProtection,
							this.options.maxGales,
							lastRoll,
							recents
						)
					).message,
					process.env.ID_GROUP_MESSAGE
				);
			}
		}
	}

	async invokeResult(data) {
		let { color } = data;

		if (typeof color !== "undefined" && this.bet.color !== null) {
			if (
				color === this.bet.color ||
				(this.options.enterProtection && color === 0)
			) {
				let sticker = this._getStickerOfOptions(
					color === 0 ? "white" : this.bet.phase
				);
				let message;

				if (color !== 0) this.simulator.storeResult("color");
				else this.simulator.storeResult("white");

				if (sticker) {
					await this.telegram.sendSticker(
						sticker,
						process.env.ID_GROUP_MESSAGE
					);
				}

				if (isFunction(this.options?.messageWin)) {
					message = new Messages(
						this.options.messageWin(
							data,
							this.bet,
							this.options.enterProtection,
							this.cb
						)
					);
				} else {
					message = new Messages(
						StaticMessageWinAndLoss(
							data,
							this.bet,
							this.options.enterProtection
						)
					);
				}

				await this.telegram.send(message.message, process.env.ID_GROUP_MESSAGE);

				if (this.options.timeAfterWin) {
					let { timeAfterWin } = this.options;
					let { message, time } = new Messages()._extractOfOption(timeAfterWin);

					this._timeNextBetSafe(time);
					if (isString(message)) {
						await this.telegram.send(message, process.env.ID_GROUP_MESSAGE);
					}
				}

				this._gale({ sequence: "reset" });
				this._summary({
					status: color === 0 ? "white" : this.bet.phase,
					send: { sequence: "add" },
				});
				this.options.timeAfterWin
					? this._updateBet("safe", true, null, null, null)
					: this._resetBet();
			} else {
				let message;

				if (this.bet.phase === "bet") {
					if (!this.options?.maxGales) {
						this._updateBet("loss");
						return this.invokeResult(data);
					}

					if (isFunction(this.options?.messageOfGale)) {
						message = new Messages(
							this.options.messageOfGale(data, this.bet, this.gale, this.cb)
						);
					} else {
						message = new Messages(
							StaticMessageGale(data, this.bet, this.gale)
						);
					}

					this.simulator.makeBet(this.bet.color, true);

					await this.telegram.send(
						message.message,
						process.env.ID_GROUP_MESSAGE
					);
					this._gale({ sequence: "add" });
					this._updateBet("gale");
				} else if (this.bet.phase.indexOf("gale") === 0) {
					if (this.gale.sequence >= this.options.maxGales) {
						this._updateBet("loss");
						return this.invokeResult(data);
					}

					if (isFunction(this.options?.messageOfGale)) {
						message = new Messages(
							this.options.messageOfGale(data, this.bet, this.gale, this.cb)
						);
					} else {
						message = new Messages(
							StaticMessageGale(data, this.bet, this.gale)
						);
					}

					const isBetTrend = await verifyBetTrend(this.bet.color);
					if (!isBetTrend) {
						this.simulator.makeBet(this.bet.color, true);
					} else {
						console.log(
							chalk.cyan(`[${new Date().toLocaleString()}]`),
							chalk.yellow("Status:"),
							chalk.red('Gale não executado, pois entrou em "tendência" da cor contrária.')
						);
					}


					await this.telegram.send(
						message.message,
						process.env.ID_GROUP_MESSAGE
					);
					this._gale({ sequence: "add" });
				} else {
					this.simulator.storeResult("loss");

					let sticker = this._getStickerOfOptions("loss");
					if (sticker) {
						await this.telegram.sendSticker(
							sticker,
							process.env.ID_GROUP_MESSAGE
						);
					}

					if (isFunction(this.options?.messageLoss)) {
						message = new Messages(
							this.options.messageLoss(
								data,
								this.bet,
								this.options.enterProtection,
								this.cb
							)
						);
					} else {
						message = new Messages(
							StaticMessageWinAndLoss(
								data,
								this.bet,
								this.options.enterProtection
							)
						);
					}

					if (this.options.timeAfterLoss) {
						let { timeAfterLoss } = this.options;
						let { message, time } = new Messages()._extractOfOption(
							timeAfterLoss
						);

						this._timeNextBetSafe(time);
						if (isString(message)) {
							await this.telegram.send(message, process.env.ID_GROUP_MESSAGE);
						}
					}

					await this.telegram.send(
						message.message,
						process.env.ID_GROUP_MESSAGE
					);
					this._gale({ sequence: "reset" });
					this._summary({ status: "loss", send: { sequence: "add" } });
					this.options.timeAfterLoss
						? this._updateBet("safe", true, null, null, null)
						: this._resetBet();
				}
			}
		}
	}

	_resetBet() {
		this.bet = {
			phase: "pause",
			jump: null,
			color: null,
			roll: null,
			id: null,
		};
	}

	_updateBet(phase, jump, color, roll, id) {
		if (typeof phase !== "undefined") this.bet.phase = phase;
		if (typeof jump !== "undefined") this.bet.jump = jump;
		if (typeof color !== "undefined") this.bet.color = color;
		if (typeof roll !== "undefined") this.bet.roll = roll;
		if (typeof id !== "undefined") this.bet.id = id;
	}

	_timeNextBetSafe(minute = Math.floor(Math.random() * 3 + 1)) {
		setTimeout(() => this._resetBet(), 6e4 * minute);
	}

	_getStickerOfOptions(phase) {
		if (Boolean(this.options && this.options.sticker)) {
			let { sticker } = this.options;
			let { loss, winGale, win, winWhite } = sticker;

			if (phase === "bet") return win;
			if (phase === "gale") return winGale;
			if (phase === "white") return winWhite;

			return loss;
		}

		return false;
	}

	_readSummary() {
		const currentDay = new Date().toJSON().slice(0, 10);
		const pathSummary = path.join("./summary", `${currentDay}.json`);
		try {
			let summary = fs.readFileSync(pathSummary, "utf8");
			return JSON.parse(summary);
		} catch (error) {
			return false;
		}
	}

	_saveSummary() {
		const currentDay = new Date().toJSON().slice(0, 10);
		const pathSummary = path.join("./summary", `${currentDay}.json`);
		fs.writeFileSync(pathSummary, JSON.stringify(this.summaryPlays, null, 2));
	}

	_loadSummary() {
		let summary = this._readSummary();
		if (summary) {
			this.summaryPlays = summary;
		} else {
			this.summaryPlays = {
				number: {
					total: 0,
					win: 0,
					loss: 0,
					gale: 0,
					white: 0,
					consecutive: 0,
				},
				info: {
					date: new Date(),
					lastUpdate: new Date().getTime(),
					day: new Date().getDate(),
				},
				send: {
					sequence: 0,
					rule: random(5, 2),
				},
			};
		}
	}

	_resetSummary(options) {
		if (options?.onlyInfo) {
			this.summaryPlays.info = {
				date: new Date(),
				day: new Date().getDate(),
				lastUpdate: new Date().getTime(),
			};
			this._saveSummary();
			return;
		}

		if (options?.onlyNumber) {
			Object.keys(this.summaryPlays.number).forEach((val) => {
				this.summaryPlays.number[val] = 0;
			});
			this._saveSummary();
			return;
		}

		this.summaryPlays.info = {
			date: new Date(),
			day: new Date().getDate(),
			lastUpdate: new Date().getTime(),
		};

		Object.keys(this.summaryPlays.number).forEach((val) => {
			this.summaryPlays.number[val] = 0;
		});

		this._saveSummary();
	}
	_summary(data) {
		if (
			data.verifyDate &&
			new Date().getDate() !== this.summaryPlays.info.day
		) {
			this._resetSummary();
		}

		if (data.send) {
			if (isNumber(data.send.rule)) this.summaryPlays.send.rule = data.send.rule;
			if (data.send?.sequence === "add") this.summaryPlays.send.sequence++;
			if (data.send?.sequence === "reset") this.summaryPlays.send.sequence = 0;
		}

		if (data.status) {
			this.summaryPlays.number.total++;

			if (data.status === "bet") {
				this.summaryPlays.number.win++;
				this.summaryPlays.number.consecutive++;
			}

			if (data.status.indexOf("gale") === 0) {
				this.summaryPlays.number.win++;
				this.summaryPlays.number.gale++;
				this.summaryPlays.number.consecutive++;
			}

			if (data.status === "white") {
				this.summaryPlays.number.win++;
				this.summaryPlays.number.consecutive++;
				this.summaryPlays.number.white++;
			}

			if (data.status === "loss") {
				this.summaryPlays.number.loss++;
				this.summaryPlays.number.consecutive = 0;
			}
		}

		if (this.options?.summaryOfResult && data.status) {
			if (this.summaryPlays.send.sequence == this.summaryPlays.send.rule) {
				if (isFunction(this.options.summaryOfResult.message)) {
					let cbSendCustom = (message) =>
						this.telegram.send(message, process.env.ID_GROUP_MESSAGE).then();
					let sendMessage = this.options.summaryOfResult.message(
						this.summaryPlays.number,
						this.summaryPlays.info,
						cbSendCustom
					);
					if (isString(sendMessage)) {
						this.telegram
							.send(sendMessage, process.env.ID_GROUP_MESSAGE)
							.then();
					}
				}
			}
		}

		if (this.summaryPlays.send.sequence >= this.summaryPlays.send.rule) {
			this._summary({ send: { sequence: "reset" } });
		}
		this._saveSummary();
	}

	_gale(options) {
		if (options?.sequence) {
			if (options.sequence === "add") {
				this.gale.sequence++;
				this.gale.phase = "gale " + this.gale.sequence;
			}
			if (options.sequence === "reset") {
				this.gale.sequence = 0;
				this.gale.phase = "off";
			}
		}
	}

	_saveResult(result) {
		result = {
			isRepeated: result?.isRepeated,
			id: result?.id,
			color: result?.color,
			roll: result?.roll,
			created_at: result?.created_at,
		};

		const currentDay = new Date().toJSON().slice(0, 10);
		const pathResult = path.join("./results", `${currentDay}.json`);

		if (!fs.existsSync(pathResult)) {
			fs.writeFileSync(pathResult, JSON.stringify([result], null, 2));
			return;
		}

		let resultOfTheDay = [];

		try {
			let result = fs.readFileSync(pathResult, "utf8");
			resultOfTheDay = JSON.parse(result);
		} catch (error) {
			resultOfTheDay = [];
		}

		resultOfTheDay.push(result);

		fs.writeFileSync(pathResult, JSON.stringify(resultOfTheDay, null, 2));
	}
}
