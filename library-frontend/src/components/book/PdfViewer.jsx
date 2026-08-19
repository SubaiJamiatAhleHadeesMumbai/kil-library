import React from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { InView } from 'react-intersection-observer';
import { ZoomIn, ZoomOut, File } from 'lucide-react';

// 🔥 IMPORTANT: Setup PDF Worker for modern React/Vite
// Prefer local worker shipped in `public/` to avoid CDN/CORS issues in production
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
// Required CSS for react-pdf to render text and annotations properly
 

const PdfViewer = ({ 
  pdfUrl, 
  viewMode, // 'scroll' | 'single' | 'dual' | 'grid'
  scale, 
  setScale, 
  setTotalPages, 
  setCurrentPage, 
  totalPages,
  currentPage 
}) => {
  return (
    <div id="pdf-wrapper" className="flex-1 bg-gray-100/50 relative flex flex-col items-center overflow-hidden h-full">
      
      {/* Floating Zoom Controls (Visible in Single/Dual/Scroll) */}
      {viewMode !== 'grid' && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-40 flex items-center gap-1 bg-white/90 backdrop-blur shadow-xl rounded-full px-3 py-1.5 border border-gray-200 transition-all hover:scale-105">
          <button 
            onClick={() => setScale(s => Math.max(0.5, s - 0.1))} 
            className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600 active:scale-95 transition"
            title="Zoom Out"
          >
            <ZoomOut size={16}/>
          </button>
          <span className="text-xs font-bold text-gray-500 w-10 text-center select-none font-mono">
            {Math.round(scale * 100)}%
          </span>
          <button 
            onClick={() => setScale(s => s + 0.1)} 
            className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600 active:scale-95 transition"
            title="Zoom In"
          >
            <ZoomIn size={16}/>
          </button>
        </div>
      )}

      <div className="flex-1 w-full overflow-y-auto p-4 md:p-8 custom-scrollbar flex justify-center">
        {!pdfUrl ? (
          // Empty State
          <div className="flex flex-col items-center justify-center text-gray-400 mt-20 select-none h-full">
            <div className="w-24 h-32 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center mb-4 bg-gray-50 animate-pulse">
              <File size={40} className="opacity-20"/>
            </div>
            <p className="font-medium">Please Upload a PDF</p>
          </div>
        ) : (
          // PDF Document Wrapper
          <Document 
            file={pdfUrl} 
            className={`flex ${viewMode === 'grid' ? 'flex-wrap justify-center gap-4' : 'flex-col gap-6 items-center'} w-full max-w-5xl`}
            onLoadSuccess={({numPages}) => setTotalPages(numPages)}
            loading={
              <div className="flex flex-col items-center justify-center gap-2 text-indigo-600 font-medium h-full mt-20">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <span>Loading Document...</span>
              </div>
            }
          >
            
            {/* MODE 1: SCROLL VIEW (Default) */}
            {viewMode === 'scroll' && Array.from(new Array(totalPages), (el, index) => (
              <InView key={index} threshold={0.5} onChange={(inView) => inView && setCurrentPage(index + 1)}>
                <div id={`page-id-${index + 1}`} className="relative shadow-md rounded-sm transition-transform duration-300 hover:shadow-xl mb-4">
                  <Page 
                    pageNumber={index + 1} 
                    scale={scale} 
                    renderTextLayer={true} 
                    renderAnnotationLayer={true} 
                    className="border border-gray-300 bg-white" 
                  />
                  <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded opacity-0 hover:opacity-100 transition pointer-events-none z-10">
                    Page {index + 1}
                  </div>
                </div>
              </InView>
            ))}

            {/* MODE 2: SINGLE PAGE VIEW */}
            {viewMode === 'single' && (
              <div className="shadow-2xl border border-gray-300 bg-white relative">
                <Page 
                  pageNumber={currentPage} 
                  scale={scale} 
                  renderTextLayer={true} 
                  renderAnnotationLayer={true} 
                />
                <span className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 text-gray-500 font-bold text-sm bg-gray-200 px-3 py-1 rounded-full shadow-sm">
                  {currentPage} of {totalPages}
                </span>
              </div>
            )}

            {/* MODE 3: DUAL PAGE VIEW (Book Spread) */}
            {viewMode === 'dual' && (
              <div className="flex gap-1 shadow-2xl bg-gray-800 p-2 rounded-lg items-center overflow-x-auto max-w-full">
                {/* Left Page (Odd or Current) */}
                <div className="bg-white shrink-0">
                   <Page pageNumber={currentPage} scale={scale * 0.8} renderTextLayer={true} renderAnnotationLayer={true} />
                </div>
                {/* Right Page (Next, if exists) */}
                {currentPage + 1 <= totalPages && (
                  <div className="bg-white border-l border-gray-300 shrink-0">
                    <Page pageNumber={currentPage + 1} scale={scale * 0.8} renderTextLayer={true} renderAnnotationLayer={true} />
                  </div>
                )}
              </div>
            )}

            {/* MODE 4: GRID VIEW (Thumbnails) */}
            {viewMode === 'grid' && Array.from(new Array(totalPages), (el, index) => (
               <div 
                 key={index} 
                 onClick={() => {
                   setCurrentPage(index + 1);
                   // Optionally switch back to single/scroll view here
                 }}
                 className={`cursor-pointer transition-all hover:scale-105 border-4 rounded-md ${currentPage === index + 1 ? 'border-indigo-600 shadow-2xl scale-105' : 'border-transparent hover:border-indigo-200'}`}
               >
                  <Page 
                    pageNumber={index + 1} 
                    width={150} // Fixed small width for grid
                    renderTextLayer={false} 
                    renderAnnotationLayer={false} 
                    className="shadow-sm bg-white"
                  />
                  <div className="text-center text-xs font-bold text-gray-500 mt-2 mb-1">Page {index + 1}</div>
               </div>
            ))}

          </Document>
        )}
      </div>
    </div>
  );
};

export default PdfViewer;