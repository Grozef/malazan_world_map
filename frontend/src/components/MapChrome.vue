<script setup>
import { assetUrl } from '../api/dataSource.js'
</script>

<template>
  <div class="map-chrome" aria-hidden="true">
    <div class="frame"></div>
    <img class="corner tl" :src="assetUrl('decor/corner.png')" alt="">
    <img class="corner tr" :src="assetUrl('decor/corner.png')" alt="">
    <img class="corner br" :src="assetUrl('decor/corner.png')" alt="">
    <img class="corner bl" :src="assetUrl('decor/corner.png')" alt="">
    <img class="compass" :src="assetUrl('decor/compass.png')" alt="rose des vents">
  </div>
</template>
