import User from '../models/User.js';
import logger from '../utils/logger.js';
import NodeCache from 'node-cache';

// Cache users in memory for 10 seconds. 
// useClones: false preserves Mongoose document methods like .save() and .populate()
const userCache = new NodeCache({ stdTTL: 10, checkperiod: 10, useClones: false });

export const findOrCreateUser = async (ctx) => {
    const { id, first_name, username } = ctx.from;

    // Fast path: Check Cache
    const cachedUser = userCache.get(id);
    if (cachedUser) {
        return cachedUser;
    }

    try {
        // First try to find existing user
        let user = await User.findOne({ telegramId: id });

        if (user) {
            // Update existing user's info if changed
            if (user.firstName !== first_name || user.username !== username) {
                user.firstName = first_name;
                user.username = username;
                await user.save();
            }
            userCache.set(id, user);
            return user;
        }

        // Create new user if not exists
        user = await User.create({
            telegramId: id,
            firstName: first_name,
            username,
        });

        userCache.set(id, user);
        return user;

    } catch (error) {
        // If duplicate key error, just find the user
        if (error.code === 11000) {
            const user = await User.findOne({ telegramId: id });
            if (user) userCache.set(id, user);
            return user;
        }
        logger.error('Error in findOrCreateUser:', error);
        // Return a minimal user object to prevent crash
        return { telegramId: id, firstName: first_name, isBanned: false };
    }
};

export const updateUser = async (telegramId, data) => {
    try {
        const updatedUser = await User.findOneAndUpdate({ telegramId }, data, { new: true });
        if (updatedUser) {
            userCache.set(telegramId, updatedUser);
        }
        return updatedUser;
    } catch (error) {
        logger.error('Error updating user:', error);
        return null;
    }
};

export const getUserByTelegramId = async (telegramId) => {
    const cachedUser = userCache.get(telegramId);
    if (cachedUser) return cachedUser;

    try {
        const user = await User.findOne({ telegramId });
        if (user) {
            userCache.set(telegramId, user);
        }
        return user;
    } catch (error) {
        logger.error('Error getting user:', error);
        return null;
    }
};

// Utility function to explicitly invalidate a user's cache
export const invalidateUserCache = (telegramId) => {
    userCache.del(telegramId);
};
