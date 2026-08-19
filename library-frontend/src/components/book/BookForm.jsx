// src/components/book/BookForm.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { bookService } from '../../api/bookService'; // Ensure path is correct
import BookFormUI from './BookFormUI';

const BookForm = ({ initialData, isEditing, onBookAdded, onBookUpdated, onCancel }) => {
    
    // --- 1. STATE MANAGEMENT ---
    const [loading, setLoading] = useState(false);
    const [dropdownLoading, setDropdownLoading] = useState(true);
    
    // Dropdown Data
    const [languages, setLanguages] = useState([]);
    const [subcategories, setSubcategories] = useState([]);

    // File Names for UI Display
    const [coverImageName, setCoverImageName] = useState("");
    const [pdfFileName, setPdfFileName] = useState("");
    const [txtFileName, setTxtFileName] = useState(""); // ✅ NEW: State for Text File Name

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
        page_count: "",
        publication_year: "",
        price: "",
        date_of_purchase: "",
        description: "",
        remarks: "",
        serial_number: "",
        book_number: "",
        
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
                const [langRes, subRes] = await Promise.all([
                    bookService.getLanguages(),
                    bookService.getSubcategories()
                ]);
                setLanguages(langRes || []);
                setSubcategories(subRes || []);
            } catch (err) {
                console.error("Error loading dropdowns:", err);
                toast.error("Failed to load form options.");
            } finally {
                setDropdownLoading(false);
            }
        };

        fetchDropdowns();
    }, []);

    // Populate Form if Editing
    useEffect(() => {
        if (isEditing && initialData) {
            setFormData({
                title: initialData.title || "",
                author: initialData.author || "",
                publisher: initialData.publisher || "",
                translator: initialData.translator || "",
                isbn: initialData.isbn || "",
                edition: initialData.edition || "",
                parts_or_volumes: initialData.parts_or_volumes || "",
                subject_number: initialData.subject_number || "",
                language_id: initialData.language?.id || "",
                page_count: initialData.page_count || "",
                publication_year: initialData.publication_year || "",
                price: initialData.price || "",
                date_of_purchase: initialData.date_of_purchase || "",
                description: initialData.description || "",
                remarks: initialData.remarks || "",
                serial_number: initialData.serial_number || "",
                book_number: initialData.book_number || "",
                
                is_restricted: initialData.is_restricted || false,
                is_digital: initialData.is_digital || false,
                
                subcategory_ids: initialData.subcategories ? initialData.subcategories.map(s => s.id) : [],
                
                cover_image: null,
                pdf_file: null,
                txt_file: null,
            });
            // Note: We don't set file names here because we want "No file selected" to show 
            // unless the user picks a NEW file. The UI handles showing "View Current" link.
        }
    }, [isEditing, initialData]);

    // --- 3. HANDLERS ---

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubcategoryChange = (e) => {
        // ✅ FIX: SubcategorySelect sends custom event with value as array
        const { name, value } = e.target;
        if (name === 'subcategory_ids') {
            const categoryIds = Array.isArray(value) 
                ? value.map(v => Number(v))
                : [];
            setFormData(prev => ({ ...prev, subcategory_ids: categoryIds }));
            console.log("📌 Categories selected:", categoryIds);
        }
    };

    // 🔥 CRITICAL FIX: Handle File Selection correctly
    const handleFileChange = (e) => {
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
            } 
            // ✅ THIS IS THE FIX YOU NEEDED
            else if (name === "txtFile") { 
                console.log("📄 Selected Text File:", file.name); // Debug
                setFormData(prev => ({ ...prev, txt_file: file }));
                setTxtFileName(file.name); // Update UI Name
            }
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
        const toastId = toast.loading(isEditing ? "Updating book..." : "Creating book...");

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

            // API Call
            let result;
            if (isEditing) {
                result = await bookService.updateBook(initialData.id, data);
                toast.success("Book updated successfully!", { id: toastId });
                if (onBookUpdated) onBookUpdated(result);
            } else {
                result = await bookService.createBook(data);
                toast.success("Book created successfully!", { id: toastId });
                if (onBookAdded) onBookAdded(result);
            }

        } catch (error) {
            console.error("Submission Error:", error);
            const errMsg = error.response?.data?.detail || "Operation failed.";
            toast.error(errMsg, { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    // --- 4. RENDER UI ---
    return (
        <BookFormUI 
            formData={formData}
            languages={languages}
            subcategories={subcategories}
            initialData={initialData}
            isEditing={isEditing}
            isLoading={loading}
            isDropdownLoading={dropdownLoading}
            
            // File Names Props
            coverImageName={coverImageName}
            pdfFileName={pdfFileName}
            txtFileName={txtFileName} // ✅ Pass state to UI
            
            // Handlers
            onChange={handleChange}
            onSubcategoryChange={handleSubcategoryChange}
            onFileChange={handleFileChange}
            onSubmit={handleSubmit}
            onCancel={onCancel}
        />
    );
};

export default BookForm;