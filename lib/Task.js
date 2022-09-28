import chalk from 'chalk';
import figures from 'figures';
import fs from 'fs-extra';
import path from 'path';
import {decode} from 'html-entities';

export default class Task {
	constructor(config) {
		var {
			Browser,
			Depth,
			MimeTypes,
			Output,
			Storage,
			Url,
		} = config;
		this.Browser = Browser;
		this.Children = new Map();
		this.Depth = Depth;
		this.MimeTypes = MimeTypes;
		this.Output = Output;
		this.Storage = Storage;
		this.Url = Url;
	}

	extractAnchors(body, base) {
		const ret = [];
		const anchor = /<a [^>]+>/gm;
		const href = /href=["']([^"']+)["']/i;
		var result = null;
		while (result = anchor.exec(body)) {
			let [m] = result;
			let [, link] = m.match(href) ?? [];

			if (link) {
				link = decode(link);
				link = new URL(link, base);
				if (link.origin == base) {
					ret.push(link);
				}
			}
		}
		return ret;
	}

	async handleResponse(rsp) {
		var parent = this.Url;
		var headers = rsp.headers();
		var status = rsp.status();
		var url = new URL(rsp.url());
		var [type] = String(headers['content-type']).split(';');

		if (parent.hostname == url.hostname) {
			if (status >= 200 && status < 300) {
				let info = path.parse(url.pathname);

				if (this.MimeTypes.includes(type)) {
					let body = await rsp.body();
					if (!this.Storage.has(String(url))) {
						this.Storage.set(String(url), true);
						this.write(url, body);
						console.log(chalk.greenBright(figures.tick) + ' ' + String(url));
					}

					if (String(parent) == String(url)) {
						if (this.Depth > 0) {
							let anchors = this.extractAnchors(body, url.origin);
							for (var a of anchors) {
								if (!this.Children.has(String(a))) {
									this.Children.set(String(a), {
										Browser: this.Browser,
										Depth: this.Depth - 1,
										MimeTypes: this.MimeTypes,
										Storage: this.Storage,
										Output: this.Output,
										Url: a,
									});
								}
							}
						}
					}
				} else {
					console.log(chalk.redBright(figures.cross) + ' ' + String(url));
				}
			}
		}
	}

	async run() {
		return new Promise(async (resolve, reject) => {
			this.Page = await this.Browser.newPage();
			this.Page.on('crash', reject);
			this.Page.on('response', (rsp) => {
				this.handleResponse(rsp);
			});
			var url = String(this.Url);
			if (!this.Storage.has(url)) {
				await this.Page.goto(url, {
					waitUntil: 'networkidle',
					timeout: 60 * 1000,
				});
			}
			await this.Page.close();

			var entries = this.Children.entries();
			for (let [k, v] of entries) {
				v = new Task(v);
				await v.run();
			}

			resolve();
		});
	}

	async write(url, body) {
		let {
			pathname
		} = url;
		if (pathname == '/') {
			pathname = '/index.html';
		}
		pathname = decodeURIComponent(pathname);
		let out = path.join(this.Output, url.hostname, pathname);
		out = path.resolve(out);
		await fs.outputFile(out, body);
	}
};
