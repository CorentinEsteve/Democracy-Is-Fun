import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCommunities } from '@/features/communities/api';
import CommunityList from '@/features/communities/components/CommunityList';
import CreateCommunityModal from '@/features/communities/components/CreateCommunityModal';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Loader2, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const CommunitiesPage: React.FC = () => {
  const { data: communities, isLoading, error } = useCommunities();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCommunityId, setSelectedCommunityId] = useState<number | null>(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const filteredCommunities = useMemo(() => {
    if (!communities) return [];
    return communities.filter(community =>
      community.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      community.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [communities, searchTerm]);

  const handleSelectCommunity = (id: number) => {
    setSelectedCommunityId(id);
    navigate(`/communities/${id}`);
  };

  return (
    <div className="flex h-screen">
        <div className="w-1/4 p-4 border-r bg-background flex flex-col">
             <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-semibold">Communities</h1>
                 {user && (
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">Hi, {user.name}</span>
                        <Button onClick={logout} variant="ghost" size="sm">Logout</Button>
                    </div>
                )}
             </div>
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

            {isLoading && (
                <div className="flex items-center justify-center flex-grow" role="status" aria-label="Loading communities">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
            )}
            {error && (
                <p className="text-center text-red-600" role="alert">
                    Error loading communities: {error.message}
                </p>
            )}
            {!isLoading && !error && (
                <CommunityList
                    communities={filteredCommunities}
                    selectedCommunityId={selectedCommunityId}
                    onSelect={handleSelectCommunity}
                />
            )}
        </div>

        <div className="flex-grow p-6 bg-muted/40">
             <div className="flex items-center justify-center h-full text-muted-foreground">
                 <p>Select a community to see details.</p>
            </div>
        </div>
    </div>
  );
};

export default CommunitiesPage; 