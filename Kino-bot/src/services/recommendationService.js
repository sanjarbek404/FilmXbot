import Movie from '../models/Movie.js';
import User from '../models/User.js';

export const getSmartRecommendations = async (userId, limit = 5) => {
    try {
        const user = await User.findById(userId).populate('watchHistory.movie');
        if (!user) return [];

        const watchedIds = new Set();
        const genreCounts = {};

        // Foydalanuvchi ko'rgan kinolarni guruhlab "eng yoqqan" janrlarni aniqlash
        if (user.watchHistory && user.watchHistory.length > 0) {
            user.watchHistory.forEach(h => {
                const movie = h.movie;
                if (movie) {
                    watchedIds.add(movie._id.toString());
                    if (movie.genre) {
                        const genres = movie.genre.split(',').map(g => g.trim().toLowerCase());
                        genres.forEach(g => {
                            genreCounts[g] = (genreCounts[g] || 0) + 1;
                        });
                    }
                }
            });
        }

        // Top 2 janrlarni ajratib olish
        const sortedGenres = Object.entries(genreCounts)
            .sort((a, b) => b[1] - a[1]) // highest first
            .map(entry => entry[0])
            .slice(0, 2);

        let query = { _id: { $nin: Array.from(watchedIds) } };
        
        if (sortedGenres.length > 0) {
            const genreRegex = sortedGenres.map(g => new RegExp(g, 'i'));
            query.genre = { $in: genreRegex };
        }

        let recommendations = await Movie.find(query)
            .sort({ views: -1, averageRating: -1 })
            .limit(limit);

        // Agar yetarlicha kinosi chiqmasa o'rniga "Umumiy Top" beramiz
        if (recommendations.length < limit) {
             const existingIds = recommendations.map(r => r._id.toString());
             const allSkipIds = [...Array.from(watchedIds), ...existingIds];
             const fallback = await Movie.find({ _id: { $nin: allSkipIds } })
                .sort({ views: -1 })
                .limit(limit - recommendations.length);
             recommendations = [...recommendations, ...fallback];
        }

        return recommendations;
    } catch (error) {
        console.error("AI Recommendation Error:", error);
        return [];
    }
}
