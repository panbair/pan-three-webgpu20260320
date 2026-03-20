import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore(
  'app',
  () => {
    const isDark = ref(false)
    const locale = ref('zh-CN')

    function toggleDark() {
      isDark.value = !isDark.value
      if (isDark.value) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }

    function setLocale(lang: string) {
      locale.value = lang
    }

    return {
      isDark,
      locale,
      toggleDark,
      setLocale
    }
  },
  {
    persist: {
      key: 'app-store',
      storage: localStorage
    }
  }
)
