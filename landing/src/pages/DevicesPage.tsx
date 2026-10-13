import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiJson } from '@/lib/api-fetch';

interface Device {
  id: string;
  name: string;
  status: string;
  platform?: string;
  lastSeen?: string | null;
  version?: string | null;
}

export default function DevicesPage() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDevices = async () => {
      try {
        const response = await apiJson<unknown>('/api/devices');
        setDevices(Array.isArray(response) ? response as Device[] : []);
      } catch (error) {
        console.error('Failed to load devices:', error);
      } finally {
        setLoading(false);
      }
    };
    void loadDevices();
  }, []);

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
          onClick={() => navigate('/launch-keledon')}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark"
        >
          Add New Device
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : devices.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No devices found. Click "Add New Device" to select a Keledon and pair a device.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {devices.map((device) => (
            <div key={device.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg">{device.name}</h3>
                <span className={`px-2 py-1 rounded-full text-xs text-white ${getStatusColor(device.status)}`}>
                  {device.status}
                </span>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p><span className="font-medium">Platform:</span> {device.platform || 'Unknown'}</p>
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
