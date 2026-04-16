import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Movie from './src/models/Movie.js';

dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log("Connected to DB");
    const movie = await Movie.findOne({ code: 1040 });
    console.log("Movie 1040:", movie);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
