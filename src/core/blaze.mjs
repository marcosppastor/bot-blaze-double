import event from "node:events";
import ws from "ws";
import request from "request-promise";
import { EnvironmentVariablesError } from "../error/index.mjs";

export class BlazeCore {
	constructor() {
		this.temp = {
			isWaitingBefore: false,
			isRollingBefore: false,
			isCompleteBefore: false,
		};

		this.ev = new event.EventEmitter();
		this.socket;
	}
	start() {
		if (!process.env.URL_BLAZE || !process.env.BASE_URL) {
			throw new EnvironmentVariablesError("URL BLAZE or BASE_URL");
		}

		let [param0] = arguments;

		if (typeof param0 !== "object") {
			param0 = {};
		}

		let { timeoutSendingAliveSocket } = param0;

		let wss = new ws(process.env.URL_BLAZE, {
			origin: process.env.BASE_URL,
			headers: {
				Upgrade: "websocket",
				"Sec-Webscoket-Extensions":
					"permessage-defalte; client_max_window_bits",
				Pragma: "no-cache",
				Connection: "Upgrade",
				"Accept-Encoding": "gzip, deflate, br",
				"Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7,es;q=0.6",
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36",
			},
		});

		let interval = setInterval(() => {
			wss.send("2");
		}, timeoutSendingAliveSocket || 5000);

		wss.on("open", () => {
			this.onOpen(wss, this.ev);
		});

		wss.on("message", (data) => {
			this.onMessage(data, this.ev);
		});

		wss.on("close", (code, reason) => {
			if (code !== 4999) {
				setTimeout(() => this.start(), 2e3);
			} else {
				this.ev.emit("close", {
					code,
					reason: reason.toString(),
				});

				clearInterval(interval);
				this.ev.removeAllListeners();
				wss.close();
			}
		});

		this.socket = {
			ev: this.ev,
			closeSocket: () => {
				clearInterval(interval);
				wss.close(4999);
			},
			sendToSocket: (data) => {
				wss.send(data, () => { });
			},
		};
	}
	async recents() {
		try {
			let data = await request.get(
				process.env.BASE_URL + "/api/roulette_games/recent",
				{ json: true }
			);
			return { status: true, error: null, response: data };
		} catch (err) {
			return { status: false, error: err.message };
		}
	}

	onOpen(wss, ev) {
		wss.send('423["cmd",{"id":"subscribe","payload":{"room":"double"}}]');
		wss.send('423["cmd",{"id":"subscribe","payload":{"room":"double_v2"}}]');

		ev.emit("authenticated", { success: true });
	}

	onMessage(data, ev) {
		let msg = data.toString();

		let id;
		try {
			id = this._getString(msg, '"id":"', '"', 0);
		} catch (err) {
			id = "";
		}

		if (id == "double.tick" || id == "doubles.update") {
			let obj = msg.slice(2, msg.length);
			let { payload: json } = JSON.parse(obj)[1];
			let type = id.includes("update") ? "v1" : "v2";

			ev.emit(id, { type, ...json });

			if (json.status == "rolling") {
				if (!this.temp.isRollingBefore) {
					ev.emit("game_rolling", {
						type,
						isRepeated: this.temp.isRollingBefore,
						...json,
					});
					this._updateTemp("rolling");
				}
			} else if (json.status == "waiting") {
				if (!this.temp.isWaitingBefore) {
					ev.emit("game_waiting", {
						type,
						isRepeated: this.temp.isWaitingBefore,
						...json,
					});
					this._updateTemp("waiting");
				}
			} else {
				if (!this.temp.isCompleteBefore) {
					ev.emit("game_complete", {
						type,
						isRepeated: this.temp.isCompleteBefore,
						...json,
					});
					this._updateTemp("complete");
				}
			}
		}
	}
	_getString(string, start, end, i) {
		i++;
		var str = string.split(start);
		var str = str[i].split(end);
		return str[0];
	}
	_updateTemp(update) {
		if (update == "waiting") {
			this.temp.isWaitingBefore = true;
			this.temp.isRollingBefore = false;
			this.temp.isCompleteBefore = false;
		} else if (update == "rolling") {
			this.temp.isRollingBefore = true;
			this.temp.isWaitingBefore = false;
			this.temp.isCompleteBefore = false;
		} else if (update == "complete") {
			this.temp.isCompleteBefore = true;
			this.temp.isWaitingBefore = false;
			this.temp.isRollingBefore = false;
		}
	}
}
