export class Analise {
	constructor() {
		this.rule = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
	}
	last(recents) {
		let { status, response } = recents;
		if (!status) {
			return { status: "error", message: "error" };
		}

		let lastNeed = response.slice(0, 16);
		let lastAccept = lastNeed[lastNeed.length - 1];
		return {
			status: "success",
			last: lastAccept,
			recents: response,
			verify: this.verify(lastAccept),
		};
	}
	verify(last) {
		let { roll } = last;

		return this.rule.includes(roll);
	}
}
