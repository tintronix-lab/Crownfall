#!/usr/bin/env python3
"""Checks the site's 21 pages: in step, linked, light enough. Standard library only.

    python3 .github/scripts/check_site.py

Prints each problem and exits 1, or prints a summary and exits 0.
"""
import os
import re
import sys
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
BASE = "https://tintronix-lab.github.io/Crownfall/"
LANGS = ["en", "de", "fr", "es", "pt-BR", "it", "sv"]  # en is the root folder
PAGES = ["index.html", "support.html", "privacy.html"]
WEIGHT_LIMIT = 3_000_000

# What a translation may have that its English page doesn't. Each entry names the
# difference, the page it applies to, and the run of tags that makes it up.
ALLOWED_DIFFERENCES = [
    {
        "name": "translated index pages carry og:locale",
        "page": "index.html",
        "tags": ['meta[property=og:locale]'],
    },
    {
        "name": "translated privacy pages say they are a translation and link to the English one",
        "page": "privacy.html",
        "tags": ['p.meta', 'a[hreflang=en]'],
    },
]

KEY_ATTRS = ("property", "name", "rel", "hreflang", "type", "aria-current", "tabindex", "aria-hidden")


def folder(lang):
    return "" if lang == "en" else lang + "/"


def page_path(lang, page):
    return os.path.join(ROOT, folder(lang), page)


def page_url(lang, page):
    return BASE + folder(lang) + ("" if page == "index.html" else page)


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tags = []      # one token per start tag, e.g. 'meta[property=og:title]' or 'li.heal'
        self.elements = []  # (tag, attrs dict, line)
        self.ids = set()
        self.title = ""
        self._in_title = False

    def handle_starttag(self, tag, attrs):
        a = {k: (v if v is not None else "") for k, v in attrs}
        token = tag
        if a.get("id"):
            token += "#" + a["id"]
            self.ids.add(a["id"])
        if a.get("class"):
            token += "." + ".".join(a["class"].split())
        for k in KEY_ATTRS:
            # the language row marks its own language as current; that is checked on its own
            if k == "aria-current" and "hreflang" in a:
                continue
            if k in a:
                token += "[%s=%s]" % (k, a[k])
        self.tags.append(token)
        self.elements.append((tag, a, self.getpos()[0]))
        if tag == "title":
            self._in_title = True

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

    def handle_endtag(self, tag):
        if tag == "title":
            self._in_title = False

    def handle_data(self, data):
        if self._in_title:
            self.title += data


def parse(path):
    p = Page()
    with open(path, encoding="utf-8") as f:
        p.feed(f.read())
    return p


def local_target(ref, from_file):
    """The file a reference points at on disk, or None if it isn't local."""
    ref = ref.strip()
    if not ref or ref.startswith(("mailto:", "data:", "tel:", "javascript:")):
        return None
    if ref.startswith(BASE):
        rel = ref[len(BASE):]
        base_dir = ROOT
    elif ref.startswith("/Crownfall/"):
        rel = ref[len("/Crownfall/"):]
        base_dir = ROOT
    elif re.match(r"^[a-z]+:", ref) or ref.startswith("//"):
        return None
    else:
        rel = ref
        base_dir = os.path.dirname(from_file)
    parts = urlsplit(rel)
    rel_path = unquote(parts.path)
    if rel_path == "" and parts.fragment:
        return (from_file, parts.fragment)
    target = os.path.normpath(os.path.join(base_dir, rel_path))
    if rel_path == "" or rel_path.endswith("/"):
        target = os.path.join(target, "index.html")
    return (target, parts.fragment)


def remove_run(seq, run):
    for i in range(len(seq) - len(run) + 1):
        if seq[i:i + len(run)] == run:
            return seq[:i] + seq[i + len(run):], True
    return seq, False


