import { AuthProvider } from './context/AuthContext';
import { I18nProvider } from './context/I18nContext';
import { AppRouter } from './AppRouter';
import { SocketProvider } from './context/SocketContext';

function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <SocketProvider>
          <AppRouter />
        </SocketProvider>
      </AuthProvider>
    </I18nProvider>
  );
}

export default App;
