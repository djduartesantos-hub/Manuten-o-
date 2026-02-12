import React from 'react';
import { MainLayout } from '../layouts/MainLayout';
import { SuperAdminSettings } from './SettingsPage';

export function SuperAdminPage() {
  return (
    <MainLayout wide>
      <SuperAdminSettings />
    </MainLayout>
  );
}
