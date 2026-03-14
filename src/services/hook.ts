import { Hooks } from '../type/hook'

const hooks: Hooks = {
  upStats: () => {},
  upStorage: () => {},
  upMount: () => {},
  upNotice: () => {},
  upStartup: () => {},
  startup: {
    storageInitDone: false,
    storageSyncing: false,
    storageInitFailed: false,
  },
  retryStartupStorageSync: async () => {},
  navigate: () => {},
  setLocaleStr: () => {},
}

export { hooks }
