<script setup lang="ts">
import { profile, skills } from '../content/profile'
import { projects } from '../content/projects'
function printResume() { window.print() }
</script>
<template>
  <article class="container resume-page">
    <header class="resume-header"><div><p class="resume-label">公开简历</p><h1>XXX Inferno</h1><p class="resume-role">{{ profile.role }}</p><p class="resume-availability">2027 届，寻找实习与秋招机会</p></div><div class="resume-actions screen-only"><a v-if="profile.resumePdf" :href="profile.resumePdf" class="button primary" download>下载简历 PDF</a><button v-else type="button" class="button secondary" @click="printResume">打印简历</button><RouterLink to="/about" class="quiet-link">更多关于我</RouterLink></div></header>
    <p class="resume-introduction">{{ profile.summary }}</p>
    <nav class="resume-section-nav screen-only" aria-label="简历目录"><a href="#education">教育背景</a><a href="#skills">技术能力</a><a href="#experience">项目经历</a><a href="#additional">补充经历</a><a href="#contact">联系</a></nav>
    <section id="education" class="resume-section"><h2>教育背景</h2><div class="resume-education"><h3>软件工程硕士在读</h3><span>2024—2027</span><p>预计 2027 年 6 月毕业</p></div></section>
    <section id="skills" class="resume-section"><h2>技术能力</h2><dl class="resume-skills"><div v-for="skill in skills" :key="skill.title"><dt>{{ skill.title }}</dt><dd>{{ skill.tags.join('、') }}</dd></div></dl></section>
    <section id="experience" class="resume-section"><h2>项目经历</h2><article v-for="project in projects" :key="project.id" class="resume-project"><div class="resume-project-heading"><h3>{{ project.name }}</h3><span class="status-label">{{ project.status }}</span></div><p>{{ project.description }}</p><ul><li v-for="point in project.designs.slice(0, 3)" :key="point.title">{{ point.decision }}</li></ul><RouterLink :to="'/projects/' + project.id" class="inline-link screen-only">查看 {{ project.name }} 项目详情</RouterLink></article></section>
    <section id="additional" class="resume-section"><h2>补充项目与研究</h2><article class="resume-additional"><h3>Agentic RAG 智能文献阅读系统</h3><p class="small-note">个人 Demo，已完成并在本地运行</p><p>Java / Python 协作的文献阅读 Demo，支持 PDF 上传、异步解析、语义检索、智能问答与原文引用定位。使用 RabbitMQ、MinIO、MinerU、pgvector 与本地 Rerank 模型串联文档处理链路。</p></article><article class="resume-additional"><h3>克隆结构认知图导航研究</h3><p class="small-note">2025 年 3 月至今</p><p>围绕强感知混淆环境中的导航问题，完成模型修改、实验设计、基线与消融分析、结果可视化及论文撰写。</p></article></section>
    <section id="contact" class="resume-section"><h2>联系</h2><p>关注 Agent 开发、Python AI 应用与 Java 后端方向的机会。</p><a v-if="profile.email" :href="'mailto:' + profile.email" class="inline-link">{{ profile.email }}</a><p v-else class="small-note">本站暂未设置公开联系方式。</p><a v-if="profile.github" :href="profile.github" class="inline-link" target="_blank" rel="noopener noreferrer">GitHub 主页</a><p class="print-site">个人网站：xxxinferno.me</p></section>
  </article>
</template>
