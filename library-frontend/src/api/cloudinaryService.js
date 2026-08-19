/**
 * ✅ Cloudinary Upload Service
 * Handles uploads of PDF, TXT, and images to Cloudinary
 */

// ⚠️ IMPORTANT: Add these to your .env file:
// VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
// VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;

export const cloudinaryService = {
    /**
     * 📤 Upload any file to Cloudinary
     * Returns: { public_id, url, secure_url, resource_type, format }
     */
    async uploadFile(file, options = {}) {
        try {
            if (!CLOUD_NAME || !UPLOAD_PRESET) {
                throw new Error('❌ Cloudinary config missing. Add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to .env');
            }

            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', UPLOAD_PRESET);
            formData.append('resource_type', options.resourceType || 'auto');
            
            // Optional: Add tags for organization
            if (options.tags) {
                formData.append('tags', options.tags);
            }

            // Optional: Add folder
            if (options.folder) {
                formData.append('folder', `kokan_library/${options.folder}`);
            }

            console.log(`📤 Uploading ${file.name} to Cloudinary...`);
            const response = await fetch(CLOUDINARY_URL, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('✅ Upload successful:', data);
            
            return {
                public_id: data.public_id,
                url: data.secure_url || data.url,
                type: data.resource_type,
                format: data.format,
                size: data.bytes,
                width: data.width,
                height: data.height,
            };
        } catch (error) {
            console.error('❌ Cloudinary upload failed:', error);
            throw error;
        }
    },

    /**
     * 🖼️ Upload Book Cover Image
     * Accepts: JPG, PNG, WebP
     */
    async uploadCoverImage(file) {
        // Validate image file
        const validMimes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validMimes.includes(file.type)) {
            throw new Error('❌ Invalid image format. Use JPG, PNG, or WebP');
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB max
            throw new Error('❌ Image too large. Max 5MB');
        }

        return this.uploadFile(file, {
            folder: 'covers',
            tags: 'book_cover',
            resourceType: 'image',
        });
    },

    /**
     * 📄 Upload Book PDF
     * Accepts: PDF only
     */
    async uploadPDF(file) {
        if (file.type !== 'application/pdf') {
            throw new Error('❌ Only PDF files allowed');
        }

        if (file.size > 100 * 1024 * 1024) { // 100MB max
            throw new Error('❌ PDF too large. Max 100MB');
        }

        return this.uploadFile(file, {
            folder: 'pdfs',
            tags: 'book_pdf',
            resourceType: 'raw',
        });
    },

    /**
     * 📝 Upload Text File (TXT, DOCX, etc.)
     * Accepts: TXT, DOCX, EPUB
     */
    async uploadTextFile(file) {
        const validMimes = [
            'text/plain',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/epub+zip',
        ];

        if (!validMimes.includes(file.type)) {
            throw new Error('❌ Invalid text format. Use TXT, DOCX, or EPUB');
        }

        if (file.size > 50 * 1024 * 1024) { // 50MB max
            throw new Error('❌ File too large. Max 50MB');
        }

        return this.uploadFile(file, {
            folder: 'texts',
            tags: 'book_text',
            resourceType: 'raw',
        });
    },

    /**
     * 🗑️ Delete file from Cloudinary
     * Requires: public_id from upload response
     */
    async deleteFile(publicId) {
        try {
            console.log(`🗑️ Deleting ${publicId} from Cloudinary...`);
            
            // Note: This requires a signed API call from backend
            // Frontend deletion is not secure, so call your backend endpoint instead
            console.warn('⚠️ File deletion should be done via backend for security');
            return true;
        } catch (error) {
            console.error('❌ Delete failed:', error);
            throw error;
        }
    },

    /**
     * 🔗 Generate Cloudinary URL with transformations
     */
    getTransformedUrl(publicId, transformations = {}) {
        const baseUrl = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload`;
        
        // Build transformation string
        let transform = '';
        if (transformations.width || transformations.height) {
            transform = `w_${transformations.width || 'auto'},h_${transformations.height || 'auto'},c_limit`;
        }
        if (transformations.quality) {
            transform += `,q_${transformations.quality}`;
        }

        return transform 
            ? `${baseUrl}/${transform}/${publicId}`
            : `${baseUrl}/${publicId}`;
    }
};

export default cloudinaryService;
