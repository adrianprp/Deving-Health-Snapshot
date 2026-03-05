'use strict';
import fetch from 'node-fetch';
import pLimit from 'p-limit';
import https from 'https';

export class GitLabService {
	constructor(url, token) {
		this.url = new URL(url);
		this.headers = { 
			Accept: 'application/json',
			Authorization: `Bearer ${token}`,
		};
		this.agent = new https.Agent({ keepAlive: true });
		this.concurrencyLimit = process.env.CI ? 2 : 5; // less aggressive in CI
	}

	async safeFetch(url, options = {}, retries = 3, delay = 1000) {
		for (let i = 0; i <= retries; i++) {
			try {
				const res = await fetch(url, {
					...options,
					headers: this.headers,
					agent: this.agent
				});

				if (!res.ok) {
					const text = await res.text();
					throw new Error(`HTTP ${res.status}: ${text}`);
				}

				return res;
			} catch (err) {
				const retryable = ['ECONNRESET', 'EPIPE', 'ETIMEDOUT'];
				if (i === retries || !retryable.includes(err.code)) {
					console.error(`Fetch failed on attempt ${i + 1}:`, err.message);
					throw err;
				}
				console.warn(`Retry ${i + 1} for ${url} after ${err.code}`);
				await new Promise(res => setTimeout(res, delay * (i + 1)));
			}
		}
	}

	async getPaginated(url) {
		let page = 1;
		let results = [];

		while (true) {
			const res = await this.safeFetch(`${url}&page=${page}`);
			const pageData = await res.json();
			results = results.concat(pageData);

			const totalPages = parseInt(res.headers.get('X-Total-Pages'), 10) || 1;
			if (page >= totalPages) break;
			page++;
		}

		return results;
	}

	async getMergeRequests(projectId, startDate, endDate, expandNotes) {
		const baseUrl = `${this.url}api/v4/projects/${projectId}/merge_requests?created_after=${startDate}&created_before=${endDate}&per_page=100`;
		const mergeRequests = await this.getPaginated(baseUrl);

		if (!expandNotes) return mergeRequests;

		const limit = pLimit(this.concurrencyLimit);
		return Promise.all(
			mergeRequests.map(mr =>
				limit(() =>
					this.getNotes(projectId, mr.iid).then(notes => ({
						...mr,
						notes
					}))
				)
			)
		);
	}

	async getNotes(projectId, mergeReqId) {
		const url = `${this.url}api/v4/projects/${projectId}/merge_requests/${mergeReqId}/notes?per_page=100`;
		return this.getPaginated(url);
	}

	async getDiscussions(projectId, mergeReqId) {
		const url = `${this.url}api/v4/projects/${projectId}/merge_requests/${mergeReqId}/discussions?per_page=100`;
		return this.getPaginated(url);
	}
}
