import { contextBridge, ipcRenderer } from 'electron';

// Vendor pages receive only a narrow notification relay, never KELEDON's privileged IPC API.
contextBridge.exposeInMainWorld('__keledonBridge', {
  notify: (title: unknown, options?: unknown) => {
    if (typeof title !== 'string') return;
    const input =
      options && typeof options === 'object' && !Array.isArray(options)
        ? (options as Record<string, unknown>)
        : {};
    ipcRenderer.send('show-notification', {
      title,
      body: typeof input.body === 'string' ? input.body : '',
      silent: input.silent === true,
    });
  },
});
