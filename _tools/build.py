# -*- coding: utf-8 -*-
"""
极简 Liquid 渲染器（仅覆盖本站模板所用语法子集），用于在未安装 Ruby/Jekyll 的
环境下产出可直接预览的 _site/ 静态文件。

支持：
  {% include path %}
  {% for x in a.b.c %} ... {% endfor %}
  {{ a.b.c }} / {{ forloop.index }}
  页面 front matter + _config.yml 的 defaults：layout

安装 Ruby 后请直接使用 `bundle exec jekyll build`，两者输出等价。
"""
import os, re, sys, shutil, io

import yaml

ROOT = os.path.dirname(os.path.abspath(__file__))
if os.path.basename(ROOT) == "_tools":
    ROOT = os.path.dirname(ROOT)

INC_DIR = os.path.join(ROOT, "_includes")
DATA_DIR = os.path.join(ROOT, "_data")
LAYOUT_DIR = os.path.join(ROOT, "_layouts")
SITE_DIR = os.path.join(ROOT, "_site")

INCLUDE_RE = re.compile(r"{%-?\s*include\s+([\w\-./]+)\s*-?%}")
FOR_RE = re.compile(r"{%-?\s*for\s+(\w+)\s+in\s+([\w.\-]+)\s*-?%}")
ENDFOR = "{% endfor %}"
VAR_RE = re.compile(r"{{-?\s*([^}]+?)\s*-?}}")
COMMENT_RE = re.compile(r"{%-?\s*comment\s*-?%}.*?{%-?\s*endcomment\s*-?%}", re.S)

warnings = []


def read(path):
    with io.open(path, encoding="utf-8") as f:
        return f.read()


def load_yaml(path):
    return yaml.safe_load(read(path)) or {}


def get(ctx, path):
    cur = ctx
    for part in path.split("."):
        if isinstance(cur, dict) and part in cur:
            cur = cur[part]
        elif isinstance(cur, list) and part.isdigit():
            cur = cur[int(part)]
        else:
            return None, False
    return cur, True


# --------------------------------------------------------------- includes
def expand_includes(tpl, depth=0):
    if depth > 10:
        return tpl

    def rep(m):
        name = m.group(1)
        p = os.path.join(INC_DIR, name)
        if not os.path.exists(p):
            warnings.append("missing include: %s" % name)
            return ""
        return expand_includes(read(p), depth + 1)

    return INCLUDE_RE.sub(rep, tpl)


# ------------------------------------------------------------- for loops
ENDFOR_RE = re.compile(r"{%-?\s*endfor\s*-?%}")


def find_matching_endfor(tpl, start):
    """返回与 start 处 {% for %} 配对的 endfor 起点。"""
    depth = 0
    pos = start
    for_m = FOR_RE.search(tpl, start)
    end_m = ENDFOR_RE.search(tpl, start)
    while True:
        if end_m is None:
            return -1
        if for_m is not None and for_m.start() < end_m.start():
            depth += 1
            for_m = FOR_RE.search(tpl, for_m.end())
            continue
        if depth == 0:
            return end_m.start()
        depth -= 1
        end_m = ENDFOR_RE.search(tpl, end_m.end())


def render_block(tpl, ctx):
    out = []
    pos = 0
    while True:
        m = FOR_RE.search(tpl, pos)
        if m is None:
            out.append(substitute(tpl[pos:], ctx))
            break
        out.append(substitute(tpl[pos:m.start()], ctx))

        end_idx = find_matching_endfor(tpl, m.end())
        if end_idx == -1:
            warnings.append("unclosed for loop: %s" % m.group(0))
            out.append(substitute(tpl[m.start():], ctx))
            break

        var, path = m.group(1), m.group(2)
        body = tpl[m.end():end_idx]
        seq, ok = get(ctx, path)
        if not ok:
            warnings.append("unknown loop source: %s" % path)
            seq = []
        if seq is None:
            seq = []
        if isinstance(seq, dict):
            seq = list(seq.values())
        if not isinstance(seq, (list, tuple)):
            seq = [seq]

        total = len(seq)
        for i, item in enumerate(seq):
            local = dict(ctx)
            local[var] = item
            local["forloop"] = {"index": i + 1, "index0": i, "first": i == 0, "last": i == total - 1}
            out.append(render_block(body, local))

        pos = ENDFOR_RE.match(tpl, end_idx).end()
    return "".join(out)


