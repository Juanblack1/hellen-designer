;(() => {
  try {
    const stored = localStorage.getItem('hellen-designer-theme')
    const systemDark = matchMedia('(prefers-color-scheme: dark)').matches
    const theme = stored === 'light' || stored === 'dark' ? stored : systemDark ? 'dark' : 'light'
    document.documentElement.dataset.theme = theme
  } catch {
    document.documentElement.dataset.theme = 'light'
  }
})()
