<script setup>
import MapChrome from '../components/MapChrome.vue'
</script>

<template>
  <header class="topbar">
    <slot name="topbar"></slot>
  </header>
  <div class="map-area">
    <slot></slot>
    <MapChrome />
  </div>
</template>
