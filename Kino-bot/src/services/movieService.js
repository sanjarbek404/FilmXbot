import Movie from '../models/Movie.js';
import logger from '../utils/logger.js';
import myCache from '../utils/cache.js';

export const createMovie = async (movieData) => {
    try {
        return await Movie.create(movieData);
    } catch (error) {
        logger.error('Create movie error:', error);
        throw error;
    }
};

export const getMovieByCode = async (code) => {
    try {
        const cacheKey = `movie_${code}`;
        let cached = myCache.get(cacheKey);
        if (cached) return cached;

        const movie = await Movie.findOne({ code }).lean();
        if (movie) myCache.set(cacheKey, movie, 180); // cache 3 mins
        return movie;
    } catch (error) {
        logger.error('Get movie by code error:', error);
        return null;
    }
};

export const searchMovies = async (query) => {
    try {
        // 1. Text Search (Exact Stems)
        let movies = await Movie.find(
            { $text: { $search: query } },
            { score: { $meta: "textScore" } }
        ).sort({ score: { $meta: "textScore" } }).limit(50).lean();

        // 2. Direct Regex (Partial Match)
        if (!movies || movies.length === 0) {
            movies = await Movie.find({ title: { $regex: query, $options: 'i' } }).limit(50).lean();
        }

        // 3. Flexible Regex (Fuzzy Match / Ignore Whitespace/Chars)
        if (!movies || movies.length === 0) {
            const fuzzyQuery = query.split('').join('.*?'); // Matches 'f..o..r..s..a..j'
            movies = await Movie.find({ title: { $regex: fuzzyQuery, $options: 'i' } }).limit(10).lean();
        }

        return movies;
    } catch (error) {
        try {
            const fuzzyQuery = query.split('').join('.*?');
            return await Movie.find({ title: { $regex: fuzzyQuery, $options: 'i' } }).limit(10).lean();
        } catch (e) {
            logger.error('Search movies fallback error:', e);
            return [];
        }
    }
};

export const deleteMovie = async (code) => {
    try {
        return await Movie.findOneAndDelete({ code });
    } catch (error) {
        logger.error('Delete movie error:', error);
        return null;
    }
};

export const getAllMovies = async () => {
    try {
        return await Movie.find().sort({ createdAt: -1 }).lean();
    } catch (error) {
        logger.error('Get all movies error:', error);
        return [];
    }
};

export const countMovies = async () => {
    try {
        return await Movie.countDocuments();
    } catch (error) {
        logger.error('Count movies error:', error);
        return 0;
    }
};

export const getTopMovies = async (limit = 10) => {
    try {
        const cacheKey = `top_movies_${limit}`;
        let cached = myCache.get(cacheKey);
        if (cached) return cached;

        const movies = await Movie.find().sort({ views: -1 }).limit(limit).lean();
        if (movies) myCache.set(cacheKey, movies, 300); // cache top movies for 5 mins
        return movies;
    } catch (error) {
        logger.error('Get top movies error:', error);
        return [];
    }
};

export const getMoviesByGenre = async (genre) => {
    try {
        return await Movie.find({ genre: { $regex: genre, $options: 'i' } }).lean();
    } catch (error) {
        logger.error('Get movies by genre error:', error);
        return [];
    }
};

export const updateMovie = async (code, data) => {
    try {
        return await Movie.findOneAndUpdate({ code }, data, { new: true });
    } catch (error) {
        logger.error('Update movie error:', error);
        return null;
    }
};
