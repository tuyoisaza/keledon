module.exports = {
  packagerConfig: {
    name: 'KELEDON Browser',
    executableName: 'keledon-browser',
    asar: true,
    icon: './assets/icon'
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'keledon_browser',
        setupExe: 'keledon-browser-latest-setup.exe',
        authors: 'Keledon Team',
        description: 'Keledon Desktop Browser'
      }
    }
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {}
    }
  ]
};