# ------------------------------------------------------------ variables
def substitute(tpl, ctx):
    def rep(m):
        expr = m.group(1).strip()
        if "|" in expr:
            base, *filters = [p.strip() for p in expr.split("|")]
            val, ok = get(ctx, base)
            if not ok:
                return ""
            for f in filters:
                if f.startswith("default:"):
                    if val in (None, "", []):
                        val = f.split(":", 1)[1].strip().strip("'\"")
        else:
            val, ok = get(ctx, expr)
            if not ok:
                warnings.append("unknown variable: %s" % expr)
                return ""
        if val is None:
            return ""
        if isinstance(val, bool):
            return "true" if val else "false"
        return str(val)

    return VAR_RE.sub(rep, tpl)


# ------------------------------------------------------------------ pages
def parse_front_matter(text):
    if text.startswith("---"):
        end = text.find("\n---", 3)
        if end != -1:
            fm = text[3:end]
            body = text[end + 4:]
            try:
                data = yaml.safe_load(fm) or {}
            except Exception as e:
                raise SystemExit("front matter error: %s" % e)
            return data, body.lstrip("\n")
    return {}, text


def build():
    site = load_yaml(os.path.join(ROOT, "_config.yml"))
    site["data"] = {}
    if os.path.isdir(DATA_DIR):
        for f in sorted(os.listdir(DATA_DIR)):
            if f.endswith((".yml", ".yaml")):
                site["data"][os.path.splitext(f)[0]] = load_yaml(os.path.join(DATA_DIR, f))

    pages = [f for f in os.listdir(ROOT) if f.endswith(".html")]
    if not pages:
        raise SystemExit("no pages found")

    if not os.path.isdir(SITE_DIR):
        os.makedirs(SITE_DIR)

    # 清理上次构建残留的 HTML（避免已改名的页面留在 _site 里）
    keep = set(page.rsplit(".", 1)[0] + ".html" for page in pages)
    for f in os.listdir(SITE_DIR):
        if f.endswith(".html") and f not in keep:
            os.remove(os.path.join(SITE_DIR, f))

    for page_file in pages:
        raw = read(os.path.join(ROOT, page_file))
        fm, body = parse_front_matter(raw)
        page = dict(fm)
        ctx = {"site": site, "page": page, "content": ""}

        content = render_block(expand_includes(body), ctx)
        ctx["content"] = content

        layout_name = page.get("layout", "default")
        layout_path = os.path.join(LAYOUT_DIR, layout_name + ".html")
        if os.path.exists(layout_path):
            html = render_block(expand_includes(read(layout_path)), ctx)
        else:
            html = content

        html = COMMENT_RE.sub("", html)
        html = re.sub(r"\n{3,}", "\n\n", html)

        out_name = page_file.rsplit(".", 1)[0] + ".html"
        with io.open(os.path.join(SITE_DIR, out_name), "w", encoding="utf-8", newline="\n") as f:
            f.write(html)
        print("built %s -> _site/%s (%d bytes)" % (page_file, out_name, len(html)))

    # 复制静态资源
    for d in ("assets",):
        src = os.path.join(ROOT, d)
        dst = os.path.join(SITE_DIR, d)
        if os.path.isdir(src):
            if os.path.isdir(dst):
                shutil.rmtree(dst)
            shutil.copytree(src, dst)
    for f in ("CNAME", "robots.txt", ".nojekyll"):
        p = os.path.join(ROOT, f)
        if os.path.exists(p):
            shutil.copy2(p, os.path.join(SITE_DIR, f))

    if warnings:
        print("\n--- WARNINGS (%d) ---" % len(warnings))
        seen = set()
        for w in warnings:
            if w not in seen:
                seen.add(w)
                print("  " + w)
    else:
        print("\nno warnings")


if __name__ == "__main__":
    build()
