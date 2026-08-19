# 🚀 Quick Start: Using Cloudinary in Your Components

## Example 1: Simple File Upload Input

```jsx
import { useCloudinaryUpload } from '../hooks/useCloudinaryUpload';
import { toast } from 'react-hot-toast';

export const BookUploadForm = () => {
    const { uploadCover, uploadPdf, uploading, progress } = useCloudinaryUpload();
    const [bookData, setBookData] = useState({});

    // Handle Cover Image Upload
    const handleCoverSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const result = await uploadCover(file);
            setBookData({
                ...bookData,
                cover_image_url: result.url,
                cover_image_public_id: result.public_id
            });
            toast.success('✅ Cover uploaded!');
        } catch (error) {
            toast.error(error.message);
        }
    };

    // Handle PDF Upload
    const handlePdfSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const result = await uploadPdf(file);
            setBookData({
                ...bookData,
                pdf_url: result.url,
                pdf_public_id: result.public_id
            });
            toast.success('✅ PDF uploaded!');
        } catch (error) {
            toast.error(error.message);
        }
    };

    return (
        <div className="space-y-4">
            {/* Cover Image Input */}
            <div>
                <label className="block font-bold mb-2">Book Cover</label>
                <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleCoverSelect}
                    disabled={uploading}
                />
                {uploading && <p className="text-sm text-blue-500">Uploading... {progress}%</p>}
            </div>

            {/* PDF Input */}
            <div>
                <label className="block font-bold mb-2">PDF File</label>
                <input 
                    type="file" 
                    accept=".pdf" 
                    onChange={handlePdfSelect}
                    disabled={uploading}
                />
                {uploading && <p className="text-sm text-blue-500">Uploading... {progress}%</p>}
            </div>

            {/* Display Uploaded URLs */}
            {bookData.cover_image_url && (
                <div>
                    <p className="text-sm text-gray-600">Cover: {bookData.cover_image_url}</p>
                </div>
            )}
        </div>
    );
};
```

## Example 2: Drag-and-Drop Upload

```jsx
import { useState } from 'react';
import { useCloudinaryUpload } from '../hooks/useCloudinaryUpload';
import { CloudArrowUpIcon } from '@heroicons/react/24/outline';

export const DragDropUpload = ({ onUpload, acceptType = 'image' }) => {
    const { uploadCover, uploading, progress } = useCloudinaryUpload();
    const [dragActive, setDragActive] = useState(false);

    const handleDrag = (e) => {
        e.preventDefault();
        setDragActive(e.type === 'dragenter' || e.type === 'dragover');
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        setDragActive(false);

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            try {
                const result = await uploadCover(files[0]);
                onUpload(result);
            } catch (error) {
                console.error('Upload failed:', error);
            }
        }
    };

    return (
        <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`
                border-2 border-dashed rounded-lg p-8 text-center
                transition-colors cursor-pointer
                ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
                ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
        >
            <CloudArrowUpIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-700 font-bold">
                {uploading ? `Uploading... ${progress}%` : 'Drag files here or click to upload'}
            </p>
            <p className="text-sm text-gray-500">Maximum 5MB for images</p>
        </div>
    );
};
```

## Example 3: Complete Book Form with All Files

```jsx
import { useState } from 'react';
import { useCloudinaryUpload } from '../hooks/useCloudinaryUpload';
import { toast } from 'react-hot-toast';

export const AddBookForm = () => {
    const { uploadCover, uploadPdf, uploadText, uploading, progress } = useCloudinaryUpload();
    const [book, setBook] = useState({
        title: '',
        author: '',
        cover_image_url: '',
        pdf_url: '',
        text_url: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!book.cover_image_url) {
            toast.error('❌ Please upload a cover image');
            return;
        }

        try {
            // Send to your backend API
            const response = await fetch('/api/books/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(book)
            });

            if (response.ok) {
                toast.success('✅ Book added successfully!');
                setBook({...book, cover_image_url: '', pdf_url: '', text_url: ''});
            }
        } catch (error) {
            toast.error('❌ Failed to add book');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
            
            {/* Title */}
            <input 
                type="text"
                placeholder="Book Title"
                value={book.title}
                onChange={(e) => setBook({...book, title: e.target.value})}
                required
                className="w-full px-4 py-2 border rounded"
            />

            {/* Author */}
            <input 
                type="text"
                placeholder="Author Name"
                value={book.author}
                onChange={(e) => setBook({...book, author: e.target.value})}
                required
                className="w-full px-4 py-2 border rounded"
            />

            {/* Cover Image Upload */}
            <div className="border-2 border-dashed rounded p-4">
                <label className="block font-bold mb-2">📷 Cover Image</label>
                <input 
                    type="file" 
                    accept="image/*"
                    onChange={async (e) => {
                        const result = await uploadCover(e.target.files[0]);
                        setBook({...book, cover_image_url: result.url});
                    }}
                    disabled={uploading}
                />
                {book.cover_image_url && <p className="text-sm text-green-600">✅ Cover uploaded</p>}
            </div>

            {/* PDF Upload */}
            <div className="border-2 border-dashed rounded p-4">
                <label className="block font-bold mb-2">📄 PDF File (Optional)</label>
                <input 
                    type="file" 
                    accept=".pdf"
                    onChange={async (e) => {
                        const result = await uploadPdf(e.target.files[0]);
                        setBook({...book, pdf_url: result.url});
                    }}
                    disabled={uploading}
                />
                {book.pdf_url && <p className="text-sm text-green-600">✅ PDF uploaded</p>}
            </div>

            {/* Text File Upload */}
            <div className="border-2 border-dashed rounded p-4">
                <label className="block font-bold mb-2">📝 Text File (Optional)</label>
                <input 
                    type="file" 
                    accept=".txt,.docx"
                    onChange={async (e) => {
                        const result = await uploadText(e.target.files[0]);
                        setBook({...book, text_url: result.url});
                    }}
                    disabled={uploading}
                />
                {book.text_url && <p className="text-sm text-green-600">✅ Text file uploaded</p>}
            </div>

            {/* Progress Bar */}
            {uploading && (
                <div className="w-full bg-gray-200 rounded h-2">
                    <div 
                        className="bg-blue-500 h-2 rounded transition-all"
                        style={{width: `${progress}%`}}
                    />
                </div>
            )}

            {/* Submit Button */}
            <button 
                type="submit"
                disabled={uploading}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded disabled:opacity-50"
            >
                {uploading ? `Uploading... ${progress}%` : 'Add Book'}
            </button>
        </form>
    );
};
```

## Integration Steps

1. ✅ Add Cloudinary credentials to `.env`
2. ✅ Import the hook: `import { useCloudinaryUpload } from '../hooks/useCloudinaryUpload'`
3. ✅ Use in your component
4. ✅ Store returned URLs in your database
5. ✅ Done!

## Storing URLs in Database

In your AddBookPage or similar:

```javascript
// After successful upload
const bookPayload = {
    title: formData.title,
    author: formData.author,
    // ... other fields ...
    cover_image_url: uploadResult.url,  // ← Cloudinary URL
    pdf_url: pdfResult.url,              // ← Cloudinary URL
    text_url: textResult.url             // ← Cloudinary URL
};

// Send to backend
await bookService.addBook(bookPayload);
```

## No More Local File Storage! 🎉

Your backend no longer needs:
- File upload endpoints
- Local storage management
- File cleanup/deletion
- Bandwidth costs

Just store the URLs from Cloudinary in your database!
