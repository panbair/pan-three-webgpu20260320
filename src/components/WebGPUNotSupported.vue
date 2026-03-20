<template>
  <div v-if="webgpuNotSupported" class="webgpu-warning">
    <div class="warning-content">
      <h3>⚠️ WebGPU 不支持</h3>
      <p>当前浏览器不支持 WebGPU，无法启用特效</p>
      <p class="browser-requirement">请使用 Chrome 113+ 或 Edge 113+</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const webgpuNotSupported = ref(false)

onMounted(() => {
  if (!navigator.gpu) {
    console.warn('WebGPU 不支持，无法启用特效')
    webgpuNotSupported.value = true
  }
})
</script>

<style lang="scss" scoped>
.webgpu-warning {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 100;
  background: rgba(0, 0, 0, 0.9);
  border: 2px solid #ff6b6b;
  border-radius: 12px;
  padding: 30px;
  text-align: center;
  max-width: 400px;
  backdrop-filter: blur(10px);
}

.warning-content {
  h3 {
    color: #ff6b6b;
    margin: 0 0 15px 0;
    font-size: 24px;
  }

  p {
    color: #fff;
    margin: 10px 0;
    font-size: 14px;
    line-height: 1.6;
  }

  .browser-requirement {
    color: #ffd93d;
    font-weight: 500;
    margin-top: 15px;
  }
}
</style>
