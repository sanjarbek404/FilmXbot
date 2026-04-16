import Channel from '../models/Channel.js';
import Config from '../models/Config.js';
import logger from '../utils/logger.js';
import NodeCache from 'node-cache';

const subCache = new NodeCache({ stdTTL: 60, checkperiod: 60 });

export const getRequiredChannels = async () => {
    const cached = subCache.get('channels');
    if (cached) return cached;
    try {
        const channels = await Channel.find();
        subCache.set('channels', channels);
        return channels;
    } catch (e) {
        return [];
    }
};

export const addChannel = async (channelId, name, inviteLink, adminId) => {
    try {
        await Channel.create({ channelId, name, inviteLink, addedBy: adminId });
        subCache.del('channels'); // Clear cache
        return true;
    } catch (e) {
        logger.error('Add channel error:', e);
        return false;
    }
};

export const removeChannel = async (channelId) => {
    try {
        await Channel.findOneAndDelete({ channelId });
        subCache.del('channels'); // Clear cache
        return true;
    } catch (e) {
        return false;
    }
};

export const toggleSubscription = async (status) => {
    try {
        await Config.findOneAndUpdate(
            { key: 'subscription_enabled' },
            { value: status },
            { upsert: true, new: true }
        );
        subCache.set('subscription_enabled', status);
        return true;
    } catch (e) {
        return false;
    }
};

export const checkSubscription = async (ctx) => {
    try {
        // Check global switch from cache
        let isEnabled = subCache.get('subscription_enabled');
        if (isEnabled === undefined) {
            const config = await Config.findOne({ key: 'subscription_enabled' });
            isEnabled = config ? config.value : true;
            subCache.set('subscription_enabled', isEnabled);
        }

        if (!isEnabled) return true; // Feature disabled
        const channels = await getRequiredChannels();
        if (channels.length === 0) return true; // No channels to check

        const userId = ctx.from.id;
        const notSubscribed = [];

        for (const channel of channels) {
            try {
                const member = await ctx.telegram.getChatMember(channel.channelId, userId);
                if (['left', 'kicked'].includes(member.status)) {
                    notSubscribed.push(channel);
                }
            } catch (e) {
                // If bot is not admin or channel invalid, we typically assume "subscribed" or log error
                // to avoid blocking user due to bot error.
                logger.error(`Check sub error for ${channel.channelId}:`, e);
                // Be strict? or lenient? User said "bot kanalga admin bo'lishi shart".
                // If checking fails, it usually means bot is not admin.
                // We will treat as not subscribed to encourage adding bot as admin.
                // But actually, if bot can't check, it will throw.
                // Let's assume fail = not subscribed if we want to be strict.
                notSubscribed.push(channel);
            }
        }

        return notSubscribed.length === 0 ? true : notSubscribed;
    } catch (e) {
        logger.error('Global sub check error:', e);
        return true; // Fail safe
    }
};
