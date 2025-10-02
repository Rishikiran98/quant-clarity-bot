import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import DashboardHeader from '@/components/DashboardHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Mail, Calendar, Activity, Award, Database, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const getInitials = () => {
    if (!user?.email) return 'U';
    return user.email.substring(0, 2).toUpperCase();
  };

  const memberSince = user?.user_metadata?.created_at 
    ? new Date(user.user_metadata.created_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    : new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });

  const stats = [
    { label: t('profile.totalQueries'), value: '247', icon: Activity, color: 'text-blue-500' },
    { label: t('profile.documentsUploaded'), value: '12', icon: FileText, color: 'text-green-500' },
    { label: t('profile.documentsAccessed'), value: '89', icon: Database, color: 'text-purple-500' },
    { label: t('profile.achievements'), value: '5', icon: Award, color: 'text-yellow-500' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <div className="container mx-auto px-6 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common.backToDashboard')}
        </Button>

        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {t('profile.title')}
            </h1>
            <p className="text-muted-foreground mt-2">
              {t('profile.subtitle')}
            </p>
          </div>

          <div className="grid gap-6">
            {/* Profile Card */}
            <Card>
              <CardHeader>
                <CardTitle>{t('profile.info')}</CardTitle>
                <CardDescription>{t('profile.infoDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                  <Avatar className="h-32 w-32 border-4 border-primary/20">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-4xl font-bold">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 space-y-4 text-center md:text-left">
                    <div>
                      <h3 className="text-2xl font-bold">{t('profile.info')}</h3>
                      <Badge variant="secondary" className="mt-2">
                        {t('profile.activeMember')}
                      </Badge>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-center md:justify-start gap-3">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm">{user?.email}</span>
                      </div>
                      <div className="flex items-center justify-center md:justify-start gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm">{t('profile.joined')} {memberSince}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Activity Stats */}
            <Card>
              <CardHeader>
                <CardTitle>{t('profile.activityStats')}</CardTitle>
                <CardDescription>{t('profile.activityStatsDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {stats.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                      <div key={index} className="flex flex-col items-center p-4 rounded-lg border border-border bg-card/50">
                        <Icon className={`h-8 w-8 mb-2 ${stat.color}`} />
                        <span className="text-2xl font-bold">{stat.value}</span>
                        <span className="text-xs text-muted-foreground text-center mt-1">
                          {stat.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Account Settings Quick Link */}
            <Card>
              <CardHeader>
                <CardTitle>{t('profile.accountSettings')}</CardTitle>
                <CardDescription>{t('profile.accountSettingsDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate('/settings')} className="w-full md:w-auto">
                  {t('profile.goToSettings')}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
