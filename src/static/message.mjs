import { getColorNameOrEmoticon } from "../util/index.mjs";

export const StaticMessageEnterBet = (current, protection) => {
	return (
		"🔎 <b>SINAL ENCONTRADO:</b>\n" +
		`\nENTRE NO ${getColorNameOrEmoticon(current.color, {
			emoticon: true,
		})} ${getColorNameOrEmoticon(current.color, { pt: true, upper: true })}` +
		`\nPROTEJA NO ${getColorNameOrEmoticon(0, {
			emoticon: true,
		})} ${getColorNameOrEmoticon(0, { pt: true, upper: true })}` +
		`\n\n<pre>https://blaze.com/${
			process.env.REF ? "r/" + process.env.REF : ""
		}</pre>`
	);
};

export const StaticMessageWinAndLoss = (
	current,
	betplayed,
	protection,
	recents
) => {
	return (
		`🔸 ENTRAMOS NO ${getColorNameOrEmoticon(betplayed.color, {
			emoticon: true,
		})}` +
		`\n🔹 RESULTADO FOI ${getColorNameOrEmoticon(current.color, {
			emoticon: true,
		})}`
	);
};

export const StaticMessageGale = (current, betplayed, gale) => {
	return (
		`⚠️ <b>ENTROU PRA GALE ${gale.sequence + 1}:</b>\n` +
		`\nENTRE NO ${getColorNameOrEmoticon(betplayed.color, {
			emoticon: true,
		})} ${getColorNameOrEmoticon(betplayed.color, {
			pt: true,
			upper: true,
		})}` +
		`\nPROTEJA NO ${getColorNameOrEmoticon(0, {
			emoticon: true,
		})} ${getColorNameOrEmoticon(0, { pt: true, upper: true })}`
	);
};
