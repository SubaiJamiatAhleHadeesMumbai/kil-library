import React, { useState, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  CloudArrowDownIcon,
  LanguageIcon,
  SparklesIcon,
  AdjustmentsHorizontalIcon,
  ClipboardDocumentCheckIcon,
  DocumentArrowDownIcon,
  EyeIcon,
  XMarkIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import apiClient from '../../api/apiClient';

// Detailed knowledge base for each feature explaining its purpose, mechanism, and real-world example
const FEATURE_EXPLAINERS = {
  enabled: {
    title: 'Global Deep Search (کتب کے اندر گہری تلاش)',
    badge: 'Core Search Engine',
    icon: MagnifyingGlassIcon,
    summary: 'کتابوں کے عنوانات کے علاوہ کتاب کے اندرونی صفحات اور متن (Full Text) میں لفظ بہ لفظ تلاش کرنے کی سہولت۔',
    purpose: 'عام طور پر سرچ صرف کتاب کے نام یا مصنف پر ہوتی ہے۔ یہ فیچر لائبریری کے اندر موجود تمام کتب کے ہر صفحے کو اسکین کرتا ہے تاکہ اگر مطلوبہ لفظ کتاب کے کسی بھی صفحے پر موجود ہو تو وہ فورا مل جائے۔',
    howItWorks: 'سسٹم ہر کتاب کے ساتھ منسلک TXT فائل کے صفحات کو اسکین کر کے عین وہی جملہ سامنے لاتا ہے جہاں یہ لفظ استعمال ہوا ہے۔',
    example: 'مثال: اگر کوئی قاری "مطابق" یا "نماز جنازہ" سرچ کرے تو وہ تمام کتابیں مع صفحہ نمبر کھل جائیں گی جن میں یہ الفاظ آئے ہیں۔',
    previewType: 'search_snippet'
  },
  enable_cloud_caching: {
    title: 'Cloud Smart Caching (کلاؤڈ فائل کیشنگ)',
    badge: 'Ultra-Fast Performance',
    icon: CloudArrowDownIcon,
    summary: 'کلاؤڈ اسٹوریج (Cloudinary) پر موجود کتابوں کی فائلوں کو لوکل سرور پر کیش (Cache) کر کے 0.01 سیکنڈ میں سرچ مکمل کرنا۔',
    purpose: 'کلاؤڈ اسٹوریج پر محفوظ بڑی فائلوں کو بار بار انٹرنیٹ سے پڑھنا سرچ کو سست (2 سے 3 سیکنڈ) بنا دیتا ہے۔ کیشنگ کے بعد سرچ ایک پلک جھپکتے (0.01s) مکمل ہو جاتی ہے۔',
    howItWorks: 'پہلی بار سرچ ہونے پر فائل خودکار طور پر سرور کی فاسٹ میموری/ڈسک میں محفوظ ہو جاتی ہے۔ اگلی تمام سرچیز بغیر کسی نیٹ ورک ڈیلے کے وہیں سے انجام پاتی ہیں۔',
    example: 'پہلی سرچ: 1.2 سیکنڈ | کیش کے بعد دوسری سرچ: 0.01 سیکنڈ (100 گنا تیز رفتار!)',
    previewType: 'speed_badge'
  },
  enable_aerab_normalization: {
    title: 'Trilingual Aerab & Diacritics Normalization (اعراب و تقابل)',
    badge: 'Urdu, Arabic & English Compatible',
    icon: LanguageIcon,
    summary: 'عربی اور اردو الفاظ کے زبر، زیر، پیش، تنوین، تشدید اور مختلف فونٹس کے حروف کو یکساں کر کے تلاش کرنا۔',
    purpose: 'عربی اور اردو میں اکثر الفاظ پر اعراب (زبر، زیر، تشدید) لگے ہوتے ہیں جیسے "مُطَابِق" جبکہ صارف عام کی بورڈ سے "مطابق" لکھتا ہے۔ یہ فیچر دونوں کو آپس میں ملا کر 100% درست نتیجہ دیتا ہے۔',
    howItWorks: 'سرچ کے وقت اعراب کو عارضی طور پر ہٹا دیا جاتا ہے، الف کی اقسام (أ/إ/آ/ٱ)، ی اور ي، اور ک اور ك کو معیاری بنا کر تلاش کیا جاتا ہے لیکن دکھاتے وقت اصل کتاب کا خوبصورت متن ہی ظاہر ہوتا ہے۔',
    example: 'اگر کتاب میں "مُطَابِق" یا "سَلَفِي" لکھا ہو اور صارف "مطابق" یا "سلفی" سرچ کرے، تو دونوں کا درست ترین میچ مل جائے گا۔',
    previewType: 'arabic_match'
  },
  enable_boolean_operators: {
    title: 'Multi-Word & Boolean Operators (مرکب اور جملہ تلاش)',
    badge: 'Advanced Academic Research',
    icon: SparklesIcon,
    summary: 'ایک ساتھ کئی الفاظ یا ہو بہو جملہ (Exact Phrase) تلاش کرنے کی علمی سہولت۔',
    purpose: 'محققین اور مفتیانِ کرام کو اکثر دو مختلف شرعی موضوعات کو ایک ساتھ کسی صفحے پر تلاش کرنا ہوتا ہے، مثلاً ایک ہی صفحے پر زکوٰۃ اور سونے کے احکام۔',
    howItWorks: 'کوٹس ("...") کے ذریعے ہو بہو جملہ تلاش کیا جا سکتا ہے، جبکہ بغیر کوٹس کے وہ تمام صفحات ملتے ہیں جہاں دونوں الفاظ موجود ہوں۔',
    example: 'سرچ: "نماز باجماعت" (ہو بہو جملہ) یا "روزہ مسافر" (وہ صفحات جہاں روزہ اور مسافر دونوں کا ذکر ہو)۔',
    previewType: 'boolean_tags'
  },
  enable_scope_filters: {
    title: 'Category & Author Scope Filters (تلاش کا دائرہ)',
    badge: 'Smart Discovery',
    icon: AdjustmentsHorizontalIcon,
    summary: 'صارف کو اجازت دینا کہ وہ سرچ کو صرف کسی مخصوص زمرے، مصنف یا موجودہ کتاب تک محدود کر سکے۔',
    purpose: 'جب لائبریری میں ہزاروں کتب ہوں تو نتائج کی تعداد بہت زیادہ ہو سکتی ہے۔ اس فلٹر کی مدد سے قاری صرف اپنی مطلوبہ کیٹیگری (جیسے حدیث، فقہ) میں سرچ کر سکتا ہے۔',
    howItWorks: 'سرچ موڈل میں ایک ڈراپ ڈاؤن دیا جاتا ہے جس سے صارف تمام کتب، منتخب زمرہ یا مخصوص مصنف کا انتخاب کرتا ہے۔',
    example: 'صرف "حدیث و علوم الحدیث" کے زمرے میں لفظ "وضوء" تلاش کریں۔',
    previewType: 'scope_pills'
  },
  enable_citation_tool: {
    title: '1-Click Academic Citation Tool (اقتباس بمع حوالہ کاپی)',
    badge: 'Scholar & Student Essential',
    icon: ClipboardDocumentCheckIcon,
    summary: 'سرچ رزلٹ میں آنے والے ہر اقتباس کو کتاب کے نام، مصنف اور صفحہ نمبر کے ساتھ ایک کلک میں کاپی کرنے کا ٹول۔',
    purpose: 'طلبہ، اساتذہ اور مفتیان کو مقالے، فتوے یا واٹس ایپ پر حوالہ بھیجنے کے لیے ہاتھ سے کتاب کا نام اور صفحہ لکھنے کی محنت نہیں کرنی پڑے گی۔',
    howItWorks: 'ہر رزلٹ کے نیچے "📋 حوالہ کاپی کریں" کا بٹن ظاہر ہوتا ہے۔ کلک کرتے ہی خوبصورت فارمیٹ شدہ حوالہ کلپ بورڈ میں کاپی ہو جاتا ہے۔',
    example: 'کاپی شدہ مواد:\n"اس مسئلے پر اجماع ہے..."\n📖 کتاب: فتح الباری | ✍️ مصنف: ابن حجر | 📄 صفحہ: 42\n🔗 مرکز لائبریری لنک',
    previewType: 'citation_card'
  },
  enable_research_export: {
    title: 'Research Report PDF / Text Export (تحقیقی رپورٹ ایکسپورٹ)',
    badge: 'Scholarly Export',
    icon: DocumentArrowDownIcon,
    summary: 'کسی بھی موضوع پر سرچ کے تمام حاصل شدہ نتائج کو پرنٹ یا پی ڈی ایف کی شکل میں ڈاؤنلوڈ کرنے کی سہولت۔',
    purpose: 'محقق جب کسی موضوع پر تمام کتب کو اسکین کرتا ہے تو وہ چاہتا ہے کہ تمام نتائج کی ایک مکمل فہرست اس کے پاس محفوظ ہو جائے تاکہ وہ آف لائن مطالعہ کر سکے۔',
    howItWorks: 'سرچ کے بعد "📄 رپورٹ ایکسپورٹ کریں" کا بٹن کلک کرنے پر تمام اقوال، کتب کے نام اور صفحات ایک نفیس ریسرچ شیٹ میں یکجا ہو جاتے ہیں۔',
    example: 'موضوع "سود کے جدید مسائل" کے تحت 4 کتب سے نکلنے والے 12 حوالوں کی مکمل پرنٹ ایبل پی ڈی ایف رپورٹ۔',
    previewType: 'export_sheet'
  }
};

const DeepSearchCustomizer = () => {
  const [settings, setSettings] = useState({
    enabled: true,
    enable_cloud_caching: true,
    enable_aerab_normalization: true,
    enable_boolean_operators: true,
    enable_scope_filters: true,
    enable_citation_tool: true,
    enable_research_export: true,
    max_snippets_per_book: 5,
    snippet_context_chars: 80,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [explainerKey, setExplainerKey] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/settings/deep-search');
      if (res.data) {
        setSettings((prev) => ({ ...prev, ...res.data }));
      }
    } catch (err) {
      console.error('Failed to load deep search settings:', err);
      toast.error('Could not load deep search settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleNumberChange = (key, value) => {
    const num = Math.max(1, Math.min(25, Number(value) || 1));
    setSettings((prev) => ({ ...prev, [key]: num }));
  };

  const handleSave = async () => {
    setSaving(true);
    const toastId = toast.loading('Saving Deep Search settings...');
    try {
      const res = await apiClient.put('/api/settings/deep-search', settings);
      if (res.data?.deep_search) {
        setSettings(res.data.deep_search);
      }
      toast.success('Deep Search settings updated successfully!', { id: toastId });
    } catch (err) {
      console.error('Failed to save settings:', err);
      toast.error(err.response?.data?.detail || 'Failed to save settings.', { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const activeExplainer = explainerKey ? FEATURE_EXPLAINERS[explainerKey] : null;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500">
        <ArrowPathIcon className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-sm font-semibold">Loading Deep Search Engine Settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-blue-50/40 to-white p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-600/10 px-3 py-1 text-xs font-bold text-indigo-700 mb-2">
              <SparklesIcon className="w-4 h-4" />
              <span>ACADEMIC DEEP SEARCH CONTROLLER</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              Deep Search Engine & Research Controller (کتب کے اندر گہری تلاش)
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
              مکمل ایڈمن کنٹرول: اردو، عربی اور انگلش تلاش کے انجن، کلاؤڈ کیشنگ، حوالہ سازی اور فلٹرز کو اپنی مرضی سے آن یا آف کریں۔
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#002147] hover:bg-[#003166] text-white text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <CheckCircleIcon className="w-5 h-5" />
              <span>{saving ? 'Saving...' : 'Save Engine Settings'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feature Toggles Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {Object.entries(FEATURE_EXPLAINERS).map(([key, info]) => {
          const isEnabled = Boolean(settings[key]);
          const IconComp = info.icon;

          return (
            <div
              key={key}
              className={`p-5 rounded-2xl border transition-all shadow-2xs flex flex-col justify-between ${
                isEnabled
                  ? 'bg-white border-indigo-200/90 hover:border-indigo-300'
                  : 'bg-slate-50/80 border-slate-200 opacity-80'
              }`}
            >
              <div>
                {/* Header with Icon, Badge, and Eye Explainer Button */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isEnabled ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-200 text-slate-500'
                    }`}>
                      <IconComp className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 leading-snug">
                        {info.title}
                      </h4>
                      <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md mt-0.5 inline-block">
                        {info.badge}
                      </span>
                    </div>
                  </div>

                  {/* 👁️ Eye Icon Explainer Button */}
                  <button
                    type="button"
                    onClick={() => setExplainerKey(key)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-700 transition cursor-pointer shadow-2xs group"
                    title="یہ فیچر کس کام آتا ہے؟ (View details & preview)"
                  >
                    <EyeIcon className="w-5 h-5 group-hover:scale-110 transition" />
                  </button>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                  {info.summary}
                </p>
              </div>

              {/* Bottom Toggle Bar */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className={`text-xs font-bold ${isEnabled ? 'text-emerald-700' : 'text-slate-400'}`}>
                  {isEnabled ? '● Active (آن)' : '○ Disabled (آف)'}
                </span>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={() => handleToggle(key)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                </label>
              </div>
            </div>
          );
        })}
      </div>

      {/* Numeric Constraints & Context Settings Card */}
      <div className="p-6 rounded-3xl border border-slate-200 bg-white shadow-2xs">
        <h3 className="text-base font-bold text-slate-900 mb-1">
          Search Precision & Context Limits (تلاش کے نتائج کی حد)
        </h3>
        <p className="text-xs text-slate-500 mb-6">
          فی کتاب زیادہ سے زیادہ کتنے نتائج دکھائے جائیں اور الفاظ کا کتنا سیاق و سباق (Snippet Context) ظاہر ہو۔
        </p>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Max Snippets Per Book (فی کتاب زیادہ سے زیادہ نتائج):
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1"
                max="15"
                value={settings.max_snippets_per_book || 5}
                onChange={(e) => handleNumberChange('max_snippets_per_book', e.target.value)}
                className="flex-1 accent-indigo-600 cursor-pointer"
              />
              <span className="w-12 text-center py-1.5 px-2 bg-slate-100 rounded-xl text-xs font-black text-slate-800 border border-slate-200">
                {settings.max_snippets_per_book || 5}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">تجویز کردہ: 5 نتائج فی کتاب</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Snippet Context Characters (آگے پیچھے کے حروف کی لمبائی):
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="40"
                max="150"
                step="10"
                value={settings.snippet_context_chars || 80}
                onChange={(e) => handleNumberChange('snippet_context_chars', e.target.value)}
                className="flex-1 accent-indigo-600 cursor-pointer"
              />
              <span className="w-14 text-center py-1.5 px-2 bg-slate-100 rounded-xl text-xs font-black text-slate-800 border border-slate-200">
                {settings.snippet_context_chars || 80} ch
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">تجویز کردہ: 80 حروف (ایک مکمل جملہ)</p>
          </div>
        </div>
      </div>

      {/* 👁️ Eye Icon Explainer Modal */}
      {activeExplainer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 sm:p-8 relative border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                  <activeExplainer.icon className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                    {activeExplainer.badge}
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 mt-1">
                    {activeExplainer.title}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setExplainerKey(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 py-4 text-xs sm:text-sm text-slate-700 leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
              <div>
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  یہ فیچر کس کام آتا ہے؟ (Purpose)
                </h4>
                <p className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-slate-700">
                  {activeExplainer.purpose}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  یہ کیسے کام کرتا ہے؟ (How it Works)
                </h4>
                <p className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-slate-700">
                  {activeExplainer.howItWorks}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  عملی مثال (Real-World Example)
                </h4>
                <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200/80 text-amber-950 font-medium whitespace-pre-line">
                  {activeExplainer.example}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setExplainerKey(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer shadow-sm"
              >
                سمجھ گیا (Got it)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeepSearchCustomizer;
