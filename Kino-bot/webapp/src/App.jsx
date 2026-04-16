import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Play, Star, Hash } from 'lucide-react';

const WebApp = window.Telegram.WebApp;

function App() {
  const [movies, setMovies] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  useEffect(() => {
    WebApp.ready();
    WebApp.expand();
    
    // Set minimal theme variables
    document.documentElement.style.setProperty('--tg-theme-bg-color', WebApp.themeParams.bg_color || '#09090b');
    document.documentElement.style.setProperty('--tg-theme-text-color', WebApp.themeParams.text_color || '#ffffff');

    fetch('/api/movies')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMovies(data);
        } else {
          console.error("API xatosi, kutilgan ro'yxat o'rniga obyekt:", data);
          setMovies([]);
        }
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  const handleSelect = (movie) => {
    if (WebApp.HapticFeedback) WebApp.HapticFeedback.impactOccurred('medium');
    setToast(`${movie.title}`);
    
    WebApp.sendData(JSON.stringify({
      action: 'play_movie',
      code: movie.code
    }));

    setTimeout(() => {
      setToast('');
      WebApp.close();
    }, 1200);
  };

  const filteredMovies = movies.filter(m => m && (
    (m.title && m.title.toLowerCase().includes(search.toLowerCase())) || 
    (m.code && m.code.toString().includes(search)) ||
    (m.genre && m.genre.toLowerCase().includes(search.toLowerCase()))
  ));

  return (
    <div className="relative min-h-screen bg-[#09090b] text-white font-sans overflow-hidden">
      {/* Animated Background Gradients */}
      <div className="fixed inset-0 min-h-screen z-0 pointer-events-none overflow-hidden">
         <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-600/30 blur-[100px] animate-pulse"></div>
         <div className="absolute top-[40%] -right-[20%] w-[60%] h-[60%] rounded-full bg-purple-600/20 blur-[120px]"></div>
         <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 p-4 pb-24 max-w-3xl mx-auto">
        <header className="mb-6 sticky top-0 z-20 py-4 -mx-4 px-4 bg-[#09090b]/60 backdrop-blur-xl border-b border-white/5">
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-extrabold bg-gradient-to-r from-indigo-400 via-purple-400 to-blue-400 bg-clip-text text-transparent tracking-tight">FilmX</h1>
                    <p className="text-xs text-gray-400 mt-0.5 font-medium">Eksklyuziv formatda tomosha qiling</p>
                </div>
                <div className="h-10 w-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center backdrop-blur-md shadow-inner">
                    <Star className="w-5 h-5 text-purple-400" />
                </div>
            </div>
            
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-400 transition-colors duration-300" />
              </div>
              <input 
                type="text" 
                placeholder="Kino nomi yoki kodini kiriting..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-2xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 block p-3.5 pl-11 outline-none transition-all placeholder-gray-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] backdrop-blur-sm"
              />
            </div>
          </div>
        </header>

        <main className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {loading ? (
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="animate-pulse flex flex-col gap-3">
                <div className="w-full aspect-[2/3] bg-white/5 rounded-2xl shadow-sm"></div>
                <div className="w-2/3 h-4 bg-white/10 rounded-full"></div>
                <div className="w-1/3 h-3 bg-white/5 rounded-full"></div>
              </div>
            ))
          ) : filteredMovies.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-gray-500" />
              </div>
              <p className="text-gray-300 font-medium text-lg">Hech narsa topilmadi</p>
              <p className="text-gray-500 text-sm mt-1">Boshqa kalit so'z bilan qidirib ko'ring</p>
            </div>
          ) : (
            <AnimatePresence>
              {filteredMovies.map((movie, index) => {
                const imgUrl = movie.poster && movie.poster.startsWith('http') 
                  ? movie.poster 
                  : `/api/image/${movie.poster}`;
                
                return (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 350, damping: 25, delay: index * 0.05 }}
                    whileHover={{ y: -6, scale: 1.03 }}
                    whileTap={{ scale: 0.95 }}
                    key={movie._id || movie.code} 
                    className="flex flex-col relative group cursor-pointer"
                    onClick={() => handleSelect(movie)}
                  >
                    <div className="relative overflow-hidden rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.5)] border border-white/10 group-hover:border-indigo-500/50 transition-all duration-500 bg-gray-900">
                      <img src={imgUrl} alt={movie.title} className="w-full aspect-[2/3] object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                      
                      {/* Gradient Overlays */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-transparent to-black/30 opacity-90"></div>
                      
                      {/* Interactive Play Button */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="bg-indigo-600/90 backdrop-blur-md p-3.5 rounded-full text-white shadow-[0_0_20px_rgba(79,70,229,0.5)] transform scale-75 group-hover:scale-100 transition-all duration-300">
                              <Play className="w-6 h-6 ml-1 fill-white" />
                          </div>
                      </div>

                      {/* Top Badges */}
                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">
                          <Hash className="w-3 h-3 text-indigo-400" />
                          <span className="text-white text-[11px] font-bold tracking-wider">{movie.code}</span>
                      </div>

                      {/* Action Badges */}
                      <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                        <span className="bg-white/10 backdrop-blur-md border border-white/10 text-white text-[10px] font-medium px-2 py-1 rounded-md">
                          Ko'rish: {movie.views || 0}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-3 px-1">
                      <h3 className="text-sm font-bold truncate leading-tight text-white group-hover:text-indigo-300 transition-colors">{movie.title}</h3>
                      <p className="text-[12px] text-gray-400 truncate mt-0.5 font-medium">{movie.genre || 'Kino'}</p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </main>

        <AnimatePresence>
          {toast && (
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-purple-600 border border-white/20 text-white px-6 py-3 rounded-2xl shadow-[0_10px_40px_rgba(79,70,229,0.5)] text-sm font-bold z-50 whitespace-nowrap backdrop-blur-xl flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-white" /> Play: {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;

