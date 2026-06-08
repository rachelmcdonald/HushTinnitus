import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { UserPreferences } from '@/src/types';
import { getPreferences, updatePreferences as persistUpdate } from '@/src/storage/preferences';

const WEB_DEFAULTS: UserPreferences = {
  onboardingComplete: false,
  isPremium: false,
  darkMode: 'system',
  textSize: 'medium',
  notificationsEnabled: false,
  notificationTime: '09:00',
  firstLaunchDate: new Date().toISOString(),
  lastCRESTDate: null,
  week4Prompted: false,
  week8Prompted: false,
  matchedPitchHz: null,
};

type PreferencesContextValue = {
  preferences: UserPreferences | null;
  isLoading: boolean;
  updatePreferences: (patch: Partial<UserPreferences>) => void;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setPreferences(WEB_DEFAULTS);
      setIsLoading(false);
      return;
    }
    const prefs = getPreferences();
    // Record first launch date if this is a new install
    if (!prefs.firstLaunchDate) {
      const withDate = { ...prefs, firstLaunchDate: new Date().toISOString() };
      persistUpdate(withDate);
      setPreferences(withDate);
    } else {
      setPreferences(prefs);
    }
    setIsLoading(false);
  }, []);

  const updatePreferences = useCallback((patch: Partial<UserPreferences>) => {
    setPreferences((current) => {
      if (!current) return current;
      const updated = { ...current, ...patch };
      if (Platform.OS !== 'web') {
        persistUpdate(patch);
      }
      return updated;
    });
  }, []);

  return (
    <PreferencesContext.Provider value={{ preferences, isLoading, updatePreferences }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx;
}
