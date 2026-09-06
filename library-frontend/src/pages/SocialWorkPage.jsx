import React, { useState, useEffect } from 'react';
import { 
  HeartIcon, 
  UserGroupIcon, 
  ArrowPathIcon 
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import socialWorkService from '../api/socialWorkService';
import SocialWorkCard from '../components/social_work/SocialWorkCard';
import SocialWorkItemDetailModal from '../components/social_work/SocialWorkItemDetailModal';
import { useLanguage } from '../context/LanguageContext';

const SocialWorkPage = () => {
  const { t } = useLanguage();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);

  const fetchSocialWorkItems = async () => {
    setLoading(true);
    try {
      const data = await socialWorkService.getPublicItems('social_work');
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading social work items:', err);
      toast.error('Failed to load social work projects.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSocialWorkItems();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50/60 pb-20 font-sans">
      
      {/* ================= HERO BANNER ================= */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#064E3B] via-[#047857] to-[#059669] text-white py-16 sm:py-20">
        <div className="absolute inset-0 bg-[radial-gradient(#6ee7b7_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="app-shell-container relative z-10">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-400/20 border border-emerald-300/30 text-emerald-100 text-xs font-bold tracking-wide uppercase">
              <img src="/icons/social-work.png" alt="Social Work" className="w-4 h-4 object-contain brightness-0 invert" />
              <span>Markaz Social Work & Welfare</span>
            </div>
            
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              Community Service, Relief & Welfare Drives
            </h1>
            
            <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed max-w-2xl">
              Rooted in Islamic compassion and sincerity, our social service department actively coordinates food relief, medical aid, student welfare, and humanitarian initiatives for the underprivileged.
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
                Welfare Initiatives & Projects
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Showing {items.length} community welfare projects and relief drives
              </p>
            </div>

            <button
              onClick={fetchSocialWorkItems}
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
              <div className="h-16 w-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <UserGroupIcon className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">No Social Work Projects Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                New welfare projects and relief drives will be published here soon.
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

export default SocialWorkPage;