def main():
    problems = []
    parsed = {}

    for lang in LANGS:
        for page in PAGES:
            path = page_path(lang, page)
            if not os.path.isfile(path):
                problems.append("missing page: %s" % os.path.relpath(path, ROOT))
                continue
            parsed[(lang, page)] = parse(path)

    id_cache = {}

    def ids_of(path):
        if path not in id_cache:
            id_cache[path] = parse(path).ids if path.endswith(".html") else set()
        return id_cache[path]

    def check_refs(rel, path, p):
        for tag, a, line in p.elements:
            refs = []
            for attr in ("href", "src"):
                if attr in a:
                    refs.append((attr, a[attr]))
            for attr in ("srcset", "imagesrcset"):
                if attr in a:
                    refs += [(attr, part.strip().split()[0]) for part in a[attr].split(",") if part.strip()]
            if tag == "meta" and a.get("property") in ("og:url", "og:image"):
                refs.append((a["property"], a.get("content", "")))
            for attr, ref in refs:
                t = local_target(ref, path)
                if t is None:
                    continue
                target, frag = t
                if not os.path.isfile(target):
                    problems.append("%s:%d: %s %r points at nothing (%s)" % (rel, line, attr, ref, os.path.relpath(target, ROOT)))
                elif frag and target.endswith(".html") and frag not in ids_of(target):
                    problems.append("%s:%d: %s %r: no id %r there" % (rel, line, attr, ref, frag))

    expected_alternates = {}
    for (lang, page), p in parsed.items():
        rel = os.path.relpath(page_path(lang, page), ROOT)
        path = page_path(lang, page)
        els = p.elements

        # <html lang> matches the folder
        html = next((a for t, a, _ in els if t == "html"), {})
        if html.get("lang") != lang:
            problems.append("%s: <html lang=%r>, expected %r" % (rel, html.get("lang"), lang))

        # title, description, canonical
        if not p.title.strip():
            problems.append("%s: no <title>" % rel)
        if not any(t == "meta" and a.get("name") == "description" and a.get("content", "").strip() for t, a, _ in els):
            problems.append("%s: no meta description" % rel)
        canon = [a.get("href") for t, a, _ in els if t == "link" and a.get("rel") == "canonical"]
        if canon != [page_url(lang, page)]:
            problems.append("%s: canonical link is %r, expected %r" % (rel, canon, page_url(lang, page)))

        # the same 8 hreflang links on every page
        alts = sorted((a.get("hreflang"), a.get("href")) for t, a, _ in els if t == "link" and a.get("rel") == "alternate")
        want = sorted([(l, page_url(l, page)) for l in LANGS] + [("x-default", page_url("en", page))])
        if alts != want:
            problems.append("%s: hreflang links differ from the expected 8: %r" % (rel, sorted(set(alts) ^ set(want))))

        # the 7-language row
        row, in_row = [], False
        depth = 0
        for t, a, _ in els:
            if t == "nav" and "langs" in a.get("class", "").split():
                in_row = True
                continue
            if in_row and t == "nav":
                break
            if in_row and t == "a":
                row.append(a)
        row_langs = [a.get("hreflang") for a in row]
        if row_langs != LANGS:
            problems.append("%s: language row is %r, expected %r" % (rel, row_langs, LANGS))
        for a in row:
            l = a.get("hreflang")
            if l in LANGS:
                t = local_target(a.get("href", ""), path)
                if t is None or os.path.normpath(t[0]) != os.path.normpath(page_path(l, page)):
                    problems.append("%s: language row link for %s goes to %r" % (rel, l, a.get("href")))
                if (l == lang) != ("aria-current" in a):
                    problems.append("%s: language row marks the wrong current language (%s)" % (rel, l))

        check_refs(rel, path, p)

    # each translation has the same tags as its English page, apart from the named differences
    for page in PAGES:
        en = parsed.get(("en", page))
        if not en:
            continue
        for lang in LANGS[1:]:
            tr = parsed.get((lang, page))
            if not tr:
                continue
            seq = list(tr.tags)
            for diff in ALLOWED_DIFFERENCES:
                if diff["page"] == page:
                    seq, found = remove_run(seq, diff["tags"])
                    if not found:
                        problems.append("%s/%s: expected difference not found: %s" % (lang, page, diff["name"]))
            if seq != en.tags:
                i = next((k for k in range(min(len(seq), len(en.tags))) if seq[k] != en.tags[k]), min(len(seq), len(en.tags)))
                problems.append("%s/%s: tags differ from %s at tag %d: %r here, %r in English" % (
                    lang, page, page, i + 1, seq[i] if i < len(seq) else "(end)", en.tags[i] if i < len(en.tags) else "(end)"))

    # first load: the page, its styles and each picture's 1920 file (or the file itself)
    heaviest = 0
    for lang in LANGS:
        p = parsed.get((lang, "index.html"))
        if not p:
            continue
        path = page_path(lang, "index.html")
        files = {path}
        for t, a, _ in p.elements:
            if t == "link" and a.get("rel") == "stylesheet":
                tgt = local_target(a["href"], path)
                if tgt:
                    files.add(tgt[0])
            if t == "img":
                srcs = [s.strip().split()[0] for s in a.get("srcset", "").split(",") if s.strip()]
                pick = next((s for s in srcs if "-1920." in s), a.get("src"))
                tgt = local_target(pick, path) if pick else None
                if tgt:
                    files.add(tgt[0])
        total = sum(os.path.getsize(f) for f in files if os.path.isfile(f))
        heaviest = max(heaviest, total)
        if total >= WEIGHT_LIMIT:
            problems.append("%s: first load is %d bytes, over %d" % (os.path.relpath(path, ROOT), total, WEIGHT_LIMIT))

    # the 404 page and sitemap, when there
    p404 = os.path.join(ROOT, "404.html")
    if os.path.isfile(p404):
        check_refs("404.html", p404, parse(p404))

    if problems:
        for pr in problems:
            print(pr)
        print("%d problem(s)" % len(problems))
        return 1
    print("site ok: %d pages in step, links resolve, first load %d bytes" % (len(parsed), heaviest))
    return 0


if __name__ == "__main__":
    sys.exit(main())
