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

    // Normalize hostname by stripping leading 'www.'
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
      rule.targetDomains[Math.floor(Math.random() * rule.targetDomains.length)];

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
  // Match absolute URLs starting with http:// or https://
  const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/gi;
  return content.replace(urlRegex, (match) => transformUrl(match, rules));
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
