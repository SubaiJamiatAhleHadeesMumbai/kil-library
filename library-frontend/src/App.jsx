import React, { Suspense, lazy, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";

// ================= AUTH & COMMON =================
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Logout from "./pages/Logout";
import NotFound from "./pages/NotFound";
import AccessDenied from "./pages/AccessDenied";
import ProtectedRoute from "./components/common/ProtectedRoute";
import { ADMIN_ALLOWED_ROLES } from "./config/accessControl";
import AnalyticsTracker from "./components/common/AnalyticsTracker";
import { LanguageProvider } from "./context/LanguageContext";
import { ThemeProvider } from "./context/ThemeContext";

// ================= LAYOUTS =================
import Layout from "./components/layout/Layout";
import UserLayout from "./components/layout/UserLayout";

// ================= PUBLIC PAGES =================
import PublicHome from "./pages/PublicHome";
import AboutUs from "./pages/AboutUs";
import GalleryPage from "./pages/GalleryPage";
import Fatawa from "./pages/Fatawa";
import ReadBook from "./pages/ReadBook";
import History from "./pages/History";
import MarkazFeed from "./components/public/MarkazFeed";
import LatestPosts from "./components/public/LatestPosts";

// ================= ADMIN (NON-LAZY) =================
import DonationManager from "./pages/Admin/DonationManager";
import CreatePost from "./pages/Admin/CreatePost";

// ================= LAZY PAGES =================
const Dashboard = lazy(() => import("./pages/Dashboard"));
const BookManagement = lazy(() => import("./pages/BookManagement"));
const AdminBookOrdersPage = lazy(() => import("./pages/Admin/AdminBookOrdersPage"));
const AdminTranslationsPage = lazy(() => import("./pages/Admin/AdminTranslationsPage"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const RoleManagement = lazy(() => import("./pages/RoleManagement"));
const RolePermissionManagement = lazy(() => import("./pages/RolePermissionManagement"));
const ApprovalManagement = lazy(() => import("./pages/ApprovalManagement"));
const CopiesIssuing = lazy(() => import("./pages/CopiesIssuing"));
const LanguageManagement = lazy(() => import("./pages/LanguageManagement"));
const LocationManagement = lazy(() => import("./pages/LocationManagement"));
const CategoryManagement = lazy(() => import("./pages/CategoryManagement"));
const SubcategoryManagement = lazy(() => import("./pages/SubcategoryManagement"));
const RestrictedBookPermissions = lazy(() => import("./pages/RestrictedBookPermissions"));
const DigitalAccessHistory = lazy(() => import("./pages/DigitalAccessHistory"));
const AuditLogPage = lazy(() => import("./pages/AuditLogPage"));
const AccessRequests = lazy(() => import("./components/admin/AccessRequests"));
const BookDetail = lazy(() => import("./pages/Admin/BookDetail"));
const PublicBookDetail = lazy(() => import("./pages/BookDetail"));
const Profile = lazy(() => import("./pages/Profile"));
const UserLibrary = lazy(() => import("./pages/UserLibrary"));
const AddBookPage = lazy(() => import("./pages/AddBookPage"));
const Authors = lazy(() => import("./pages/Authors"));
const Publishers = lazy(() => import("./pages/Publishers"));
const HomepageSettingsPage = lazy(() => import("./pages/Admin/HomepageSettingsPage"));
const AdminNavigationSettingsPage = lazy(() => import("./pages/AdminNavigationSettingsPage"));
const PosterManagementPage = lazy(() => import("./pages/Admin/PosterManagementPage"));
const AboutSettingsPage = lazy(() => import("./pages/Admin/AboutSettingsPage"));
const GalleryManagementPage = lazy(() => import("./pages/Admin/GalleryManagementPage"));
const FatawaManager = lazy(() => import("./pages/Admin/FatawaManager"));
const EditBookPage = lazy(() => import("./pages/Admin/EditBookPage"));
const EducationPage = lazy(() => import("./pages/EducationPage"));
const ActivitiesPage = lazy(() => import("./pages/ActivitiesPage"));
const SocialWorkPage = lazy(() => import("./pages/SocialWorkPage"));
const SocialWorkManager = lazy(() => import("./pages/Admin/SocialWorkManager"));
const NewspaperClippingsPage = lazy(() => import("./pages/NewspaperClippingsPage"));
const NewspaperClippingsManager = lazy(() => import("./pages/Admin/NewspaperClippingsManager"));
const SystemHealthPage = lazy(() => import("./pages/Admin/SystemHealthPage"));
const CommentsModeration = lazy(() => import("./pages/CommentsModeration"));
const AdminThemeCustomizer = lazy(() => import("./pages/Admin/AdminThemeCustomizer"));

// ✅ TEST / URDU EDITOR
const UrduEditor = lazy(() => import("./components/UrduEditor/UrduEditor"));

// ================= HELPERS =================
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const timeoutId = window.setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [pathname]);

  return null;
};

import AppPageLoader from "./components/common/loaders/AppPageLoader";

const PageLoader = () => <AppPageLoader />;

// ================= APP =================
function App() {
  return (
    <>
      <ScrollToTop />
      <AnalyticsTracker />
      <Toaster position="top-center" />

      <ThemeProvider>
        <LanguageProvider>
        <Suspense fallback={<PageLoader />}>
        <Routes>

          {/* ================= PUBLIC / USER ROUTES ================= */}
          <Route path="/" element={<UserLayout />}>
            <Route index element={<PublicHome />} />
            <Route path="about" element={<AboutUs />} />
            <Route path="about/gallery" element={<Navigate to="/gallery" replace />} />
            <Route path="gallery" element={<GalleryPage />} />
            <Route path="fatawa" element={<Fatawa />} />
            <Route path="news" element={<MarkazFeed />} />
            <Route path="posts" element={<LatestPosts />} />
            <Route path="education" element={<EducationPage />} />
            <Route path="activities" element={<ActivitiesPage />} />
            <Route path="social-work" element={<SocialWorkPage />} />
            <Route path="clippings" element={<NewspaperClippingsPage />} />
            <Route path="authors" element={<Authors />} />
            <Route path="publishers" element={<Publishers />} />
            <Route path="books" element={<UserLibrary />} />
            <Route path="books/:id" element={<PublicBookDetail />} />
            <Route path="read/:id" element={<ReadBook />} />
            <Route path="history" element={<History />} />

            {/* ✅ FIXED: TEST EDITOR ROUTE */}
            <Route path="test-editor" element={<UrduEditor />} />

            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="reset-password" element={<ResetPassword />} />
            <Route path="access-denied" element={<AccessDenied />} />

            {/* SECURITY FIX: Profile should be accessible to ALL authenticated users, not just admins */}
            <Route
              path="profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="logout" element={<Logout />} />

          {/* ================= ADMIN ROUTES ================= */}
          <Route
            path="admin"
            element={
              <ProtectedRoute allowedRoles={ADMIN_ALLOWED_ROLES} redirectTo="/access-denied">
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="donation" element={<DonationManager />} />
            <Route path="posts" element={<CreatePost />} />
            <Route path="posts/add" element={<CreatePost />} />
            <Route path="social-work" element={<SocialWorkManager />} />
            <Route path="newspaper-clippings" element={<NewspaperClippingsManager />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="roles" element={<RoleManagement />} />
            <Route path="roles-permissions" element={<RolePermissionManagement />} />
            <Route path="books" element={<BookManagement />} />
            <Route path="book-orders" element={<AdminBookOrdersPage />} />
            <Route path="books/add" element={<AddBookPage />} />
            <Route path="books/:id/edit" element={<EditBookPage />} />
            <Route path="books/:id" element={<BookDetail />} />
            <Route path="copies" element={<CopiesIssuing />} />
            <Route path="categories" element={<CategoryManagement />} />
            <Route path="subcategories" element={<SubcategoryManagement />} />
            <Route path="languages" element={<LanguageManagement />} />
            <Route path="locations" element={<LocationManagement />} />
            <Route path="approvals" element={<ApprovalManagement />} />
            <Route path="access-requests" element={<AccessRequests />} />
            <Route path="book-permissions" element={<RestrictedBookPermissions />} />
            <Route path="restricted-permissions" element={<RestrictedBookPermissions />} />
            <Route path="digital-access" element={<DigitalAccessHistory />} />
            <Route path="digital-access-history" element={<DigitalAccessHistory />} />
            <Route path="logs" element={<AuditLogPage />} />
            <Route path="homepage-settings" element={<HomepageSettingsPage />} />
            <Route path="navigation-settings" element={<AdminNavigationSettingsPage />} />
            <Route path="posters" element={<PosterManagementPage />} />
            <Route path="gallery" element={<GalleryManagementPage />} />
            <Route path="about-settings" element={<AboutSettingsPage />} />
            <Route path="fatawa" element={<FatawaManager />} />
            <Route path="system-health" element={<SystemHealthPage />} />
            <Route path="translations" element={<AdminTranslationsPage />} />
            <Route path="profile" element={<Profile />} />
            <Route path="comments" element={<CommentsModeration />} />
            <Route path="theme-settings" element={<AdminThemeCustomizer />} />
            <Route path="theme-customizer" element={<AdminThemeCustomizer />} />

            {/* (Optional) Admin-only editor */}
            <Route path="test-editor" element={<UrduEditor />} />
          </Route>

          {/* ================= 404 ================= */}
          <Route path="*" element={<NotFound />} />

        </Routes>
      </Suspense>
    </LanguageProvider>
    </ThemeProvider>
    </>
  );
}

export default App;
