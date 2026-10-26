<script setup lang="ts">
import { profile } from '../content/profile'
import { projects } from '../content/projects'
import Icon from '../components/Icon.vue'
</script>
<template>
  <article class="resume-view container narrow">
    <RouterLink to="/" class="breadcrumb"><Icon name="back" :size="16" />返回主页</RouterLink>
    <header class="resume-header"><p class="eyebrow">PROFILE / PUBLIC EDITION</p><h1>XXX Inferno<span class="accent">.</span></h1><p class="resume-role">{{ profile.role }}</p><span class="availability"><span class="live-dot"></span>2027 届 · 实习 / 秋招</span><p class="body-lead">{{ profile.summary }}</p><a v-if="profile.resumePdf" :href="profile.resumePdf" class="button primary" download>下载公开版简历 <Icon name="download" :size="18" /></a><p v-else class="resume-notice">当前为公开经历摘要，脱敏版 PDF 准备中。</p></header>
    <section class="resume-section"><p class="eyebrow">01 / EDUCATION</p><h2>教育背景</h2><div class="resume-education"><h3>软件工程 · 硕士在读</h3><span class="mono">2024 — 2027</span><p>预计 2027 年 6 月毕业</p></div></section>
    <section class="resume-section"><p class="eyebrow">02 / PROJECT EXPERIENCE</p><h2>核心项目</h2><article v-for="project in projects" :key="project.id" class="resume-project"><div class="resume-project-title"><h3>{{ project.name }}</h3><span class="status-dot" :class="{ green: project.id === 'personal-ai' }">{{ project.status }}</span></div><p>{{ project.description }}</p><ul class="check-list"><li v-for="item in project.highlights" :key="item"><Icon name="check" :size="16" />{{ item }}</li></ul><RouterLink :to="'/projects/' + project.id" class="text-link">阅读项目详情 <Icon name="arrow" :size="17" /></RouterLink></article></section>
    <section id="additional" class="resume-section"><p class="eyebrow">03 / ADDITIONAL EXPLORATIONS</p><h2>补充项目与研究</h2><div class="resume-additional"><h3>Agentic RAG 智能文献阅读系统</h3><span class="status-dot green">个人 Demo · 已完成 · 本地运行</span><p>Java / Python 协作的文献阅读 Demo，支持 PDF 上传、异步解析、语义检索、智能问答与原文引用定位。使用 RabbitMQ、MinIO、MinerU、pgvector 与本地 Rerank 模型串联文档处理链路。</p><div class="tags"><span>Spring AI</span><span>Python</span><span>pgvector</span><span>MinerU</span></div></div><div class="resume-additional"><h3>克隆结构认知图导航研究</h3><span class="mono muted">2025.03 — 至今</span><p>围绕强感知混淆环境中的导航问题，完成模型修改、实验设计、基线与消融分析、结果可视化及论文撰写。</p><div class="tags"><span>Python / NumPy</span><span>HMM</span><span>贝叶斯滤波</span><span>主动推断</span></div></div></section>
    <section class="resume-section"><p class="eyebrow">04 / CONTACT</p><h2>联系与机会</h2><p>关注 Agent 开发、Python AI 应用与 Java 后端方向的实习及秋招机会。</p><a v-if="profile.email" :href="'mailto:' + profile.email" class="text-link">{{ profile.email }} <Icon name="mail" :size="17" /></a><p v-else class="muted">公开联系方式待补充。</p><a v-if="profile.github" :href="profile.github" class="text-link" target="_blank" rel="noopener noreferrer">GitHub <Icon name="diagonal" :size="17" /></a></section>
  </article>
</template>
