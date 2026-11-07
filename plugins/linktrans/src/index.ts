import { findByProps } from '@vendetta/metro';
import { before } from '@vendetta/patcher';
import { storage } from '@vendetta/plugin';
import Settings from './Settings';
import { Rule } from './types';

let unpatch: () => void;

const DEFAULT_RULES: Rule[] = [
	{
		sourceDomain: 'instagram.com',
		targetDomains: ['oginstagram.com'],
		keepParams: ['img_index'],
	},
	{
		sourceDomain: 'reddit.com',
		targetDomains: ['vxreddit.com'],
		keepParams: ['url'],
	},
	{
		sourceDomain: 'x.com',
		targetDomains: [
			'peepeepoopoodumdumtwitterx.org',
			'skibidix.com',
			'yiffx.com',
			'boycuntx.com',
			'yaoisex.com',
			'skibidix.com',
			'boypussyx.com',
			'catgirlsex.com',
		],
		keepParams: [],
	},
];

function transformUrl(rawUrl: string, rules: Rule[]): string {
	try {
		const url = new URL(rawUrl);

		// Normalise hostname by stripping leading 'www.'
		const host = url.hostname.replace(/^www\./i, '');

		const rule = rules.find((r) => {
			const targetSource = r.sourceDomain
				.replace(/^www\./i, '')
				.trim()
				.toLowerCase();
			return host === targetSource;
		});

		if (!rule || rule.targetDomains.length === 0) return rawUrl;

		// 1. Pick a random target domain
		const chosenTarget =
			rule.targetDomains[
				Math.floor(Math.random() * rule.targetDomains.length)
			];

		// Maintain protocol if target doesn't specify one
		if (
			chosenTarget.startsWith('http://') ||
			chosenTarget.startsWith('https://')
		) {
			const parsedTarget = new URL(chosenTarget);
			url.hostname = parsedTarget.hostname;
			url.protocol = parsedTarget.protocol;
		} else {
			url.hostname = chosenTarget.replace(/^www\./i, '');
		}

		// 2. Strip parameters except the whitelisted ones
		const allowed = new Set(rule.keepParams.map((p) => p.trim()));
		const paramsToDelete: string[] = [];

		url.searchParams.forEach((_, key) => {
			if (!allowed.has(key)) {
				paramsToDelete.push(key);
			}
		});

		for (const key of paramsToDelete) {
			url.searchParams.delete(key);
		}

		return url.toString();
	} catch {
		return rawUrl;
	}
}

function processMessageContent(content: string, rules: Rule[]): string {
	if (!content) return content;

	// Match each URL without consuming adjacent schemes
	// i.e. matches links starting with https?:// NOT followed by another https?://,
	// BUT having https?:// in the middle of the link is fine IFF it is a query parameter,
	// e.g. https://gifconvert.vxtwitter.com/convert.avif?url=https://video.twimg.com/tweet_video/HUN83g9WwAAvw8z.mp4
	const urlRegex = /https?:\/\/([^\s](?!(?<![^=]=)https?:\/\/))+[^\s]/gi;

	return content.replace(urlRegex, (match, offset) => {
		const transformed = transformUrl(match, rules);
		const nextChar = content[offset + match.length];

		// Add a space if followed immediately by another character that isn't already whitespace
		const needsTrailingSpace =
			nextChar !== undefined && !/\s/.test(nextChar);

		return needsTrailingSpace ? `${transformed} ` : transformed;
	});
}

export default {
	onLoad: () => {
		// Populate defaults if unset
		if (!storage.rules || storage.rules.length === 0) {
			storage.rules = DEFAULT_RULES;
		}

		const messages = findByProps('sendMessage', 'receiveMessage');
		if (!messages) return;

		// Intercept sendMessage: (channelId, messagePayload, ...)
		unpatch = before('sendMessage', messages, (args) => {
			const messagePayload = args[1];
			const rules: Rule[] = storage.rules ?? DEFAULT_RULES;

			if (messagePayload?.content) {
				messagePayload.content = processMessageContent(
					messagePayload.content,
					rules,
				);
			}
		});
	},

	onUnload: () => {
		unpatch?.();
	},

	settings: Settings,
};
