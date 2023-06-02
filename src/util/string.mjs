export function startWith(string, search, position, match = false) {
	if (position > string.length) position = string.length;
	if (position < 0) position = search.length;

	let sub = String(string).substring(string.length - position, string.length);

	return match
		? Boolean(sub.includes(search))
		: Boolean(sub.indexOf(search) === 0);
}
