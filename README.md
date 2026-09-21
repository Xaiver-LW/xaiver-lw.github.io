# LINEWELL 莱因维尔 · 官网主页（Jekyll）

深圳莱因维尔实业有限公司企业官网主页。单页长滚动结构，深紫 + 橙品牌色系，
配套滚动进度条、区块进场动画、数字滚动、视差光晕、对比数据条与客户 logo 走马灯。

---

## 本地运行

### 方式一：Ruby / Jekyll（推荐）

```bash
cd linewell-site
bundle install
bundle exec jekyll serve --livereload
# 打开 http://127.0.0.1:4000
```

### 方式二：无 Ruby 环境（内置渲染脚本）

仓库内置了一个只覆盖本站模板语法子集（`include` / `for` / `变量`）的渲染脚本，
用于在没有 Ruby 的机器上直接产出 `_site/`，输出与 Jekyll 等价：

```bash
python _tools/build.py          # 生成 _site/
python -m http.server 4000 -d _site
```

Windows 下可用 PowerShell 指定 Python 路径运行，效果相同。

> 如果两者输出不一致，以 `bundle exec jekyll build` 为准。

---

## 目录结构

```
linewell-site/
├── _config.yml            # 站点配置（标题、描述、联系方式、baseurl）
├── index.html             # 页面骨架：只负责 include 各区块
├── _data/                 # ★ 全部文案与数据都在这里，改内容只动这个目录
│   ├── nav.yml            #   导航项（同时驱动顶部导航、移动端菜单、右侧区块导航、页脚）
│   ├── company.yml        #   公司名、地址、电话、邮箱、座右铭
│   ├── hero.yml           #   首屏标题 / 引导语 / 滚动标签
│   ├── about.yml          #   公司简介、三大理念
│   ├── figures.yml        #   概览数字、生产与检测设备
│   ├── products.yml       #   产品卡片、连接器细节
│   ├── equalizer.yml      #   ROG Equalizer 技术说明与对比数据
│   ├── plants.yml         #   两大制造基地、工厂图集
│   ├── quality.yml        #   研发、体系、品质流程、检测设备、认证专利
│   └── partners.yml       #   合作伙伴与 logo 走马灯
├── _includes/             # 局部模板
│   ├── head.html          #   <head>：SEO、图标、样式
│   ├── nav.html           #   顶部导航 + 移动端菜单
│   ├── hero.html          #   首屏
│   ├── footer.html        #   页脚 + 回到顶部
│   ├── scripts.html       #   脚本引用
│   └── sections/          #   各内容区块
├── _layouts/default.html  # 全局布局（进度条、区块导航、main、页脚）
├── assets/
│   ├── css/main.css       # ★ 全部样式（设计变量集中在文件顶部 :root）
│   ├── js/main.js         # 交互脚本
│   └── images/            # 由宣传册与公司简介 PPT 中提取并优化后的图片
│       ├── logo-light.png / logo-dark.png / logo-mark.png
│       ├── favicon-64.png / favicon-128.png / apple-touch-icon.png
│       ├── og-cover.jpg   #   社交分享封面（1200×630）
│       ├── bg/            #   品牌紫色纹理背景
│       ├── products/      #   产品图（部分为抠好的透明底 PNG / WebP）
│       ├── facility/      #   工厂与实验室实拍
│       ├── certs/         #   体系认证、UL 认证、专利证书
│       └── clients/       #   客户 logo
├── _tools/build.py        # 无 Ruby 时的渲染脚本
└── _site/                 # 构建产物（可直接部署）
```

> 图标与分享图由 `_tools/gen_brand_assets.py` 生成（依赖 `logo-mark.png` 与 `logo-light.png`）。

---

## 改内容

**文案、联系方式、产品清单、数据全部在 `_data/*.yml`**，不需要动 HTML。
例如改电话号码：编辑 `_data/company.yml` 的 `phone` / `phone_href`，全站同步生效。

**颜色与字体**：`assets/css/main.css` 顶部 `:root` 内的 CSS 变量。

| 变量 | 用途 |
| --- | --- |
| `--orange` | 品牌橙（logo 中的 W 色），用于强调、按钮、序号 |
| `--violet` / `--violet-2` | 品牌紫，用于光晕、渐变、标签 |
| `--bg` | 页面深色底 |
| `--maxw` | 内容最大宽度（默认 1200px） |

**换图片**：把文件放进 `assets/images/` 对应子目录，再改 `_data` 里对应的 `image` 路径即可。

---

## 滚动与交互动效

| 效果 | 实现 |
| --- | --- |
| 顶部进度条 | `.scroll-progress` + `requestAnimationFrame` 节流 |
| 导航吸顶变毛玻璃 | 滚动超过 40px 时加 `.is-stuck` |
| 区块进场（上浮 + 淡入 + 交错延迟） | `IntersectionObserver` 观察 `.reveal`，`data-delay` 控制错开 |
| 右侧区块导航高亮 | 观察各 `section[id]`，同步顶部导航与右侧圆点 |
| 数字滚动 | `.count[data-count]`，进入视口后缓出计数 |
| 对比数据条 | `.eq-compare.is-in` 触发 `--w` 宽度过渡 |
| 首屏光晕视差 | `[data-parallax]` 跟随鼠标与滚动（仅 ≥1025px） |
| 客户 logo 走马灯 | 纯 CSS `@keyframes`，悬停暂停 |
| 无障碍 | `prefers-reduced-motion` 下全部动画关闭；含跳转到主内容链接 |

---

## 部署

构建产物为纯静态文件，`baseurl` 保持空即可部署到域名根路径：

- **GitHub Pages**：把 `Gemfile` 中的 `jekyll` 换成 `github-pages`，推送到 `main` 分支后在仓库 Settings → Pages 选择分支即可。
- **Netlify / Vercel**：构建命令 `bundle exec jekyll build`，发布目录 `_site`。
- **传统主机 / 对象存储**：本地执行构建，把 `_site/` 目录整体上传。

> 站内资源引用使用的是相对路径（`assets/...`），因此部署到子路径（如 `example.com/site/`）也能正常工作，无需改 `baseurl`。

---

## 内容来源与待确认项

页面内容取自 `宣传册/` 目录下的三折页画册与《Linewell 莱因维尔-公司简介 2025 V1》PPT。以下两处原始资料存在出入，已按下方取值，建议核实后统一：

1. **生产基地**
   - PPT 文字页写「研发生产基地分布在东莞、重庆、桂林」
   - PPT 的 MFG View 页面为「HUIZHOU PLANT / GUILIN PLANT / CHONGQING PLANT」并给出产能
   - 画册写「桂林 / 重庆 / 东莞 生产制造基地」
   - **站内采用「桂林 · 重庆」两大制造基地**（客户 2026-09 确认，惠州已不在基地之列）。
     惠州页的产能数据（连接器 20000K）随该页一并下线，未做归属；如需体现连接器产能，
     请在 `_data/plants.yml` 中补回。
2. **公司注册地址**
   - 画册 CONTACT US：深圳市光明区凤凰街道塘家社区塘家东路 1 号 8 栋 801
   - ISO9001 证书注册地址：深圳市光明区凤凰街道东坑社区光明大道 481 号乐府广场 1B801
   - 站内采用画册 CONTACT US 的地址。

另外，页脚年份由脚本自动取当前年份；`_data/company.yml` 中的官网域名 `szlinewell.com` 取自画册，如已变更请一并修改。
