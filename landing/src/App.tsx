import { AuthProvider } from './context/AuthContext';
import { AppRouter } from './AppRouter';
import { SocketProvider } from './context/SocketContext';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppRouter />
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
