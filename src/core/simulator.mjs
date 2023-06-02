import chalk from "chalk";
import { appConfig } from "../util/index.mjs";

export class Simulator {
	constructor(protection) {
		this.protection = protection;

		this.minimumBetAmount = Number(appConfig("minimumBetAmount", 1.1));

		this.multipleBetColor = Number(appConfig("multipleBetColor", 2));
		this.multipleBetWhite = Number(appConfig("multipleBetWhite", 14));

		this.initialBalance = Number(appConfig("initialBalance", 50));
		this.currentBalance = this.initialBalance;

		this.initialBetColor = Number(appConfig("initialBetColor", 5.1));
		this.currentBetColor = this.initialBetColor;

		this.initialBetWhite = Number(appConfig("initialBetWhite", 1.1));
		this.currentBetWhite = this.initialBetWhite;

		this.pauseBet = false;

		this.galeStep = 0;
	}

	instanceAutoBet(autoBet) {
		this.autoBet = autoBet;
	}

	setInitialData(data) {
		this.initialBalance = data?.balance;
		this.currentBalance = data?.balance;

		this.initialBetColor = data?.initialBetColor || 2.2;
		this.currentBetColor = this.initialBetColor;

		this.initialBetWhite = data?.initialBetWhite || 1.1;
		this.currentBetWhite = this.initialBetWhite;

		console.log(
			chalk.cyan(`[${new Date().toLocaleString()}]`),
			chalk.yellow("AutoBet:"),
			`Banca inicial: ${chalk.yellow(`R$${data?.balance.toFixed(2)}`)}`
		);
		console.log(
			chalk.cyan(`[${new Date().toLocaleString()}]`),
			chalk.yellow("AutoBet:"),
			`Aposta inicial: [cor: ${chalk.yellow(`R$${data?.initialBetColor.toFixed(2)}`)} | branco: ${chalk.yellow(`R$${data?.initialBetWhite.toFixed(2)}`)}]`
		);

		const stopLoss = this.initialBalance * Number(appConfig("stopLoss", 0.15));
		console.log(
			chalk.cyan(`[${new Date().toLocaleString()}]`),
			chalk.yellow("AutoBet:"),
			`Stop Loss: ${chalk.yellow(`R$${stopLoss.toFixed(2)}`)}`
		);

		const stopWin = this.initialBalance * Number(appConfig("stopWin", 1.5));
		console.log(
			chalk.cyan(`[${new Date().toLocaleString()}]`),
			chalk.yellow("AutoBet:"),
			`Stop Win: ${chalk.yellow(`R$${stopWin.toFixed(2)}`)}`
		);
	}

	async makeBet(color, isGale) {
		if (this.pauseBet) {
			console.log(
				chalk.cyan(`[${new Date().toLocaleString()}]`),
				chalk.yellow("AutoBet:"),
				`Aposta pausada!`
			);
			return;
		}

		if (isGale) {
			this.galeStep++;

			if (this.protection) {
				// this.currentBetColor = this.currentBetColor * this.multipleBetColor + this.currentBetWhite;
				// let valueBetWhite = this.currentBetColor / this.multipleBetWhite * this.multipleBetColor;
				// this.currentBetWhite = valueBetWhite < this.minimumBetAmount ? this.minimumBetAmount : valueBetWhite;
				this.currentBetWhite *= 2;
				this.currentBetColor = this.currentBetColor * 2 + this.currentBetWhite;
			} else {
				this.currentBetColor *= 2;
			}
		}

		try {
			setTimeout(async () => {
				await this.autoBet.placeBet(this.currentBetColor, color);
				this.currentBalance -= this.currentBetColor;
				if (this.protection) {
					await this.autoBet.placeBet(this.currentBetWhite, 0);
					this.currentBalance -= this.currentBetWhite;
				}

				console.log(
					chalk.cyan(`[${new Date().toLocaleString()}]`),
					chalk.yellow("AutoBet:"),
					`Nova aposta: [cor: ${chalk.yellow(`R$${this.currentBetColor.toFixed(2)}`)}${this.protection ? ` | branco: ${chalk.yellow(`R$${this.currentBetWhite.toFixed(2)}`)}` : ""}]`
				);

				console.log(
					chalk.cyan(`[${new Date().toLocaleString()}]`),
					chalk.yellow("AutoBet:"),
					`Banca atual: ${this.currentBalance.toFixed(2) <= 0 ? chalk.red(`R$${this.currentBalance.toFixed(2)}`) : chalk.green(`R$${this.currentBalance.toFixed(2)}`)}`
				);
			}, (!isGale ? 3 : 15) * 1000);
		} catch (error) {
			return { status: "error", message: error };
		}
	}

