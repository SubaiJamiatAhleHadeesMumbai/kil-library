import React, { useState, useEffect } from 'react';
import { 
  SparklesIcon, 
  CalendarDaysIcon, 
  ArrowPathIcon 
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import socialWorkService from '../api/socialWorkService';
import SocialWorkCard from '../components/social_work/SocialWorkCard';
import SocialWorkItemDetailModal from '../components/social_work/SocialWorkItemDetailModal';
import { useLanguage } from '../context/LanguageContext';

const ActivitiesPage = () => {
  const { t } = useLanguage();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      // Load both activities and other items
      const data = await socialWorkService.getPublicItems('activities');
      const otherData = await socialWorkService.getPublicItems('other');
      const combined = [...(Array.isArray(data) ? data : []), ...(Array.isArray(otherData) ? otherData : [])];
      setItems(combined);
    } catch (err) {
      console.error('Error loading activities:', err);
      toast.error('Failed to load activities.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50/60 pb-20 font-sans">
      
      {/* ================= HERO BANNER ================= */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1E1B4B] via-[#312E81] to-[#3730A3] text-white py-16 sm:py-20">
        <div className="absolute inset-0 bg-[radial-gradient(#818cf8_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="app-shell-container relative z-10">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-bold tracking-wide uppercase">
              <SparklesIcon className="w-4 h-4" />
              <span>Markaz Activities & Gatherings</span>
            </div>
            
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              Community Events, Conferences & Exhibitions
            </h1>
            
            <p className="text-sm sm:text-base text-indigo-100/80 leading-relaxed max-w-2xl">
              Stay connected with youth gatherings, annual conferences, book fairs, and community celebrations organized by Markaz Ahle Hadees Kokan.
            </p>
          </div>
        </div>
      </section>

      {/* ================= CONTENT GRID ================= */}
      <div className="app-shell-container -mt-6">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80">
          <div className="flex items-center justify-between pb-6 border-b border-slate-100 mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Latest Activities & Event Records
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Showing {items.length} community events and photo logs
              </p>
            </div>

            <button
              onClick={fetchActivities}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer"
            >
              <ArrowPathIcon className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-96 rounded-3xl bg-slate-100 border border-slate-200" />
              ))}
            </div>
          ) : items.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item) => (
                <SocialWorkCard
                  key={item.id}
                  item={item}
                  onSelect={(selected) => setSelectedItem(selected)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 space-y-4">
              <div className="h-16 w-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CalendarDaysIcon className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">No Activities Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                New activities and events will be published here soon.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal & Lightbox */}
      <SocialWorkItemDetailModal
        isOpen={!!selectedItem}
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
};

export default ActivitiesPage;
