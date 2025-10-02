import DashboardHeader from '@/components/DashboardHeader';
import UserSettings from '@/components/UserSettings';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Settings = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

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

        <div className="max-w-3xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {t('settings.title')}
            </h1>
            <p className="text-muted-foreground mt-2">
              {t('settings.subtitle')}
            </p>
          </div>

          <UserSettings />
        </div>
      </div>
    </div>
  );
};

export default Settings;
