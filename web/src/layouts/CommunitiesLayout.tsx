import React, { useState, useMemo } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useCommunities } from '@/features/communities/api';
import CommunityList from '@/features/communities/components/CommunityList';
import CreateCommunityModal from '@/features/communities/components/CreateCommunityModal';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Loader2, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
// import TopNav from '@/components/TopNav'; // No separate TopNav needed based on CommunitiesPage structure

const CommunitiesLayout: React.FC = () => {
  const { data: communities, isLoading, error } = useCommunities();
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  // Extract communityId from URL for highlighting - could use useParams in CommunityList or pass down
  // For simplicity, we won't handle highlighting state here, assuming CommunityList/Card might handle it via URL

  const filteredCommunities = useMemo(() => {
    if (!communities) return [];
    return communities.filter(community =>
      community.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (community.description && community.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [communities, searchTerm]);

  return (
    // No outer flex flex-col needed as ProtectedRoute doesn't provide a layout shell
    <div className="flex h-screen bg-background">
        {/* Sidebar */}
        <aside className="w-64 border-r p-4 flex flex-col flex-shrink-0">
            {/* Header Row - Adjusted after user flex-col change */}
            <div className="flex items-baseline flex-col mb-4"> 
                {/* Title */}
                <h1 className="text-xl font-bold"> 
                    Communities
                </h1>
                {/* User Greeting */}
                {user && (
                    <span className="text-xs text-muted-foreground mt-1">Hi, {user.name}</span>
                     /* Removed the wrapping div and logout button from here */
                )}
            </div>
            
            {/* Search and Add Row */}
            <div className="flex items-center mb-4 space-x-2">
                <Input
                    type="search"
                    placeholder="Search communities..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-grow"
                />
                <CreateCommunityModal>
                    <Button variant="outline" size="icon" aria-label="Create new community">
                        <Plus className="w-4 h-4" />
                    </Button>
                </CreateCommunityModal>
            </div>

            {/* Loading/Error/List Area - Takes up available space */}
            <div className="flex-grow overflow-y-auto mb-4"> {/* Added mb-4 */} 
                {isLoading && (
                    <div className="flex items-center justify-center h-full" role="status" aria-label="Loading communities">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                )}
                {error && (
                    <p className="text-center text-red-600 px-2" role="alert">
                        Error: {error.message}
                    </p>
                )}
                {!isLoading && !error && (
                    <CommunityList
                        communities={filteredCommunities}
                    />
                )}
            </div>

            {/* Logout Button - Pushed to bottom */}
            {user && (
                <Button onClick={logout} variant="outline" size="sm" className="mt-auto"> {/* mt-auto might not be needed due to flex-grow above, but safe */}
                    Logout
                </Button>
            )}
        </aside>

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: '#f5f7fa' }}>
          <Outlet /> {/* Renders SelectCommunityPlaceholder or CommunityPage */}
        </main>
    </div>
  );
};

export default CommunitiesLayout; 