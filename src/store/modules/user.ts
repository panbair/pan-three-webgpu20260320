import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface UserInfo {
  id: string
  username: string
  email: string
  avatar?: string
}

export const useUserStore = defineStore(
  'user',
  () => {
    const token = ref('')
    const userInfo = ref<UserInfo | null>(null)

    function setToken(newToken: string) {
      token.value = newToken
    }

    function setUserInfo(info: UserInfo) {
      userInfo.value = info
    }

    function logout() {
      token.value = ''
      userInfo.value = null
    }

    return {
      token,
      userInfo,
      setToken,
      setUserInfo,
      logout
    }
  },
  {
    persist: {
      key: 'user-store',
      storage: sessionStorage
    }
  }
)
