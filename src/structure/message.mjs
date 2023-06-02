import { isNumber, isObject, isString } from "../util/validations.mjs";

export class Messages {
	message;
	time;

	constructor(message, time) {
		this.message = message;

		this.time = isNumber(time) ? time : 3;
	}

	_extractOfOption(param) {
		if (isNumber(param)) this.time = param;
		if (isString(param)) this.message = param;
		if (isObject(param)) {
			if (param.time && isNumber(param.time)) this.time = param.time;
			if (param.message && isString(param.message))
				this.message = param.message;
		}

		return { message: this.message, time: this.time };
	}
}
