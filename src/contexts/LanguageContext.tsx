import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';

type Language = 'en' | 'es' | 'fr' | 'de';

interface Translations {
  [key: string]: {
    [key: string]: string;
  };
}

const translations: Translations = {
  en: {
    // Header
    'app.title': 'Financial RAG',
    'app.subtitle': 'AI-Powered Analytics',
    'header.myAccount': 'My Account',
    'header.profile': 'Profile',
    'header.settings': 'Settings',
    'header.signOut': 'Sign Out',
    
    // Dashboard
    'dashboard.title': 'Financial Intelligence Dashboard',
    'dashboard.subtitle': 'AI-powered document retrieval and analysis system for financial data. Get instant insights with grounded, auditable responses.',
    'dashboard.overview': 'Overview',
    'dashboard.overviewDesc': 'Key performance indicators for your RAG system',
    'dashboard.queryEngine': 'Query Engine',
    'dashboard.queryEngineDesc': 'Ask questions and get AI-powered insights from your documents',
    'dashboard.documentLibrary': 'Document Library',
    'dashboard.advancedAnalytics': 'Advanced Analytics',
    'dashboard.advancedAnalyticsDesc': 'Deep insights into retrieval quality and system performance',
    
    // Settings
    'settings.title': 'Settings',
    'settings.subtitle': 'Manage your account settings and preferences',
    'settings.preferences': 'Preferences',
    'settings.theme': 'Theme',
    'settings.language': 'Language',
    'settings.defaultModel': 'Default AI Model',
    'settings.resultsPerPage': 'Results Per Page',
    'settings.notifications': 'Notifications',
    'settings.notificationsDesc': 'Receive updates about query results',
    'settings.save': 'Save Settings',
    'settings.saving': 'Saving...',
    'settings.saveSuccess': 'Settings saved successfully',
    'settings.saveError': 'Failed to save settings',
    
    // Profile
    'profile.title': 'Profile',
    'profile.subtitle': 'View and manage your profile information',
    'profile.info': 'Profile Information',
    'profile.infoDesc': 'Your account details and status',
    'profile.activeMember': 'Active Member',
    'profile.joined': 'Joined',
    'profile.activityStats': 'Activity Statistics',
    'profile.activityStatsDesc': 'Your usage metrics and achievements',
    'profile.totalQueries': 'Total Queries',
    'profile.documentsUploaded': 'Documents Uploaded',
    'profile.documentsAccessed': 'Documents Accessed',
    'profile.achievements': 'Achievements',
    'profile.accountSettings': 'Account Settings',
    'profile.accountSettingsDesc': 'Manage your preferences and account settings',
    'profile.goToSettings': 'Go to Settings',
    
    // Common
    'common.backToDashboard': 'Back to Dashboard',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
  },
  es: {
    // Header
    'app.title': 'RAG Financiero',
    'app.subtitle': 'Análisis con IA',
    'header.myAccount': 'Mi Cuenta',
    'header.profile': 'Perfil',
    'header.settings': 'Configuración',
    'header.signOut': 'Cerrar Sesión',
    
    // Dashboard
    'dashboard.title': 'Panel de Inteligencia Financiera',
    'dashboard.subtitle': 'Sistema de recuperación y análisis de documentos financieros con IA. Obtenga información instantánea con respuestas fundamentadas y auditables.',
    'dashboard.overview': 'Resumen',
    'dashboard.overviewDesc': 'Indicadores clave de rendimiento de su sistema RAG',
    'dashboard.queryEngine': 'Motor de Consultas',
    'dashboard.queryEngineDesc': 'Haga preguntas y obtenga información con IA de sus documentos',
    'dashboard.documentLibrary': 'Biblioteca de Documentos',
    'dashboard.advancedAnalytics': 'Análisis Avanzado',
    'dashboard.advancedAnalyticsDesc': 'Información detallada sobre la calidad de recuperación y el rendimiento del sistema',
    
    // Settings
    'settings.title': 'Configuración',
    'settings.subtitle': 'Administre la configuración y preferencias de su cuenta',
    'settings.preferences': 'Preferencias',
    'settings.theme': 'Tema',
    'settings.language': 'Idioma',
    'settings.defaultModel': 'Modelo de IA Predeterminado',
    'settings.resultsPerPage': 'Resultados por Página',
    'settings.notifications': 'Notificaciones',
    'settings.notificationsDesc': 'Reciba actualizaciones sobre los resultados de consultas',
    'settings.save': 'Guardar Configuración',
    'settings.saving': 'Guardando...',
    'settings.saveSuccess': 'Configuración guardada correctamente',
    'settings.saveError': 'Error al guardar la configuración',
    
    // Profile
    'profile.title': 'Perfil',
    'profile.subtitle': 'Ver y administrar su información de perfil',
    'profile.info': 'Información del Perfil',
    'profile.infoDesc': 'Detalles y estado de su cuenta',
    'profile.activeMember': 'Miembro Activo',
    'profile.joined': 'Unido',
    'profile.activityStats': 'Estadísticas de Actividad',
    'profile.activityStatsDesc': 'Sus métricas de uso y logros',
    'profile.totalQueries': 'Consultas Totales',
    'profile.documentsUploaded': 'Documentos Subidos',
    'profile.documentsAccessed': 'Documentos Accedidos',
    'profile.achievements': 'Logros',
    'profile.accountSettings': 'Configuración de Cuenta',
    'profile.accountSettingsDesc': 'Administre sus preferencias y configuración de cuenta',
    'profile.goToSettings': 'Ir a Configuración',
    
    // Common
    'common.backToDashboard': 'Volver al Panel',
    'common.loading': 'Cargando...',
    'common.error': 'Error',
    'common.success': 'Éxito',
  },
  fr: {
    // Header
    'app.title': 'RAG Financier',
    'app.subtitle': 'Analytique IA',
    'header.myAccount': 'Mon Compte',
    'header.profile': 'Profil',
    'header.settings': 'Paramètres',
    'header.signOut': 'Se Déconnecter',
    
    // Dashboard
    'dashboard.title': 'Tableau de Bord Intelligence Financière',
    'dashboard.subtitle': 'Système de récupération et d\'analyse de documents financiers alimenté par l\'IA. Obtenez des informations instantanées avec des réponses fondées et vérifiables.',
    'dashboard.overview': 'Aperçu',
    'dashboard.overviewDesc': 'Indicateurs clés de performance de votre système RAG',
    'dashboard.queryEngine': 'Moteur de Requête',
    'dashboard.queryEngineDesc': 'Posez des questions et obtenez des informations IA de vos documents',
    'dashboard.documentLibrary': 'Bibliothèque de Documents',
    'dashboard.advancedAnalytics': 'Analytique Avancée',
    'dashboard.advancedAnalyticsDesc': 'Informations approfondies sur la qualité de récupération et les performances du système',
    
    // Settings
    'settings.title': 'Paramètres',
    'settings.subtitle': 'Gérez les paramètres et préférences de votre compte',
    'settings.preferences': 'Préférences',
    'settings.theme': 'Thème',
    'settings.language': 'Langue',
    'settings.defaultModel': 'Modèle IA par Défaut',
    'settings.resultsPerPage': 'Résultats par Page',
    'settings.notifications': 'Notifications',
    'settings.notificationsDesc': 'Recevez des mises à jour sur les résultats de requête',
    'settings.save': 'Enregistrer les Paramètres',
    'settings.saving': 'Enregistrement...',
    'settings.saveSuccess': 'Paramètres enregistrés avec succès',
    'settings.saveError': 'Échec de l\'enregistrement des paramètres',
    
    // Profile
    'profile.title': 'Profil',
    'profile.subtitle': 'Afficher et gérer vos informations de profil',
    'profile.info': 'Informations du Profil',
    'profile.infoDesc': 'Détails et statut de votre compte',
    'profile.activeMember': 'Membre Actif',
    'profile.joined': 'Inscrit',
    'profile.activityStats': 'Statistiques d\'Activité',
    'profile.activityStatsDesc': 'Vos métriques d\'utilisation et réalisations',
    'profile.totalQueries': 'Requêtes Totales',
    'profile.documentsUploaded': 'Documents Téléchargés',
    'profile.documentsAccessed': 'Documents Consultés',
    'profile.achievements': 'Réalisations',
    'profile.accountSettings': 'Paramètres du Compte',
    'profile.accountSettingsDesc': 'Gérez vos préférences et paramètres de compte',
    'profile.goToSettings': 'Aller aux Paramètres',
    
    // Common
    'common.backToDashboard': 'Retour au Tableau de Bord',
    'common.loading': 'Chargement...',
    'common.error': 'Erreur',
    'common.success': 'Succès',
  },
  de: {
    // Header
    'app.title': 'Finanzielles RAG',
    'app.subtitle': 'KI-Gestützte Analytik',
    'header.myAccount': 'Mein Konto',
    'header.profile': 'Profil',
    'header.settings': 'Einstellungen',
    'header.signOut': 'Abmelden',
    
    // Dashboard
    'dashboard.title': 'Finanzintelligenz Dashboard',
    'dashboard.subtitle': 'KI-gestütztes System zur Dokumentenabfrage und -analyse für Finanzdaten. Erhalten Sie sofortige Einblicke mit fundierten, nachprüfbaren Antworten.',
    'dashboard.overview': 'Übersicht',
    'dashboard.overviewDesc': 'Wichtige Leistungsindikatoren für Ihr RAG-System',
    'dashboard.queryEngine': 'Abfrage-Engine',
    'dashboard.queryEngineDesc': 'Stellen Sie Fragen und erhalten Sie KI-gestützte Einblicke aus Ihren Dokumenten',
    'dashboard.documentLibrary': 'Dokumentenbibliothek',
    'dashboard.advancedAnalytics': 'Erweiterte Analytik',
    'dashboard.advancedAnalyticsDesc': 'Tiefgehende Einblicke in Abrufqualität und Systemleistung',
    
    // Settings
    'settings.title': 'Einstellungen',
    'settings.subtitle': 'Verwalten Sie Ihre Kontoeinstellungen und Präferenzen',
    'settings.preferences': 'Präferenzen',
    'settings.theme': 'Design',
    'settings.language': 'Sprache',
    'settings.defaultModel': 'Standard-KI-Modell',
    'settings.resultsPerPage': 'Ergebnisse pro Seite',
    'settings.notifications': 'Benachrichtigungen',
    'settings.notificationsDesc': 'Erhalten Sie Updates zu Abfrageergebnissen',
    'settings.save': 'Einstellungen Speichern',
    'settings.saving': 'Wird gespeichert...',
    'settings.saveSuccess': 'Einstellungen erfolgreich gespeichert',
    'settings.saveError': 'Fehler beim Speichern der Einstellungen',
    
    // Profile
    'profile.title': 'Profil',
    'profile.subtitle': 'Sehen und verwalten Sie Ihre Profilinformationen',
    'profile.info': 'Profilinformationen',
    'profile.infoDesc': 'Ihre Kontodetails und Status',
    'profile.activeMember': 'Aktives Mitglied',
    'profile.joined': 'Beigetreten',
    'profile.activityStats': 'Aktivitätsstatistiken',
    'profile.activityStatsDesc': 'Ihre Nutzungsmetriken und Erfolge',
    'profile.totalQueries': 'Gesamte Abfragen',
    'profile.documentsUploaded': 'Hochgeladene Dokumente',
    'profile.documentsAccessed': 'Aufgerufene Dokumente',
    'profile.achievements': 'Erfolge',
    'profile.accountSettings': 'Kontoeinstellungen',
    'profile.accountSettingsDesc': 'Verwalten Sie Ihre Präferenzen und Kontoeinstellungen',
    'profile.goToSettings': 'Zu Einstellungen',
    
    // Common
    'common.backToDashboard': 'Zurück zum Dashboard',
    'common.loading': 'Laden...',
    'common.error': 'Fehler',
    'common.success': 'Erfolg',
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [language, setLanguageState] = useState<Language>('en');

  // Load language from user settings
  useEffect(() => {
    const loadLanguage = async () => {
      if (!user) {
        setLanguageState('en');
        return;
      }

      const { data } = await supabase
        .from('user_settings')
        .select('language')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data?.language) {
        setLanguageState(data.language as Language);
      }
    };

    loadLanguage();
  }, [user]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[language]?.[key] || translations.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
