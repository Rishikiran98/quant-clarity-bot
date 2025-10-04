import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Mail, Calendar, Activity, Award } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const ProfileSidebar = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    queriesMade: 0,
    documentsAccessed: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      try {
        const { count: queryCount } = await supabase
          .from('query_history')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        const { count: docCount } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .eq('owner_id', user.id);

        setStats({
          queriesMade: queryCount || 0,
          documentsAccessed: docCount || 0,
        });
      } catch (error) {
        console.error('Error fetching profile stats:', error);
      }
    };

    fetchStats();
  }, [user]);

  const getInitials = () => {
    if (!user?.email) return 'U';
    return user.email.substring(0, 2).toUpperCase();
  };

  const memberSince = user?.user_metadata?.created_at 
    ? new Date(user.user_metadata.created_at).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric'
      })
    : new Date().toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric'
      });

  const activityStats = [
    { label: 'Queries Made', value: stats.queriesMade.toString(), icon: Activity },
    { label: 'Documents Accessed', value: stats.documentsAccessed.toString(), icon: Award },
  ];

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm p-6 space-y-6">
      <div className="flex flex-col items-center text-center space-y-4">
        <Avatar className="h-24 w-24 border-4 border-primary/20">
          <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-2xl font-bold">
            {getInitials()}
          </AvatarFallback>
        </Avatar>
        
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">User Profile</h3>
          <Badge variant="secondary" className="text-xs">
            Active Member
          </Badge>
        </div>
      </div>

      <div className="space-y-3 pt-4 border-t border-border/50">
        <div className="flex items-center gap-3 text-sm">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground truncate">{user?.email}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Joined {memberSince}</span>
        </div>
      </div>

      <div className="space-y-3 pt-4 border-t border-border/50">
        <h4 className="text-sm font-semibold">Activity Stats</h4>
        {activityStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
              <span className="text-sm font-semibold">{stat.value}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default ProfileSidebar;
