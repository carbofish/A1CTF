<div align="center">

# 🚀 A1CTF

**A Modern CTF Platform**

[![Go](https://img.shields.io/badge/Go-1.24+-00ADD8?style=for-the-badge&logo=go&logoColor=white)](https://golang.org/)
[![React](https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-326CE5?style=for-the-badge&logo=kubernetes&logoColor=white)](https://kubernetes.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)

</div>

> **🚧 文档施工中 / The documentation is under construction 🚧**

## 📖 项目简介 / Project Overview

A1CTF 是一个现代化的 CTF（Capture The Flag）竞赛平台，支持大规模并发和动态容器管理。

A1CTF is a modern CTF (Capture The Flag) competition platform, supporting large-scale concurrency and dynamic container management.

### ✨ 核心特性 / Key Features

- 🎯 **现代化界面** - 基于 React 18 + TypeScript 的响应式前端
- ⚡ **高性能后端** - Go 1.24+ 构建的高并发服务
- 🐳 **容器化部署** - Kubernetes 支持
- 🔄 **实时更新** - WebSocket 实时比分和状态同步
- 📊 **监控告警** - Prometheus 指标监控

---

## 🚀 快速开始 / Quick Start

### 📋 前置要求 / Prerequisites

- Docker & Docker Compose
- Node.js 22+
- Go 1.24+
- PostgreSQL 15+
- Redis 7+
- Kubernetes

### 🔧 安装步骤 / Installation / From prebuilt docker image

1. **拉取镜像 / Pull the image**
   ```bash
   docker pull crpi-mw55fu1cvsu0r2z1.cn-shanghai.personal.cr.aliyuncs.com/carbofish/a1ctf:latest
   # docker pull ghcr.io/carbofish/a1ctf/a1ctf:latest
   ```

2. **配置环境 / Configure Environment**
   ```bash
   cp config.example.yaml config.yaml
   # 编辑 config.yaml 文件，配置数据库和其他服务
   # Edit config.yaml to configure database and other services
   ```

3. **使用 Docker Compose 启动 🌟 / Start with Docker Compose**
   ```yaml
   version: '3.8'
   
   services:
     app:
       build: .
       image: crpi-mw55fu1cvsu0r2z1.cn-shanghai.personal.cr.aliyuncs.com/carbofish/a1ctf:latest
       ports:
         - "8081:7777"
       environment:
         - GIN_MODE=release
       volumes:
         - ./appdata:/app/data
         - ./config.yaml:/app/config.yaml:ro
         - ./k8sconfig.yaml:/app/k8sconfig.yaml:ro
       depends_on:
         - postgres
         - redis
       restart: unless-stopped
       networks:
         - a1ctf-network
   
     postgres:
       image: postgres:17-alpine
       environment:
         POSTGRES_DB: a1ctf
         POSTGRES_USER: postgres
         POSTGRES_PASSWORD: postgres
       volumes:
         - ./postgres_data:/var/lib/postgresql/data
       ports:
         - "5433:5432"
       restart: unless-stopped
       networks:
         - a1ctf-network
   
     redis:
       image: redis:alpine
       restart: unless-stopped
       networks:
         - a1ctf-network
   
   networks:
     a1ctf-network:
       driver: bridge 
   ```
   
   ```bash
   docker compose up -d
   ```

### 🔧 安装步骤 / Installation / From source code

1. **克隆项目 / Clone Repository**
   ```bash
   git clone https://github.com/carbofish/A1CTF.git
   cd A1CTF
   ```

2. **配置环境 / Configure Environment**
   ```bash
   cp config.example.yaml config.yaml
   # 编辑 config.yaml 文件，配置数据库和其他服务
   # Edit config.yaml to configure database and other services
   ```

3. **使用 Docker Compose 启动 / Start with Docker Compose**
   ```bash
   docker compose up -d
   ```

4. **或者手动启动 / Or Start Manually**
   ```bash
   # 启动后端 / Start Backend
   go mod tidy
   go run src/main.go
   
   # 启动前端 / Start Frontend
   cd clientapp
   npm install
   npm run dev
   ```

### 🌐 访问地址 / Access URLs

- **前端界面**: http://localhost:5173
- **后端API**: http://localhost:7777
- **监控面板**: http://localhost:8081/metrics

---

## 📁 项目结构 / Project Structure

```
A1CTF/
├── 📁 clientapp/          # React 前端应用
│   ├── 📁 app/            # 路由和页面
│   ├── 📁 components/     # React 组件
│   └── 📁 utils/          # 工具函数
├── 📁 src/               
│   ├── 📁 controllers/   # 控制器
│   ├── 📁 db/           # 数据库模型
│   ├── 📁 utils/        # 工具包
│   └── 📁 tasks/        # 后台任务
├── 📁 migrations/        # 数据库迁移
├── 📁 i18n/             # 国际化文件
├── 🐳 Dockerfile        # Docker 构建文件
├── 🐳 docker-compose.yml # Docker Compose 配置
└── ⚙️ config.example.yaml # 配置文件模板
```

---

## 🤝 贡献指南 / Contributing

我们欢迎所有形式的贡献！

We welcome all forms of contributions!

### 🐛 问题反馈 / Bug Reports

如果您发现了 bug，请在 [Issues](https://github.com/carbofish/A1CTF/issues) 页面提交问题报告。

### 💡 功能建议 / Feature Requests

有好的想法？欢迎在 [Discussions](https://github.com/carbofish/A1CTF/discussions) 中分享！

---

## 📄 许可证 / License

本项目采用 [AGPL License](LICENSE) 开源协议。

This project is licensed under the [AGPL License](LICENSE).

---

## 🌟 Star History

[![Stargazers over time](https://starchart.cc/carbofish/A1CTF.svg?variant=adaptive)](https://starchart.cc/carbofish/A1CTF)

---

<div align="center">

**如果这个项目对您有帮助，请给我们一个 ⭐ Star！**

**If this project helps you, please give us a ⭐ Star!**

</div>
