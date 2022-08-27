import chalk from 'chalk';
import figures from 'figures';
import fs from 'fs-extra';
import prompts from 'prompts';
import {
	chromium
} from 'playwright';

import Configuration from './lib/Config.js';
import Task from './lib/Task.js';

const config = new Configuration();
const {
	Depth,
	MimeTypes,
	Output,
} = config;
if (!Array.isArray(config.Urls) || !config.Urls.length) {
	console.error(chalk.red(chalk.bgRed.black('Error:') + ' urls not an array or are empty!'));
	process.exit(0);
}

(async () => {
	var p = await prompts({
		type: 'select',
		name: 'urls',
		message: 'Choose URL',
		choices: [{
				title: 'All',
				value: config.Urls,
			},
			...config.Urls.map(url => ({
				title: url,
				value: [url],
			})),
		],
	});
	config.Urls = p.urls;

	const Browser = await chromium.launch();
	const Storage = new Map();

	for (var Url of config.Urls) {
		Url = new URL(Url);
		let n = new Task({
			Browser,
			Depth,
			MimeTypes,
			Output,
			Storage,
			Url,
		});
		await n.run();
	}

	await Browser.close();
})();
