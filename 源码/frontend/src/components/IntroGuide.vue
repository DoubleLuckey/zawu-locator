<template>
  <button class="intro-trigger tap" type="button" @click="open">
    <span class="intro-trigger__icon" aria-hidden="true">📖</span>
    使用说明
  </button>

  <van-popup
    v-model:show="show"
    position="center"
    round
    class="intro-popup"
    @closed="onClosed"
  >
    <div class="intro">
      <h2 class="intro__title">{{ content.title }}</h2>
      <p class="intro__tagline">{{ content.tagline }}</p>

      <p class="intro__paragraph">{{ content.intro }}</p>

      <h3 class="intro__section">它能干什么</h3>
      <ol class="intro__features">
        <li v-for="f in content.features" :key="f.title" class="intro__feature">
          <strong>{{ f.title }}</strong>
          <p>{{ f.text }}</p>
        </li>
      </ol>

      <h3 class="intro__section">第一次用，三步上手</h3>
      <ol class="intro__steps">
        <li v-for="s in content.steps" :key="s.title">
          <strong>{{ s.title }}</strong>：{{ s.text }}
        </li>
      </ol>

      <h3 class="intro__section">小提示</h3>
      <ul class="intro__tips">
        <li v-for="(tip, i) in content.tips" :key="i">{{ tip }}</li>
      </ul>

      <van-button type="primary" block round class="intro__action" @click="close">
        {{ firstTime ? '开始使用' : '我知道了' }}
      </van-button>
    </div>
  </van-popup>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { INTRO_CONTENT } from '@/data/intro'
import { getIntroState, markIntroSeen } from '@/services/introGuide'

const show = ref(false)
const firstTime = ref(false)
const content = INTRO_CONTENT

function open(): void {
  firstTime.value = false
  show.value = true
}

function close(): void {
  show.value = false
}

function onClosed(): void {
  markIntroSeen()
}

onMounted(() => {
  if (getIntroState() === 'new') {
    firstTime.value = true
    show.value = true
  }
})
</script>

<style scoped>
.intro-trigger {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 10px;
  padding: 4px 12px;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-pill);
  background: var(--color-surface);
  color: var(--color-ink-soft);
  font-size: 12px;
  cursor: pointer;
}

.intro-trigger__icon {
  font-size: 13px;
  line-height: 1;
}

.intro-popup {
  width: 86%;
  max-height: 78dvh;
  background: var(--color-surface);
  border-radius: var(--radius-l);
}

.intro {
  max-height: 78dvh;
  overflow-y: auto;
  padding: 22px 20px 20px;
  text-align: left;
}

.intro__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 20px;
  letter-spacing: 1px;
  text-align: center;
}

.intro__tagline {
  margin: 6px 0 0;
  color: var(--color-accent);
  font-size: 13px;
  letter-spacing: 1px;
  text-align: center;
}

.intro__paragraph {
  margin: 14px 0 0;
  font-size: 14px;
  line-height: 1.7;
  color: var(--color-ink);
}

.intro__section {
  margin: 18px 0 8px;
  font-size: 14px;
  color: var(--color-accent-deep);
}

.intro__features,
.intro__steps,
.intro__tips {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--color-ink-soft);
}

.intro__feature {
  margin-bottom: 8px;
}

.intro__feature p {
  margin: 2px 0 0;
}

.intro__action {
  margin-top: 18px;
}
</style>
