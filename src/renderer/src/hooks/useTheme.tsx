import { useTheme as useThemeProvider } from '~/components/ui/theme-provider'

// Re-export the theme provider hook as our custom hook
export function useTheme(): ReturnType<typeof useThemeProvider> {
  return useThemeProvider()
}
