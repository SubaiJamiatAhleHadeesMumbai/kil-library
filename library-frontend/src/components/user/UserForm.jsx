// src/components/user/UserForm.jsx
import React, { useState, useEffect } from 'react';
import { 
    UserIcon,
    EnvelopeIcon,
    KeyIcon,
    ShieldCheckIcon, 
    ExclamationTriangleIcon,
    EyeIcon,
    EyeSlashIcon,
    ArrowPathIcon,
    CheckIcon,
    UserCircleIcon
} from '@heroicons/react/24/outline';
import { userService } from '../../api/userService';

const inputBase = 
    'w-full bg-slate-50/80 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-normal outline-none transition-all duration-200 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed';

const selectBase = 
    'w-full bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none transition-all duration-200 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed';

/**
 * 🌟 Ultra-Modern UserForm Component with Generous Modal Padding
 */
const UserForm = ({
    initialData = null,
    roles = [],
    isEditing = false,
    onError = () => {},
    onSubmitSuccess = () => {},
    onCancel = () => {}
}) => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        full_name: '',
        password: '',
        role_id: '',
        status: 'Active'
    });

    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState('');

    useEffect(() => {
        if (initialData) {
            setFormData({
                username: initialData.username || '',
                email: initialData.email || '',
                full_name: initialData.full_name || '',
                password: '',
                role_id: initialData.role_id || initialData.role?.id || '',
                status: initialData.status || 'Active'
            });
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (formError) setFormError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        setIsSubmitting(true);

        try {
            if (!formData.username.trim()) throw new Error('Username is required.');
            if (!formData.email.trim()) throw new Error('Email address is required.');
            if (!isEditing && !formData.password) throw new Error('Password is required for new accounts.');

            const payload = {
                username: formData.username.trim(),
                email: formData.email.trim(),
                full_name: formData.full_name.trim(),
                status: formData.status,
            };

            if (formData.role_id) {
                payload.role_id = Number(formData.role_id);
            }

            if (formData.password) {
                payload.password = formData.password;
            }

            if (isEditing && initialData?.id) {
                await userService.updateUser(initialData.id, payload);
            } else {
                await userService.createUser(payload);
            }

            onSubmitSuccess();
        } catch (err) {
            console.error('User Form Error:', err);
            const msg = err.response?.data?.detail || err.message || 'Failed to save user identity.';
            setFormError(msg);
            onError(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        /* ✅ Fixed Modal Padding (pt-6 pb-6 px-6 sm:px-8) */
        <form onSubmit={handleSubmit} className="space-y-6 pt-6 pb-6 px-6 sm:px-8">
            
            {/* Error Banner */}
            {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700 text-xs font-bold animate-in fade-in duration-200">
                    <ExclamationTriangleIcon className="w-5 h-5 text-rose-600 flex-shrink-0" />
                    <span>{formError}</span>
                </div>
            )}

            {/* Read-Only Security ID Banner */}
            {isEditing && initialData?.id && (
                <div className="flex items-center justify-between p-3 bg-indigo-50/60 rounded-2xl border border-indigo-100 text-xs">
                    <div className="flex items-center gap-2 text-indigo-700 font-bold">
                        <ShieldCheckIcon className="w-4 h-4 text-indigo-600" />
                        <span>SECURITY ACCESS ID</span>
                    </div>
                    <span className="font-mono font-black text-indigo-950 bg-white px-2.5 py-0.5 rounded-lg border border-indigo-200 shadow-2xs">
                        #{String(initialData.id).padStart(3, '0')}
                    </span>
                </div>
            )}

            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                
                {/* Username */}
                <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        Username <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                        <UserIcon className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            placeholder="e.g. tarique"
                            disabled={isSubmitting}
                            className={inputBase}
                            required
                        />
                    </div>
                </div>

                {/* Email Address */}
                <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        Email Address <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                        <EnvelopeIcon className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="user@booknest.com"
                            disabled={isSubmitting}
                            className={inputBase}
                            required
                        />
                    </div>
                </div>

                {/* Full Name */}
                <div className="sm:col-span-2 space-y-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        Full Name
                    </label>
                    <div className="relative flex items-center">
                        <UserCircleIcon className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            name="full_name"
                            value={formData.full_name}
                            onChange={handleChange}
                            placeholder="e.g. Tarique Ahmad"
                            disabled={isSubmitting}
                            className={inputBase}
                        />
                    </div>
                </div>

                {/* Password Input */}
                <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        {isEditing ? 'New Password (Optional)' : 'Account Password'} {!isEditing && <span className="text-rose-500">*</span>}
                    </label>
                    <div className="relative flex items-center">
                        <KeyIcon className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder={isEditing ? 'Leave blank to keep current' : '••••••••'}
                            disabled={isSubmitting}
                            className={`${inputBase} pr-10`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors p-1"
                        >
                            {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {/* Role Select */}
                <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        Authorization Role <span className="text-rose-500">*</span>
                    </label>
                    <select
                        name="role_id"
                        value={formData.role_id}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        className={selectBase}
                    >
                        <option value="">Select Role...</option>
                        {roles.map(r => (
                            <option key={r.id} value={r.id}>
                                {r.name || r.title}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Account Status Selection */}
                <div className="sm:col-span-2 space-y-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        Account Status <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        {['Active', 'Inactive'].map(statusOption => {
                            const isSelected = formData.status === statusOption;
                            return (
                                <button
                                    key={statusOption}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, status: statusOption }))}
                                    className={`
                                        flex items-center justify-between px-4 py-2.5 rounded-xl border text-xs font-bold transition-all duration-200
                                        ${isSelected 
                                            ? statusOption === 'Active' 
                                                ? 'bg-emerald-50 border-emerald-500/60 text-emerald-700 shadow-2xs'
                                                : 'bg-slate-100 border-slate-400 text-slate-700 shadow-2xs'
                                            : 'bg-slate-50/80 border-slate-200 text-slate-500 hover:bg-slate-100'
                                        }
                                    `}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${statusOption === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                        <span>{statusOption}</span>
                                    </div>
                                    {isSelected && <CheckIcon className="w-4 h-4 text-emerald-600" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Modal Footer Actions with Padding */}
            <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all disabled:opacity-50"
                >
                    Cancel
                </button>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-bold shadow-md shadow-indigo-200 transition-all hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? (
                        <>
                            <ArrowPathIcon className="w-4 h-4 animate-spin text-white" />
                            <span>Saving...</span>
                        </>
                    ) : (
                        <span>{isEditing ? 'Update User' : 'Provision User'}</span>
                    )}
                </button>
            </div>
        </form>
    );
};

export default UserForm;