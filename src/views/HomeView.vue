<script setup lang="ts">
import { ref } from 'vue'
import { profile, skills } from '../content/profile'
import { projects } from '../content/projects'
import EngineeringDiagram from '../components/EngineeringDiagram.vue'
import ProjectCard from '../components/ProjectCard.vue'
import Icon from '../components/Icon.vue'
const focus = ref<'personal-ai' | 'cloud-sync'>('personal-ai')
</script>
<template>
  <div class="home-view">
    <section class="hero container" aria-labelledby="hero-title">
      <div class="hero-copy">
        <div class="availability"><span class="live-dot"></span>2027 届 · 寻找实习与秋招机会</div>
        <p class="eyebrow hero-eyebrow">THINK CLEARLY. BUILD RELIABLY.</p>
        <h1 id="hero-title">把想法，构建为<br /><span>可靠的系统。</span><span class="title-period">_</span></h1>
        <p class="hero-description">我是 <strong>XXX Inferno</strong>，一名关注 <strong>AI Agent</strong> 与<br class="desktop-break" />后端工程的开发者。让智能可执行，让系统更可靠。</p>
        <div class="hero-actions"><RouterLink to="/#projects" class="button primary">探索我的项目 <Icon name="arrow" :size="19" /></RouterLink><RouterLink to="/resume" class="button secondary">查看简历摘要 <Icon name="diagonal" :size="17" /></RouterLink></div>
        <div class="hero-tech mono"><span>PYTHON</span><span>JAVA</span><span>AGENT ENGINEERING</span></div>
      </div>
      <div class="hero-engineering">
        <div class="focus-top"><span class="mono">THE ENGINEERING MINDSET</span><span class="focus-corner">↗</span></div>
        <div class="focus-title"><span>复杂系统，清晰边界。</span><small>从意图到执行，从传输到一致性。</small></div>
        <div class="focus-tabs" role="group" aria-label="切换工程机制示意"><button :class="{ selected: focus === 'personal-ai' }" :aria-pressed="focus === 'personal-ai'" @click="focus = 'personal-ai'">01 <span>PersonalAI</span></button><button :class="{ selected: focus === 'cloud-sync' }" :aria-pressed="focus === 'cloud-sync'" @click="focus = 'cloud-sync'">02 <span>CloudSync</span></button></div>
        <EngineeringDiagram :kind="focus" />
        <div class="focus-note"><span class="focus-note-symbol">{ }</span><p>{{ focus === 'personal-ai' ? '好的 Agent，不止能调用工具。' : '可靠的传输，也要考虑失败之后。' }}<small>{{ focus === 'personal-ai' ? '还需要知道何时等待、如何恢复，以及权限在哪里。' : '让重试安全，让版本可追溯，让冲突显式发生。' }}</small></p></div>
      </div>
      <div class="hero-bottom"><span class="mono">SOFTWARE ENGINEERING · PORTFOLIO 2026</span><a href="#projects">向下探索 <span>↓</span></a></div>
    </section>

    <section id="projects" class="section container" aria-labelledby="projects-title">
      <div class="section-heading"><div><p class="eyebrow"><span>01 /</span> SELECTED WORK</p><h2 id="projects-title">用项目，回答工程问题<span class="accent">。</span></h2></div><p class="section-aside">从运行时到存储层，<br />记录真实的实现与取舍。</p></div>
      <div class="projects-grid"><ProjectCard v-for="project in projects" :key="project.id" :project="project" /></div>
      <div class="projects-footnote"><span class="small-square"></span>项目介绍与公开演示独立：当前展示工程实践，在线 Demo 尚未开放。</div>
    </section>

    <section id="skills" class="section skills-section" aria-labelledby="skills-title"><div class="container">
      <div class="section-heading"><div><p class="eyebrow"><span>02 /</span> TOOLKIT & APPROACH</p><h2 id="skills-title">工具服务于问题<span class="accent">。</span></h2></div><p class="section-aside">不止是技术栈，<br />更是连接它们的方法。</p></div>
      <div class="skill-rows"><article v-for="skill in skills" :key="skill.number" class="skill-row"><span class="skill-number mono">{{ skill.number }}</span><div class="skill-title"><h3>{{ skill.title }}</h3><p>{{ skill.caption }}</p></div><div class="skill-body"><p>{{ skill.description }}</p><div class="tags"><span v-for="tag in skill.tags" :key="tag">{{ tag }}</span></div></div></article></div>
    </div></section>

    <section id="about" class="section container about-section" aria-labelledby="about-title">
      <div class="about-heading"><p class="eyebrow"><span>03 /</span> A LITTLE ABOUT ME</p><h2 id="about-title">保持好奇，<br />把问题想深一步<span class="accent">。</span></h2><RouterLink to="/resume" class="text-link">了解我的经历 <Icon name="arrow" :size="18" /></RouterLink></div>
      <div class="about-body"><p class="about-intro">{{ profile.summary }}</p><p>从个人 AI 工作空间到私有云盘，我更在意系统遇到中断、冲突和意外时的表现。代码能跑是起点，边界清楚、过程可理解，才让它更值得信任。</p><div class="education-line"><span class="education-dot"></span><div><span class="mono">2024 — 2027</span><h3>软件工程 · 硕士在读</h3><p>预计 2027 年 6 月毕业</p></div><span class="education-badge">{{ profile.graduation }}</span></div><div class="additional-work"><span class="mono">ALSO EXPLORING</span><p>Agentic RAG 文献阅读 · 认知图导航研究</p><RouterLink to="/resume#additional" aria-label="查看补充项目与研究经历"><Icon name="diagonal" :size="20" /></RouterLink></div></div>
    </section>

    <section id="contact" class="contact-section container" aria-labelledby="contact-title"><div class="contact-inner"><div><p class="eyebrow"><span class="live-dot"></span> OPEN TO OPPORTUNITIES</p><h2 id="contact-title">下一个值得解决的问题，<br />期待一起构建<span class="accent">。</span></h2><p>关注 Agent 开发、Python AI 应用与 Java 后端岗位。</p></div><div class="contact-actions"><a v-if="profile.email" :href="'mailto:' + profile.email" class="button primary">发一封邮件 <Icon name="diagonal" /></a><RouterLink v-else to="/resume" class="button primary">查看公开简历摘要 <Icon name="diagonal" /></RouterLink><a v-if="profile.github" :href="profile.github" class="text-link" target="_blank" rel="noopener noreferrer">GitHub <Icon name="diagonal" :size="16" /></a><p v-if="!profile.email" class="contact-note">公开联系方式待补充</p></div></div></section>
  </div>
</template>
