import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function DevicesPage() {
  const { user, api } = useAuth();
  const [devices, setDevices] = useState<any[]>([]);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      const response = await api.get('/api/devices', {
        headers: { 'x-user-id': user?.id }
      });
      setDevices(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Failed to load devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePairingCode = async () => {
    try {
      const response = await api.post('/api/devices/pairing-code', {
        userId: user?.id
      });
      setPairingCode(response.pairing_code);
    } catch (error) {
      console.error('Failed to generate pairing code:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paired': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'disconnected': return 'bg-gray-500';
      case 'revoked': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Devices</h1>
        <button
          onClick={generatePairingCode}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark"
        >
          Add New Device
        </button>
      </div>

      {pairingCode && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">Pairing Code</h3>
          <p className="text-3xl font-mono text-blue-600 tracking-widest">{pairingCode}</p>
          <p className="text-sm text-blue-600 mt-2">This code expires in 10 minutes</p>
          <button
            onClick={() => setPairingCode(null)}
            className="mt-2 text-sm text-blue-700 underline"
          >
            Close
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : devices.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No devices found. Click "Add New Device" to add your first device.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {devices.map((device) => (
            <div
              key={device.id}
              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg">{device.name}</h3>
                <span className={`px-2 py-1 rounded-full text-xs text-white ${getStatusColor(device.status)}`}>
                  {device.status}
                </span>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p><span className="font-medium">Platform:</span> {device.platform}</p>
                <p><span className="font-medium">Last seen:</span> {device.lastSeen ? new Date(device.lastSeen).toLocaleString() : 'Never'}</p>
                <p><span className="font-medium">Version:</span> {device.version || 'Unknown'}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}