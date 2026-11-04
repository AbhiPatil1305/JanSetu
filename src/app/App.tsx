import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../providers/AuthContext';
import { LanguageProvider } from '../providers/LanguageContext';
import { NotificationProvider } from '../providers/NotificationContext';
import { AppRoutes } from './routes';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <NotificationProvider>
            <AppRoutes />
          </NotificationProvider>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
};

export default App;
