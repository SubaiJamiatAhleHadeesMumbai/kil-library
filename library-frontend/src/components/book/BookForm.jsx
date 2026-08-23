// src/components/book/BookForm.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { bookService } from '../../api/bookService'; // Ensure path is correct
import BookFormUI from './BookFormUI';
import ErrorBoundary from '../ErrorBoundary';

const BookForm = ({ initialData, isEditing, onBookAdded, onBookUpdated, onCancel }) => {
    
    // --- 1. STATE MANAGEMENT ---
    const [loading, setLoading] = useState(false);
    const [dropdownLoading, setDropdownLoading] = useState(true);
    
    // Dropdown Data
    const [languages, setLanguages] = useState([]);
    const [subcategories, setSubcategories] = useState([]);
    const [fatawaCategories, setFatawaCategories] = useState([]);

    // File Names and Size for UI Display
    const [coverImageName, setCoverImageName] = useState("");
    const [pdfFileName, setPdfFileName] = useState("");
    const [pdfFileSizeMb, setPdfFileSizeMb] = useState(null);
    const [txtFileName, setTxtFileName] = useState(""); // ✅ NEW: State for Text File Name

    // Live Upload & Compression Progress State (1% to 100%)
    const [uploadProgress, setUploadProgress] = useState(null);
    const [uploadStatusText, setUploadStatusText] = useState("");

    // Form Data
    const [formData, setFormData] = useState({
        title: "",
        author: "",
        publisher: "",
        translator: "",
        isbn: "",
        edition: "",
        parts_or_volumes: "",
        subject_number: "",
        language_id: "",
        fatawa_category_id: "",
        page_count: "",
        publication_year: "",
        price: "",
        date_of_purchase: "",
        description: "",
        remarks: "",
        serial_number: "",
        book_number: "",
        total_copies: 1,
        extra_data: "",
        
        is_restricted: false,
        is_digital: false,
        
        subcategory_ids: [],
        
        // File Objects (Binary)
        cover_image: null,
        pdf_file: null,
        txt_file: null, // ✅ NEW: State for File Object
    });

    // --- 2. INITIALIZATION ---
    useEffect(() => {
        const fetchDropdowns = async () => {
            try {
                // Parallel Fetching for speed
                const [langRes, subRes, fatawaRes] = await Promise.all([
                    bookService.getLanguages(),
                    bookService.getSubcategories(),
                    bookService.getFatawaCategories(),
                ]);
                setLanguages(langRes || []);
                setSubcategories(subRes || []);
                setFatawaCategories(fatawaRes || []);
            } catch (err) {
                console.error("Error loading dropdowns:", err);
                toast.error("Failed to load form options.");
            } finally {
                setDropdownLoading(false);
            }
        };

        fetchDropdowns();
    }, []);

    // Populate Form if Editing or Pre-filling from Excel
    useEffect(() => {
        if (initialData) {
            // Find language by ID or by Name
            let matchedLangId = initialData.language_id || initialData.language?.id || "";
            if (!matchedLangId && initialData.language_name && languages.length > 0) {
                const normSearch = String(initialData.language_name).toLowerCase().trim();
                const matched = languages.find(l => {
                    const lName = String(l.name).toLowerCase().trim();
                    return lName.includes(normSearch) || normSearch.includes(lName) ||
                           (normSearch.includes('urdu') && lName.includes('urdu')) ||
                           (normSearch.includes('اردو') && lName.includes('urdu')) ||
                           (normSearch.includes('arabic') && lName.includes('arabic')) ||
                           (normSearch.includes('عربی') && lName.includes('arabic')) ||
                           (normSearch.includes('english') && lName.includes('english')) ||
                           (normSearch.includes('انگریزی') && lName.includes('english')) ||
                           (normSearch.includes('انگريزي') && lName.includes('english')) ||
                           (normSearch.includes('انگلش') && lName.includes('english')) ||
                           (normSearch.includes('hindi') && lName.includes('hindi')) ||
                           (normSearch.includes('ہندی') && lName.includes('hindi'));
                });
                if (matched) matchedLangId = matched.id;
            }
            if (!matchedLangId && languages.length > 0 && !isEditing) {
                const urdu = languages.find(l => String(l.name).toLowerCase().includes('urdu'));
                matchedLangId = urdu ? urdu.id : languages[0].id;
            }

            // Find subcategories by IDs or Name
            let matchedSubIds = initialData.subcategory_ids || (initialData.subcategories ? initialData.subcategories.map(s => s.id) : []);
            if (matchedSubIds.length === 0 && (initialData.subcategory_name || initialData.category_name) && subcategories.length > 0) {
                const searchNames = [initialData.subcategory_name, initialData.category_name].filter(Boolean).map(n => String(n).toLowerCase().trim());
                const matchedSubs = subcategories.filter(s => {
                    const sName = String(s.name).toLowerCase().trim();
                    return searchNames.some(sn => sName.includes(sn) || sn.includes(sName));
                });
                if (matchedSubs.length > 0) {
                    matchedSubIds = matchedSubs.map(s => s.id);
                }
            }

            setFormData(prev => ({
                ...prev,
                title: initialData.title ?? prev.title,
                author: initialData.author ?? prev.author,
                publisher: initialData.publisher ?? prev.publisher,
                translator: initialData.translator ?? prev.translator,
                isbn: initialData.isbn ?? prev.isbn,
                edition: initialData.edition ?? prev.edition,
                parts_or_volumes: initialData.parts_or_volumes ?? prev.parts_or_volumes,
                subject_number: initialData.subject_number ?? prev.subject_number,
                language_id: matchedLangId || prev.language_id,
                fatawa_category_id: initialData.fatawa_category_id ?? prev.fatawa_category_id,
                page_count: initialData.page_count ?? prev.page_count,
                publication_year: initialData.publication_year ?? prev.publication_year,
                price: initialData.price ?? prev.price,
                date_of_purchase: initialData.date_of_purchase ?? prev.date_of_purchase,
                description: initialData.description ?? prev.description,
                remarks: initialData.remarks ?? prev.remarks,
                serial_number: initialData.serial_number ?? prev.serial_number,
                book_number: initialData.book_number ?? prev.book_number,
                total_copies: initialData.quantity ?? initialData.total_copies ?? prev.total_copies ?? 1,
                extra_data: initialData.extra_data ?? prev.extra_data ?? "",
                is_restricted: initialData.is_restricted ?? prev.is_restricted,
                is_digital: initialData.is_digital ?? prev.is_digital,
                subcategory_ids: matchedSubIds.length > 0 ? matchedSubIds : prev.subcategory_ids,
            }));
        }
    }, [isEditing, initialData, languages, subcategories]);

    // --- 3. HANDLERS ---

    const handleChange = (e) => {
        try {
            const { name, value, type, checked } = e.target;
            setFormData(prev => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : value
            }));
        } catch (err) {
            console.error('handleChange: unexpected event shape', err, e);
        }
    };

    const handleSubcategoryChange = (e) => {
        try {
            // ✅ FIX: SubcategorySelect sends custom event with value as array
            const { name, value } = e.target;
            if (name === 'subcategory_ids') {
                const categoryIds = Array.isArray(value) 
                    ? value.map(v => Number(v))
                    : [];
                setFormData(prev => ({ ...prev, subcategory_ids: categoryIds }));
                console.log("📌 Categories selected:", categoryIds);
            }
        } catch (err) {
            console.error('handleSubcategoryChange: unexpected event shape', err, e);
        }
    };

    // 🔥 CRITICAL FIX: Handle File Selection correctly
    const handleFileChange = (e) => {
        try {
            const { name, files } = e.target;
            if (files && files[0]) {
                const file = files[0];

                if (name === "coverImageFile") {
                    setFormData(prev => ({ ...prev, cover_image: file }));
                    setCoverImageName(file.name);
                } 
                else if (name === "pdfFile") {
                    setFormData(prev => ({ ...prev, pdf_file: file }));
                    setPdfFileName(file.name);
                    const szMb = Number((file.size / (1024 * 1024)).toFixed(1));
                    setPdfFileSizeMb(szMb);
                } 
                // ✅ THIS IS THE FIX YOU NEEDED
                else if (name === "txtFile") { 
                    console.log("📄 Selected Text File:", file.name); // Debug
                    setFormData(prev => ({ ...prev, txt_file: file }));
                    setTxtFileName(file.name); // Update UI Name
                }
            }
        } catch (err) {
            console.error('handleFileChange: unexpected event shape', err, e);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Basic Validation
        if (!formData.title || !formData.language_id) {
            toast.error("Title and Language are required.");
            return;
        }

        setLoading(true);
        setUploadProgress(1);
        setUploadStatusText("Initiating upload...");
        const toastId = toast.loading(isEditing ? "Updating book..." : "Creating book...");

        const onUploadProgress = (progressEvent) => {
            if (progressEvent.total) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                setUploadProgress(percentCompleted);
                const loadedMb = (progressEvent.loaded / (1024 * 1024)).toFixed(1);
                const totalMb = (progressEvent.total / (1024 * 1024)).toFixed(1);
                if (percentCompleted < 100) {
                    setUploadStatusText(`Uploading files: ${loadedMb} MB / ${totalMb} MB (${percentCompleted}%)`);
                } else {
                    setUploadStatusText("File upload 100% complete. Optimizing & saving book...");
                }
            }
        };

        try {
            const data = new FormData();

            // Append all simple fields
            Object.keys(formData).forEach(key => {
                // Skip files & arrays initially
                if (!['cover_image', 'pdf_file', 'txt_file', 'subcategory_ids'].includes(key)) {
                    if (formData[key] !== null && formData[key] !== "") {
                        data.append(key, formData[key]);
                    }
                }
            });

            // Append Arrays
            formData.subcategory_ids.forEach(id => data.append("subcategory_ids", id));

            // Append Files (Only if new file selected)
            if (formData.cover_image) data.append("cover_image", formData.cover_image);
            if (formData.pdf_file) data.append("pdf_file", formData.pdf_file);
            
            // ✅ Append Text File
            if (formData.txt_file) {
                console.log("📤 Uploading TXT:", formData.txt_file.name);
                data.append("txt_file", formData.txt_file);
            }

            // API Call with progress callback
            let result;
            if (isEditing) {
                result = await bookService.updateBook(initialData.id, data, onUploadProgress);
                toast.success("Book updated successfully!", { id: toastId });
                if (onBookUpdated) onBookUpdated(result);
            } else {
                result = await bookService.createBook(data, onUploadProgress);
                toast.success("Book created successfully!", { id: toastId });
                if (onBookAdded) onBookAdded(result);
            }

        } catch (error) {
            console.error("Submission Error:", error);
            const errMsg = error.response?.data?.detail || "Operation failed.";
            toast.error(errMsg, { id: toastId });
        } finally {
            setLoading(false);
            setUploadProgress(null);
            setUploadStatusText("");
        }
    };

    // --- 4. RENDER UI ---
    return (
        <ErrorBoundary>
            <BookFormUI 
                formData={formData}
                languages={languages}
                subcategories={subcategories}
                fatawaCategories={fatawaCategories}
                initialData={initialData}
                isEditing={isEditing}
                isLoading={loading}
                isDropdownLoading={dropdownLoading}
                
                // File Names & Progress Props
                coverImageName={coverImageName}
                pdfFileName={pdfFileName}
                pdfFileSizeMb={pdfFileSizeMb}
                txtFileName={txtFileName}
                uploadProgress={uploadProgress}
                uploadStatusText={uploadStatusText}
                
                // Handlers
                onChange={handleChange}
                onSubcategoryChange={handleSubcategoryChange}
                onFileChange={handleFileChange}
                onSubmit={handleSubmit}
                onCancel={onCancel}
            />
        </ErrorBoundary>
    );
};

export default BookForm;