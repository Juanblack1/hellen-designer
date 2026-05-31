;(() => {
  try {
    const stored = localStorage.getItem('hellen-designer-theme')
    const comfort = localStorage.getItem('hellen-designer-comfort-mode')
    const systemDark = matchMedia('(prefers-color-scheme: dark)').matches
    const theme = stored === 'light' || stored === 'dark' ? stored : systemDark ? 'dark' : 'light'
    document.documentElement.dataset.theme = theme
    document.documentElement.dataset.comfort = comfort === 'on' ? 'on' : 'off'
  } catch {
    document.documentElement.dataset.theme = 'light'
    document.documentElement.dataset.comfort = 'off'
  }
})()