	async storeResult(type) {
		if (this.pauseBet) return;

		if (type === "loss") {
			this.totalLosses++;

			const stopLoss = this.initialBalance * Number(appConfig("stopLoss", 0.15));
			if (this.currentBalance <= stopLoss && !this.pauseBet) {
				this.pauseBet = true;
				console.log(
					chalk.cyan(`[${new Date().toLocaleString()}]`),
					chalk.yellow("AutoBet:"),
					`Stop Loss atingido!`
				);

				const stopLossTime = appConfig('stopLossTime', 5);
				setTimeout(async () => {
					this.setInitialData({
						balance: this.currentBalance,
						initialBetColor: Number(appConfig("initialBetColor", 5.1)),
						initialBetWhite: Number(appConfig("initialBetWhite", 1.1))
					});
					console.log(
						chalk.cyan(`[${new Date().toLocaleString()}]`),
						chalk.yellow("AutoBet:"),
						`Stop Loss desativado!`
					);

					// Remove a proteção caso o stop loss seja atingido
					this.pauseBet = false;
				}, stopLossTime * (60 * 1000));
			}
		} else {
			const profit =
				type !== "white" ? this.currentBetColor * 2 : this.currentBetWhite * 14;
			this.currentBalance += profit;
			console.log(
				chalk.cyan(`[${new Date().toLocaleString()}]`),
				chalk.yellow("AutoBet:"),
				`Profit: ${profit.toFixed(2) <= 0 ? chalk.red(`R$${profit.toFixed(2)}`) : chalk.green(`R$${profit.toFixed(2)}`)}`
			);

			const stopWin = this.initialBalance * Number(appConfig("stopWin", 1.5));
			if (this.currentBalance >= stopWin && !this.pauseBet) {
				this.pauseBet = true;
				console.log(
					chalk.cyan(`[${new Date().toLocaleString()}]`),
					chalk.yellow("AutoBet:"),
					`Stop Win atingido!`
				);

				const stopWinTime = appConfig('stopWinTime', 5);
				setTimeout(async () => {
					this.setInitialData({
						balance: this.currentBalance,
						initialBetColor: Number(appConfig("initialBetColor", 5.1)),
						initialBetWhite: Number(appConfig("initialBetWhite", 1.1))
					});
					console.log(
						chalk.cyan(`[${new Date().toLocaleString()}]`),
						chalk.yellow("AutoBet:"),
						`Stop Win desativado!`
					);
					this.pauseBet = false;
				}, stopWinTime * (60 * 1000));
			}
		}

		console.log(
			chalk.cyan(`[${new Date().toLocaleString()}]`),
			chalk.yellow("AutoBet:"),
			`Banca atual: ${this.currentBalance.toFixed(2) <= 0 ? chalk.red(`R$${this.currentBalance.toFixed(2)}`) : chalk.green(`R$${this.currentBalance.toFixed(2)}`)}`
		);
		this.resetBet();
	}

	async reloadBalance() {
		await this.autoBet.balance();
		this.currentBalance = Number(this.autoBet.wallet?.balance || 0);
	}

	resetBet() {
		this.currentBetColor = this.initialBetColor;
		this.currentBetWhite = this.initialBetWhite;
		this.galeStep = 0;
	}
}
