source "https://rubygems.org"

# Jekyll 4.x
gem "jekyll", "~> 4.3"

# 若部署到 GitHub Pages，改用下面这一行替代上面的 jekyll：
# gem "github-pages", group: :jekyll_plugins

group :jekyll_plugins do
  gem "jekyll-seo-tag", "~> 2.8" if false # 如需 SEO 标签可启用
end

# Windows / JRuby 下需要
gem "wdm", "~> 0.1.1", platforms: [:mingw, :mswin, :x64_mingw] if Gem.win_platform?
gem "http_parser.rb", "~> 0.6.0", platforms: [:jruby] if defined?(JRUBY_VERSION)
