import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Settings, Save } from 'lucide-react';

interface UserSettingsData {
  theme: string;
  language: string;
  notifications_enabled: boolean;
  default_model: string;
  results_per_page: number;
}

const UserSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<UserSettingsData>({
    theme: 'dark',
    language: 'en',
    notifications_enabled: true,
    default_model: 'google/gemini-2.5-flash',
    results_per_page: 10
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [user]);

  const fetchSettings = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching settings:', error);
      return;
    }

    if (data) {
      setSettings({
        theme: data.theme,
        language: data.language,
        notifications_enabled: data.notifications_enabled,
        default_model: data.default_model,
        results_per_page: data.results_per_page
      });
    }
  };

  const handleSaveSettings = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          ...settings
        }, {
          onConflict: 'user_id'
        })
        .select();

      setLoading(false);

      if (error) {
        console.error('Settings save error:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to save settings',
          variant: 'destructive'
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Settings saved successfully'
      });
    } catch (err) {
      setLoading(false);
      console.error('Unexpected error saving settings:', err);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive'
      });
    }
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm p-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Preferences</h3>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="theme">Theme</Label>
          <Select
            value={settings.theme}
            onValueChange={(value) => setSettings({ ...settings, theme: value })}
          >
            <SelectTrigger id="theme">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card/95 backdrop-blur-sm z-50">
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="language">Language</Label>
          <Select
            value={settings.language}
            onValueChange={(value) => setSettings({ ...settings, language: value })}
          >
            <SelectTrigger id="language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card/95 backdrop-blur-sm z-50">
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Español</SelectItem>
              <SelectItem value="fr">Français</SelectItem>
              <SelectItem value="de">Deutsch</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="model">Default AI Model</Label>
          <Select
            value={settings.default_model}
            onValueChange={(value) => setSettings({ ...settings, default_model: value })}
          >
            <SelectTrigger id="model">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card/95 backdrop-blur-sm z-50">
              <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash (Recommended)</SelectItem>
              <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
              <SelectItem value="google/gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</SelectItem>
              <SelectItem value="openai/gpt-5-mini">GPT-5 Mini</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="results">Results Per Page</Label>
          <Select
            value={settings.results_per_page.toString()}
            onValueChange={(value) => setSettings({ ...settings, results_per_page: parseInt(value) })}
          >
            <SelectTrigger id="results">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card/95 backdrop-blur-sm z-50">
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-background/50">
          <div className="space-y-0.5">
            <Label htmlFor="notifications">Notifications</Label>
            <p className="text-xs text-muted-foreground">
              Receive updates about query results
            </p>
          </div>
          <Switch
            id="notifications"
            checked={settings.notifications_enabled}
            onCheckedChange={(checked) =>
              setSettings({ ...settings, notifications_enabled: checked })
            }
          />
        </div>

        <Button
          onClick={handleSaveSettings}
          disabled={loading}
          className="w-full"
        >
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </Card>
  );
};

export default UserSettings;
