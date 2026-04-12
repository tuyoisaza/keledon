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
        setupExe: 'KELEDON-Browser-Setup.exe'
      }
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'linux', 'win32']
    }
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {}
    }
  ]
};