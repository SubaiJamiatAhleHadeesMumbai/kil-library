# ☁️ Cloudinary Setup Guide

## Step 1: Create Cloudinary Account
1. Go to https://cloudinary.com/
2. Sign up for a free account
3. Verify your email

## Step 2: Get Your Credentials
1. Go to your Cloudinary Dashboard (https://cloudinary.com/console)
2. You'll see your **Cloud Name** at the top
3. Create an **Upload Preset**:
   - Go to Settings → Upload
   - Scroll to "Upload presets"
   - Click "Create upload preset"
   - Name: `kokan_library`
   - Mode: Unsigned (for frontend uploads)
   - Save

## Step 3: Add to Environment Variables

Create or update `.env` file in `library-frontend/` with:

```env
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name_here
VITE_CLOUDINARY_UPLOAD_PRESET=kokan_library
```

**Example:**
```env
VITE_CLOUDINARY_CLOUD_NAME=dh5kmwbps
VITE_CLOUDINARY_UPLOAD_PRESET=kokan_library
```

## Step 4: Update Your Code

### For Book Cover Upload (in AddBookPage or BookManagement):

```javascript
import { cloudinaryService } from '../api/cloudinaryService';

// When user selects cover image
const handleCoverUpload = async (file) => {
    try {
        const result = await cloudinaryService.uploadCoverImage(file);
        setCoverImageUrl(result.url);
        setCoverImagePublicId(result.public_id); // Save for deletion later
    } catch (error) {
        toast.error(error.message);
    }
};
```

### For PDF Upload:

```javascript
const handlePDFUpload = async (file) => {
    try {
        const result = await cloudinaryService.uploadPDF(file);
        setPdfUrl(result.url);
        setPdfPublicId(result.public_id);
    } catch (error) {
        toast.error(error.message);
    }
};
```

### For Text File Upload:

```javascript
const handleTextUpload = async (file) => {
    try {
        const result = await cloudinaryService.uploadTextFile(file);
        setTextUrl(result.url);
        setTextPublicId(result.public_id);
    } catch (error) {
        toast.error(error.message);
    }
};
```

## File Size Limits (Free Plan)
- **Cover Image**: 5MB max
- **PDF**: 100MB max
- **Text File**: 50MB max

## File Types Supported
- **Images**: JPG, PNG, WebP
- **PDFs**: PDF only
- **Text**: TXT, DOCX, EPUB

## Benefits of Using Cloudinary
✅ No server storage needed
✅ Automatic image optimization
✅ CDN distribution (fast downloads worldwide)
✅ Free tier: 25GB storage
✅ Easy deletion/management
✅ Analytics and statistics

## Example Integration in AddBookPage

```jsx
import { cloudinaryService } from '../api/cloudinaryService';

const handleCoverChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
        const result = await cloudinaryService.uploadCoverImage(file);
        setFormData({
            ...formData,
            cover_image: result.url // Save URL
        });
        toast.success('✅ Cover uploaded successfully');
    } catch (error) {
        toast.error(error.message);
    } finally {
        setUploading(false);
    }
};
```

## API Response Format

After successful upload:
```javascript
{
    public_id: "kokan_library/covers/abc123",
    url: "https://res.cloudinary.com/..../image/upload/..../abc123.jpg",
    type: "image",
    format: "jpg",
    size: 245000,
    width: 400,
    height: 600
}
```

## Troubleshooting

❌ **"Cloudinary config missing"**
- Check .env file exists in `library-frontend/`
- Verify `VITE_CLOUDINARY_CLOUD_NAME` and `VITE_CLOUDINARY_UPLOAD_PRESET` are set
- Restart dev server after adding env vars

❌ **Upload fails silently**
- Check browser console for errors
- Verify upload preset is set to "Unsigned"
- Check file size limits

❌ **Files not appearing**
- Go to Cloudinary dashboard → Media Library
- Check if file is there
- If visible in dashboard but not working, check URL format
