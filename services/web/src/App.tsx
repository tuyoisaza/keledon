import { AuthProvider } from './context/AuthContext';
import { I18nProvider } from './context/I18nContext';
import { AppRouter } from './AppRouter';
import { SocketProvider } from './context/SocketContext';
import { Toaster } from 'sonner';

function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <SocketProvider>
          <AppRouter />
          <Toaster position="top-right" richColors />
        </SocketProvider>
      </AuthProvider>
    </I18nProvider>
  );
}

export default App;
