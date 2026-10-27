<script setup lang="ts">
import { profile } from '../content/profile'
import { projects } from '../content/projects'
import { posts } from '../content/posts'
import ProjectCard from '../components/ProjectCard.vue'
import PostList from '../components/PostList.vue'
</script>
<template>
  <div class="container home-page">
    <section class="personal-intro" aria-labelledby="intro-title">
      <div class="intro-copy"><p class="intro-greeting">你好，我是</p><h1 id="intro-title">XXX Inferno</h1><p class="intro-bio">软件工程硕士在读，2027 届。<br />专注 AI Agent、Python 与 Java 后端开发。</p><p class="intro-description">这里记录我做过的项目、开发中的思考，<br class="wide-only" />也放着一份面向工作机会的公开简历。</p><div class="intro-actions"><RouterLink to="/blog" class="button primary">阅读文章</RouterLink><RouterLink to="/resume" class="button secondary">查看简历</RouterLink></div></div>
      <aside class="intro-note" aria-label="关于这个网站"><span class="note-marker" aria-hidden="true"></span><p class="note-title">从项目里，留下思考。</p><p>最近的实践围绕两个问题展开：</p><ul><li>怎样让 Agent 在权限边界内可靠执行？</li><li>怎样让文件在中断与冲突后仍然可追溯？</li></ul><RouterLink to="/about" class="inline-link">更多关于我</RouterLink></aside>
    </section>

    <div class="home-columns">
      <section class="home-writing" aria-labelledby="writing-title"><div class="section-heading"><div><h2 id="writing-title">技术笔记</h2><p>从具体问题出发，整理实现思路。</p></div><RouterLink to="/blog" class="quiet-link">全部文章</RouterLink></div><PostList :posts="posts" /></section>
      <section class="home-projects" aria-labelledby="projects-title"><div class="section-heading"><div><h2 id="projects-title">我的项目</h2><p>主要实践与当前状态。</p></div><RouterLink to="/projects" class="quiet-link">全部项目</RouterLink></div><ProjectCard v-for="project in projects" :key="project.id" :project="project" compact /></section>
    </div>

    <section class="home-profile" aria-labelledby="profile-title"><div><h2 id="profile-title">也在寻找合适的团队</h2><p>关注 Agent 开发、Python AI 应用和 Java 后端方向的实习与秋招机会。</p></div><RouterLink to="/resume" class="button secondary">了解我的经历</RouterLink></section>
    <p class="home-update">{{ profile.name }} 的个人博客与公开简历</p>
  </div>
</template>
