/**
 * ✅ useCloudinaryUpload Hook
 * Simplifies Cloudinary uploads in React components
 */

import { useState } from 'react';
import { cloudinaryService } from '../api/cloudinaryService';

export const useCloudinaryUpload = () => {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [uploadedFiles, setUploadedFiles] = useState({});

    /**
     * Upload Cover Image
     */
    const uploadCover = async (file) => {
        if (!file) return null;
        
        try {
            setUploading(true);
            setProgress(0);
            
            // Simulate progress
            const progressInterval = setInterval(() => {
                setProgress(prev => Math.min(prev + Math.random() * 30, 90));
            }, 100);

            const result = await cloudinaryService.uploadCoverImage(file);
            
            clearInterval(progressInterval);
            setProgress(100);
            
            setUploadedFiles(prev => ({
                ...prev,
                cover: result
            }));

            return result;
        } catch (error) {
            console.error('Cover upload error:', error);
            throw error;
        } finally {
            setUploading(false);
            setProgress(0);
        }
    };

    /**
     * Upload PDF
     */
    const uploadPdf = async (file) => {
        if (!file) return null;
        
        try {
            setUploading(true);
            setProgress(0);

            const progressInterval = setInterval(() => {
                setProgress(prev => Math.min(prev + Math.random() * 20, 90));
            }, 200);

            const result = await cloudinaryService.uploadPDF(file);
            
            clearInterval(progressInterval);
            setProgress(100);
            
            setUploadedFiles(prev => ({
                ...prev,
                pdf: result
            }));

            return result;
        } catch (error) {
            console.error('PDF upload error:', error);
            throw error;
        } finally {
            setUploading(false);
            setProgress(0);
        }
    };

    /**
     * Upload Text File
     */
    const uploadText = async (file) => {
        if (!file) return null;
        
        try {
            setUploading(true);
            setProgress(0);

            const progressInterval = setInterval(() => {
                setProgress(prev => Math.min(prev + Math.random() * 25, 90));
            }, 150);

            const result = await cloudinaryService.uploadTextFile(file);
            
            clearInterval(progressInterval);
            setProgress(100);
            
            setUploadedFiles(prev => ({
                ...prev,
                text: result
            }));

            return result;
        } catch (error) {
            console.error('Text upload error:', error);
            throw error;
        } finally {
            setUploading(false);
            setProgress(0);
        }
    };

    /**
     * Upload Generic File
     */
    const uploadFile = async (file, fileType = 'cover') => {
        switch(fileType) {
            case 'cover':
                return uploadCover(file);
            case 'pdf':
                return uploadPdf(file);
            case 'text':
                return uploadText(file);
            default:
                throw new Error('Unknown file type');
        }
    };

    /**
     * Reset all uploads
     */
    const reset = () => {
        setUploading(false);
        setProgress(0);
        setUploadedFiles({});
    };

    return {
        uploading,
        progress,
        uploadedFiles,
        uploadCover,
        uploadPdf,
        uploadText,
        uploadFile,
        reset,
    };
};

export default useCloudinaryUpload;
