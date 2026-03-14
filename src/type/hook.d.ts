interface Hooks {
  upStats: () => void
  upStorage: () => void
  upMount: () => void
  upNotice: () => void
  upStartup: () => void
  startup: {
    storageInitDone: boolean
    storageSyncing: boolean
    storageInitFailed: boolean
  }
  retryStartupStorageSync: () => Promise<void>
  navigate: (path: string) => void
  setLocaleStr: (localeStr: string) => void
}

export { Hooks }
