export async function $(element, selector) {
	await waitForSelector(element, selector);
	return element.$(selector);
}

export async function $$(element, selector) {
	await waitForSelector(element, selector);
	return element.$$(selector);
}

export async function $eval(element, selector, callback, params = {}) {
	return _genericEval('$eval', element, selector, callback, params);
}

export async function $$eval(element, selector, callback, params = {}) {
	return _genericEval('$$eval', element, selector, callback, params);
}

export async function _genericEval(method, element, selector, callback, params = {}) {
	await waitForSelector(element, selector);
	return element[method](selector, callback, params);
}

export async function waitForSelector(element, selector) {
	for (let i = 0; i < 3; i++) {
		try {
			await element.waitForSelector(selector, {
				timeout: 1500,
			});
			return;
		} catch (e) {
			await new Promise((resolve) => setTimeout(resolve, 1500));
		}
	}
}

/**
 * Chunk an array
 * @param arr  - The array to chunk
 * @param size - The size of the chunk
 * @returns - The chunked array
 */
export function chunk(arr, size) {
	let chunked_arr = [];
	let index = 0;

	while (index < arr.length) {
		const chunk = arr.slice(index, size + index);
		chunked_arr.push(chunk);
		index += size;
	}

	return chunked_arr;
}

export function generic_log(message, type = 'INFO', { bot_name, file, url }) {
	const date = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');

	const string = [];
	string.push(`[${type}]`);
	string.push(`[${date}]`);
	if (bot_name) string.push(`[${bot_name}]`);
	if (file) string.push(`[${file}]`);
	if (url) string.push(`[${url}]`);
	string.push(message);
	console.log(string.join(' '));
}

export function log(message, { bot_name, file, url }) {
	generic_log(message, 'INFO', { bot_name, file, url });
}

export function error(message, { bot_name, file, url }) {
	generic_log(message, 'ERROR', { bot_name, file, url });
}

export default {
	$,
	$$,
	$eval,
	$$eval,
	waitForSelector,
	chunk,
	log,
	error,
};
