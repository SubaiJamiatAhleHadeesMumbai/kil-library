import React, { useState, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { bookService } from '../api/bookService';
import { useBookSearch } from '../hooks/useBookSearch';
import BookCard from '../components/book/BookCard';
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';

const UserLibrary = () => {
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);

    // 👇 Humara Smart Search Hook use ho raha hai
    const {
        searchTerm, setSearchTerm,
        selectedLanguage, setSelectedLanguage,
        selectedCategory, setSelectedCategory,
        filteredBooks
    } = useBookSearch(books);

    useEffect(() => {
        fetchBooks();
    }, []);

    // ✅ Apply search from URL params once when books are loaded
    useEffect(() => {
        // Only run once books have loaded and we have books to search through
        if (loading || !Array.isArray(books) || books.length === 0) return;

        const urlSearch = searchParams.get('search');
        const stateSearch = location.state?.preSearch;
        const searchValue = urlSearch || stateSearch;

        if (searchValue && searchValue.trim()) {
            console.log('✅ Applying search:', searchValue);
            console.log('📚 Available books:', books.length);
            
            // Set search term (this will trigger filtering through useBookSearch hook)
            setSearchTerm(searchValue);
        }
    }, [loading, books.length, searchParams.toString(), location.state?.preSearch, setSearchTerm]);

    const fetchBooks = async () => {
        try {
            const data = await bookService.read_books(0, 100, true); // Approved only
            // Handle both array and wrapped response formats
            const booksArray = Array.isArray(data) ? data : (data?.books || []);
            console.log('📚 Fetched books:', booksArray.length);
            setBooks(booksArray);
        } catch (error) {
            console.error("Error fetching books:", error);
            setBooks([]);
        } finally {
            setLoading(false);
        }
    };

    // Hindi aur Arabic ke liye font family setup
    const getFontClass = (lang) => {
        if (lang?.toLowerCase() === 'arabic') return 'font-arabic text-right';
        if (lang?.toLowerCase() === 'urdu') return 'font-urdu text-right';
        if (lang?.toLowerCase() === 'hindi') return 'font-hindi';
        return 'font-sans';
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* --- HERO SECTION & SEARCH --- */}
            <div className="bg-slate-900 text-white pt-16 pb-32 px-4">
                <div className="max-w-5xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight">
                        Discover Your Next <span className="text-emerald-400">Great Read</span>
                    </h1>
                    
                    {/* Professional Search Bar */}
                    <div className="relative max-w-2xl mx-auto group">
                        <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400 group-focus-within:text-emerald-400 transition-colors" />
                        <input 
                            type="text"
                            placeholder="Search by Title, Author, or ISBN (Hindi, Arabic supported)..."
                            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:bg-white focus:text-slate-900 transition-all shadow-2xl"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* --- FILTERS SECTION --- */}
            <div className="max-w-7xl mx-auto px-4 -mt-12">
                <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-100 flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex flex-wrap gap-3 items-center">
                        <div className="flex items-center gap-2 text-slate-500 font-semibold text-sm border-r pr-4">
                            <FunnelIcon className="h-5 w-5" />
                            FILTERS
                        </div>
                        
                        {/* Language Filter (dynamic from data) */}
                        <select 
                            className="bg-slate-50 border-none rounded-lg px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                            value={selectedLanguage}
                            onChange={(e) => setSelectedLanguage(e.target.value)}
                        >
                            <option value="all">All Languages</option>
                            {[...new Set(books.map(b => (b.language && (b.language.name || b.language)) || 'Unknown'))].map((lang) => (
                                <option key={lang} value={String(lang).toLowerCase()}>{lang}</option>
                            ))}
                        </select>

                        {/* Category Filter (dynamic from data) */}
                        <select 
                            className="bg-slate-50 border-none rounded-lg px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                            <option value="all">All Categories</option>
                            {[...new Set(books.flatMap(b => (b.subcategories || []).map(s => s.name || s).concat(b.category ? (b.category.name || b.category) : [])))].map((cat) => (
                                <option key={cat} value={String(cat).toLowerCase()}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    <div className="text-slate-400 text-sm font-medium">
                        Showing <span className="text-slate-900 font-bold">{filteredBooks.length}</span> results
                    </div>
                </div>

                {/* --- BOOK GRID --- */}
                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mt-12">
                        {[...Array(10)].map((_, i) => <div key={i} className="h-80 bg-slate-200 animate-pulse rounded-xl" />)}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mt-12">
                        {filteredBooks.map((book) => (
                            <div key={book.id} className={getFontClass(book.language?.name)}>
                                <BookCard book={book} />
                            </div>
                        ))}
                    </div>
                )}

                {!loading && filteredBooks.length === 0 && (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">🔍</div>
                        <h3 className="text-xl font-bold text-slate-800">No books found matching your search.</h3>
                        <p className="text-slate-500">Try adjusting your filters or search term.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserLibrary;