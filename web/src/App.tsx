import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
// import CommunitiesPage from './pages/CommunitiesPage'; // Likely no longer needed
import CommunityPage from './pages/CommunityPage';
import RegisterPage from './pages/RegisterPage';
import ProtectedRoute from './components/ProtectedRoute';
import CommunitiesLayout from './layouts/CommunitiesLayout'; // Import new layout
import SelectCommunityPlaceholder from './components/SelectCommunityPlaceholder'; // Import placeholder
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected Routes - Renders TopNav/base layout and Outlet */}
            <Route element={<ProtectedRoute />}>
              {/* Communities section with its own layout (sidebar + main content area) */}
              <Route path="/communities" element={<CommunitiesLayout />}>
                <Route index element={<SelectCommunityPlaceholder />} /> {/* Show placeholder at /communities */}
                <Route path=":communityId" element={<CommunityPage />} /> {/* Show community details at /communities/:id */}
              </Route>
              
              {/* Root path defaults to communities - needs adjustment if ProtectedRoute handles redirect */}
              {/* Consider if ProtectedRoute should redirect to /communities if logged in */}
              {/* Or add a default route here if needed, but /communities seems like the logical root */}
              <Route path="/" element={<CommunitiesLayout />} /> {/* Redirect or render layout? Check ProtectedRoute logic */} 

            </Route>

            {/* Optional: Add a 404 Not Found Route */}
            {/* <Route path="*" element={<div>404 Not Found</div>} /> */}
          </Routes>
        </Router>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App; 