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
        setupExe: 'KELEDON.Browser-0.1.7-Setup.exe',
        authors: 'Keledon Team',
        description: 'Keledon Desktop Browser v0.1.7'
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