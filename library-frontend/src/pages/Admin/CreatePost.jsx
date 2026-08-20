import React, { useEffect, useMemo, useState } from "react";
import { 
    CloudArrowUpIcon, 
    PhotoIcon, 
    DocumentTextIcon, 
  XMarkIcon,
  PencilSquareIcon,
  TrashIcon,
  CalendarDaysIcon,
  ArrowPathIcon
} from "@heroicons/react/24/outline";
import postService from "../../api/postService";

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "" : "http://127.0.0.1:8000");

const CreatePost = () => {
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [existingFileUrl, setExistingFileUrl] = useState("");
  const [editingPostId, setEditingPostId] = useState(null);

  const [loading, setLoading] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState(null);
  const [message, setMessage] = useState({ type: "", text: "" });

  const isImage = useMemo(() => file?.type?.startsWith("image/"), [file]);
  const isPdf = useMemo(() => file?.type === "application/pdf", [file]);

  useEffect(() => {
    fetchAdminPosts();
  }, []);

  const getFileUrl = (path) => {
    if (!path) return null;
    if (String(path).startsWith("http://") || String(path).startsWith("https://")) {
      return path;
    }
    const cleanPath = String(path).startsWith("/") ? path : `/${path}`;
    return `${API_BASE_URL}${cleanPath}`;
  };

  const fetchAdminPosts = async () => {
    setPostsLoading(true);
    try {
      const list = await postService.getAdminPosts();
      setPosts(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error("Error loading posts:", error);
      setMessage({ type: "error", text: "Failed to load existing posts." });
      setPosts([]);
    } finally {
      setPostsLoading(false);
    }
  };

  // ---------------------------
  // Helpers
  // ---------------------------
  const resetForm = () => {
    setTitle("");
    setContent("");
    setTags("");
    setFile(null);
    setPreview(null);
    setExistingFileUrl("");
    setEditingPostId(null);
    setMessage({ type: "", text: "" });

    const input = document.getElementById("fileInput");
    if (input) input.value = "";
  };

  const validateFile = (selectedFile) => {
    if (!selectedFile) return true;

    // size check
    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setMessage({
        type: "error",
        text: `File too large. Max allowed is ${MAX_FILE_SIZE_MB}MB.`,
      });
      return false;
    }

    // type check
    const allowed =
      selectedFile.type.startsWith("image/") ||
      selectedFile.type === "application/pdf";

    if (!allowed) {
      setMessage({
        type: "error",
        text: "Only Images (JPG/PNG/WebP) and PDF files are allowed.",
      });
      return false;
    }

    return true;
  };

  // ---------------------------
  // File Change
  // ---------------------------
  const handleFileChange = (e) => {
    setMessage({ type: "", text: "" });

    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!validateFile(selectedFile)) {
      e.target.value = "";
      return;
    }

    setFile(selectedFile);

    // Image preview
    if (selectedFile.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  };

  const startEdit = (post) => {
    setTitle(post?.title || "");
    setContent(post?.content || "");
    setTags(post?.tags || "");
    setFile(null);
    setPreview(null);
    setExistingFileUrl(post?.file_url || "");
    setEditingPostId(post?.id || null);
    setMessage({ type: "", text: "" });

    const input = document.getElementById("fileInput");
    if (input) input.value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (postId) => {
    const approved = window.confirm("Delete this post? This action cannot be undone.");
    if (!approved) return;

    setDeletingPostId(postId);
    setMessage({ type: "", text: "" });

    try {
      await postService.deletePost(postId);

      if (editingPostId === postId) {
        resetForm();
      }

      setMessage({ type: "success", text: "Post deleted successfully." });
      await fetchAdminPosts();
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Failed to delete post." });
    } finally {
      setDeletingPostId(null);
    }
  };

  // ---------------------------
  // Submit
  // ---------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      setMessage({ type: "error", text: "Title is required!" });
      return;
    }

    setLoading(true);
    setMessage({ type: "", text: "" });

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("content", content);
    formData.append("tags", tags); // Optional tags

    if (file) {
      formData.append("file", file);
    }

    try {
      if (editingPostId) {
        await postService.updatePost(editingPostId, formData);
      } else {
        await postService.createPost(formData);
      }

      setMessage({
        type: "success",
        text: editingPostId ? "Post updated successfully." : "Post published successfully.",
      });

      await fetchAdminPosts();

      setTimeout(() => {
        resetForm();
      }, 1200);
    } catch (err) {
      console.error(err);
      setMessage({
        type: "error",
        text: editingPostId ? "Failed to update post. Please try again." : "Failed to publish post. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------
  // UI
  // ---------------------------
  return (
    <div className="min-h-screen bg-[#F3F6F9] pb-20">
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-extrabold text-[#002147]">
            Post Publishing Studio
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Create, edit, and delete official notices, circulars, event photos, and PDF announcements.
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* --- LEFT COLUMN: Form --- */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Alert Message */}
            {message.text && (
              <div
                className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-semibold animate-in fade-in slide-in-from-top-2 ${
                  message.type === "success"
                    ? "bg-green-50 border-green-200 text-green-700"
                    : "bg-red-50 border-red-200 text-red-700"
                }`}
              >
                <span>{message.type === "success" ? "OK" : "!"}</span>
                {message.text}
              </div>
            )}

            {editingPostId && (
              <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-sm font-semibold flex items-center justify-between gap-3">
                <span>You are editing post #{editingPostId}. Publish will update this record.</span>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border border-amber-300 hover:bg-amber-100"
                >
                  Cancel Edit
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Card 1: Content Details */}
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-5">
                <h2 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">
                    Post Details
                </h2>
                
                {/* Title */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Post Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Annual Library Meeting 2024"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#002147] focus:border-transparent outline-none transition-all font-medium"
                  />
                </div>

                {/* Content */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Description / Message
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write the detailed announcement here..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 min-h-[160px] focus:ring-2 focus:ring-[#002147] focus:border-transparent outline-none transition-all resize-y"
                  />
                </div>

                {/* Tags (Optional Improvement) */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Tags / Category (Optional)
                  </label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="e.g. Notice, Event, Urgent"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#002147] outline-none"
                  />
                </div>
              </div>

              {/* Card 2: File Upload (Improved UI) */}
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4 flex justify-between">
                    <span>Attachments</span>
                    <span className="text-xs font-normal text-gray-500 mt-1">Max 10MB</span>
                </h2>

                {!file && existingFileUrl && (
                  <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
                    Existing attachment is preserved. Upload a new file only if you want to replace it.
                  </div>
                )}

                <div className="relative group">
                    <input
                        id="fileInput"
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    
                    <div className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all duration-200 ${
                        file ? "border-green-400 bg-green-50" : "border-gray-300 bg-gray-50 group-hover:border-[#002147] group-hover:bg-blue-50"
                    }`}>
                        {file ? (
                            <>
                                {isImage ? <PhotoIcon className="w-12 h-12 text-green-600 mb-2" /> : <DocumentTextIcon className="w-12 h-12 text-red-600 mb-2" />}
                                <p className="font-bold text-gray-800">{file.name}</p>
                                <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                <p className="text-xs text-green-600 font-bold mt-2">Click to change file</p>
                            </>
                        ) : (
                            <>
                                <CloudArrowUpIcon className="w-12 h-12 text-gray-400 group-hover:text-[#002147] mb-3 transition-colors" />
                                <p className="font-bold text-gray-700">Click to upload or drag and drop</p>
                                <p className="text-sm text-gray-500 mt-1">SVG, PNG, JPG or PDF</p>
                            </>
                        )}
                    </div>
                </div>

                {/* âœ… IMAGE SIZE INSTRUCTION */}
                <div className="mt-4 bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800">
                  <p className="font-bold mb-1">Recommended Image Size:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs text-blue-700">
                        <li><strong>Landscape (Best for Web):</strong> 1200 x 630 px</li>
                        <li><strong>Square (Instagram Style):</strong> 1080 x 1080 px</li>
                        <li>Ensure text on image is readable.</li>
                    </ul>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex-1 py-3.5 rounded-xl font-bold text-white text-lg shadow-lg hover:shadow-xl transition-all transform active:scale-95 ${
                    loading
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-[#002147] hover:bg-[#003366]"
                  }`}
                >
                  {loading ? "Saving..." : editingPostId ? "Save Changes" : "Publish Post"}
                </button>
                
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={loading}
                  className="px-8 py-3.5 rounded-xl font-bold border border-gray-300 text-gray-700 hover:bg-gray-100 transition-all"
                >
                  Reset
                </button>
              </div>

            </form>
          </div>

          {/* --- RIGHT COLUMN: Live Preview --- */}
          <div className="hidden lg:block">
            <div className="sticky top-24 space-y-4">
                <div className="flex items-center gap-2 text-gray-500 font-bold uppercase tracking-wider text-xs ml-1">
                <span>Live Preview</span>
                </div>

                {/* Preview Card */}
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                    {/* Preview Image */}
                    <div className="w-full bg-gray-100 min-h-[200px] flex items-center justify-center border-b border-gray-100 relative">
                        {file && isImage && preview ? (
                            <img src={preview} alt="Preview" className="w-full h-auto object-cover" />
                        ) : !file && existingFileUrl ? (
                          <img src={getFileUrl(existingFileUrl)} alt="Current attachment" className="w-full h-auto object-cover" />
                        ) : file && isPdf ? (
                            <div className="text-center py-10">
                                <DocumentTextIcon className="w-16 h-16 text-red-500 mx-auto mb-2" />
                                <span className="font-bold text-gray-700">PDF Document</span>
                            </div>
                        ) : (
                            <div className="text-gray-300 flex flex-col items-center">
                                <PhotoIcon className="w-12 h-12" />
                                <span className="text-xs mt-2">No Image</span>
                            </div>
                        )}
                        
                        {/* Remove Image Button (Only in preview) */}
                        {file && (
                             <button onClick={() => {setFile(null); setPreview(null);}} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-red-500 transition">
                                <XMarkIcon className="w-4 h-4" />
                             </button>
                        )}
                    </div>

                    {/* Preview Content */}
                    <div className="p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-1 rounded-md uppercase">
                                {tags || "News"}
                            </span>
                            <span className="text-[10px] text-gray-400">Just now</span>
                        </div>

                        <h3 className="text-lg font-bold text-gray-900 leading-tight mb-2">
                            {title || "Your Post Title..."}
                        </h3>

                        <p className="text-sm text-gray-600 line-clamp-3 whitespace-pre-wrap">
                            {content || "The description of your post will appear here. It gives users a preview of how the announcement will look on the dashboard."}
                        </p>
                    </div>
                </div>
            </div>
          </div>

        </div>

        <div className="mt-10 rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div>
              <h2 className="text-lg font-bold text-[#002147]">Manage Existing Posts</h2>
              <p className="text-xs text-gray-500 mt-1">Edit or delete previously published notices.</p>
            </div>

            <button
              type="button"
              onClick={fetchAdminPosts}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              <ArrowPathIcon className="h-4 w-4" />
              Refresh
            </button>
          </div>

          <div className="p-4 sm:p-6">
            {postsLoading ? (
              <div className="text-sm text-gray-500">Loading posts...</div>
            ) : posts.length === 0 ? (
              <div className="text-sm text-gray-500 rounded-xl border border-dashed border-gray-300 p-6 text-center">
                No posts available.
              </div>
            ) : (
              <div className="space-y-3">
                {posts.map((post) => {
                  const cardFileUrl = getFileUrl(post?.file_url);
                  const hasImage = post?.media_type === "image" && cardFileUrl;

                  return (
                    <div key={post.id} className="rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex gap-3 min-w-0">
                          <div className="h-14 w-14 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0">
                            {hasImage ? (
                              <img src={cardFileUrl} alt={post.title} className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-gray-400">
                                {post?.media_type === "pdf" ? <DocumentTextIcon className="h-6 w-6" /> : <PhotoIcon className="h-6 w-6" />}
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <h3 className="text-sm sm:text-base font-bold text-gray-900 truncate">{post.title}</h3>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2 whitespace-pre-wrap">{post.content || "No description"}</p>

                            <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
                              <span className="inline-flex items-center gap-1">
                                <CalendarDaysIcon className="h-3.5 w-3.5" />
                                {post?.created_at ? new Date(post.created_at).toLocaleDateString() : "N/A"}
                              </span>

                              {post?.tags && (
                                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700 font-semibold uppercase tracking-wide">
                                  {post.tags}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 sm:pl-3">
                          <button
                            type="button"
                            onClick={() => startEdit(post)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                            Edit
                          </button>

                          <button
                            type="button"
                            disabled={deletingPostId === post.id}
                            onClick={() => handleDelete(post.id)}
                            className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold border ${
                              deletingPostId === post.id
                                ? "border-gray-300 text-gray-400 cursor-not-allowed"
                                : "border-red-200 text-red-700 hover:bg-red-50"
                            }`}
                          >
                            <TrashIcon className="h-4 w-4" />
                            {deletingPostId === post.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePost;