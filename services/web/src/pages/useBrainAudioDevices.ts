import { useEffect, useState } from 'react';

export function useBrainAudioDevices() {
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicId, setSelectedMicId] = useState(() => {
    try { return localStorage.getItem('keledon_brain_mic_id') || ''; }
    catch { return ''; }
  });
  const [selectedSpeakerId, setSelectedSpeakerId] = useState(() => {
    try { return localStorage.getItem('keledon_brain_speaker_id') || ''; }
    catch { return ''; }
  });
  const [showDeviceSettings, setShowDeviceSettings] = useState(false);

  useEffect(() => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const refreshDevices = () => navigator.mediaDevices.enumerateDevices().then((devices) => {
      setAudioInputDevices(devices.filter((device) => device.kind === 'audioinput'));
      setAudioOutputDevices(devices.filter((device) => device.kind === 'audiooutput'));
    }).catch(() => {});
    void refreshDevices();
    navigator.mediaDevices.addEventListener('devicechange', refreshDevices);
    return () => navigator.mediaDevices.removeEventListener('devicechange', refreshDevices);
  }, []);

  useEffect(() => {
    if (!showDeviceSettings) return;
    const handler = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-device-panel]') && !target.closest('[data-device-btn]')) {
        setShowDeviceSettings(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDeviceSettings]);

  return {
    audioInputDevices, audioOutputDevices, selectedMicId, setSelectedMicId,
    selectedSpeakerId, setSelectedSpeakerId, showDeviceSettings, setShowDeviceSettings,
  };
}
