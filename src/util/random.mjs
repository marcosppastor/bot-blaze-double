import { isArray } from "./validations.mjs";

export function randomArray(array) {
	return isArray(array) ? array[random(array.length)] : null;
}

export function random(max, min = 0) {
	return Math.floor(Math.random() * (max - min) + min);
}
