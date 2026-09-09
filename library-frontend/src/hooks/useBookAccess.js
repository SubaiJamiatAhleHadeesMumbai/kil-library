import { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';

export const useBookAccess = (books, isAuth) => {
    const [accessStatuses, setAccessStatuses] = useState({});
    const [isChecking, setIsChecking] = useState(false);

    useEffect(() => {
        // Agar user Login nahi hai, ya books load nahi huin, to check karne ka faida nahi
        if (!books || books.length === 0 || !isAuth) {
            setAccessStatuses({}); // Reset statuses
            return;
        }

        const fetchAllStatuses = async () => {
            setIsChecking(true);
            const statusMap = {};
            
            const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token'); 
            if (!token) {
                setAccessStatuses({});
                setIsChecking(false);
                return;
            }

            try {
                // Sirf restricted books ko filter karein
                const restrictedBooks = books.filter(b => b.is_restricted);

                // Parallel Requests (Fast Speed)
                await Promise.all(
                    restrictedBooks.map(async (book) => {
                        try {
                            const res = await apiClient.get(`/api/restricted-requests/check-status?book_id=${book.id}`);
                            statusMap[book.id] = res.data; 
                        } catch (err) {
                            console.error(`Status check failed for book ${book.id}`, err);
                            statusMap[book.id] = { status: 'not_requested', can_read: false };
                        }
                    })
                );

                setAccessStatuses(statusMap);
            } catch (error) {
                console.error("Access check process failed", error);
            } finally {
                setIsChecking(false);
            }
        };

        fetchAllStatuses();
    }, [books, isAuth]);

    return { accessStatuses, isChecking };
};