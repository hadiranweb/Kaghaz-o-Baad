from pathlib import Path
from datetime import date

root = Path('/home/ubuntu/MengTo-Skills/agent-skills/web-design')
out = Path('/home/ubuntu/kaghazobaad-repo/docs/MENGTO-DEEP-PROVENANCE-MANIFEST.yaml')
refs = {
    'skills': ('https://github.com/MengTo/Skills', '4c716b516b6b0143f3037631306b3730d2832344'),
    'sylva': ('https://github.com/MengTo/sylva', 'not-cloned-in-current-workspace'),
    'kage': ('https://github.com/MengTo/kage', '4399487d2fb42bce39c7b032fbbb50d230bf4f0b'),
    'complete-shelf': ('https://github.com/MengTo/complete-shelf', 'b0b532411a9ba9f56ebcebdffe06747be0dcd84d'),
    'sketchbook': ('https://github.com/MengTo/sketchbook', 'c1e477814c4c9e204452ebf9b298aa13629cbfc2'),
}

def yaml_quote(v):
    v = str(v).replace('\\', '\\\\').replace('"', '\\"')
    return f'"{v}"'

def category(name):
    if any(x in name for x in ('threejs','webgl','shader','vantajs','cobejs','unicorn','matterjs')): return '3d-webgl'
    if any(x in name for x in ('gsap','lenis','scroll','animation','reveal','blur','mask','marquee','progress','staggered')): return 'motion-scroll'
    if any(x in name for x in ('particle','leaves','atmosphere','gradient','shadow','laser','beam','gooey','dither')): return 'atmosphere'
    if any(x in name for x in ('book','shelf','editorial','grid','layout','paper','container','frame','wireframe','number','pricing','landing','product')): return 'editorial-layout'
    return 'interaction-ui'

def decision(name):
    if any(x in name for x in ('globe','pricing-page','company-logos','operational-enterprise-ai','tech-green-dark-mode-modern','threejs-landscape','threejs-towers','threejs-weather','webgl-laser','bright-green-tech-system-webgl')):
        return 'exclude'
    if any(x in name for x in ('threejs','webgl','shader','vantajs','cobejs','unicorn','matterjs','gsap','lenis','cursor','pointer-trail','gooey','falling-leaves','thinking-orbs')):
        return 'experiment'
    if name in {'ambient-section-particles','animation-on-scroll','beautiful-shadows','container-lines','dark-blue-contrasting-clean','dark-glass-clean-layout','dark-glass-ui','editorial-tech','framed-grid-layout','glass-dark-ui','landing-page','mesh-gradient-dark-blue-clean','nested-container-frames','number-details','scroll-progress-timeline','split-layout-technical','tailwindcss','masked-reveal'}:
        return 'adopted'
    if any(x in name for x in ('blue-','clean-','high-contrast','skeuomorphic','documentary','agency','orange-','solar-','nested-container-clean')):
        return 'reference-only'
    return 'adapt-next'

lines = [
    'manifest_version: 1',
    f'generated_at: {date.today().isoformat()}',
    'project:',
    '  repository: "hadiranweb/Kaghaz-o-Baad"',
    '  branch: "feat/comprehensive-mengto-skills-ui"',
    '  stack: [React 18, TypeScript, Vite, Tailwind CSS]',
    'sources:',
]
for key, (url, commit) in refs.items():
    lines += [f'  {key}:', f'    url: {yaml_quote(url)}', f'    commit: {yaml_quote(commit)}', '    license_status: "verify per source before direct code or asset reuse"' if key != 'skills' else '    license_status: "MIT file observed in cloned repository"']
lines += ['skill_count: 0', 'skills:']
items = sorted(p.name for p in root.iterdir() if p.is_dir())
lines[lines.index('skill_count: 0')] = f'skill_count: {len(items)}'
for name in items:
    docs = sorted(str(p.relative_to(root / name)) for p in (root / name).rglob('*') if p.is_file())
    lines += [f'  - name: {yaml_quote(name)}', f'    source: "MengTo/Skills"', f'    path: {yaml_quote(f"agent-skills/web-design/{name}")}', f'    category: {yaml_quote(category(name))}', f'    decision: {yaml_quote(decision(name))}', '    target_routes: [Home, Read, ArticleSlides, AboutProject, Live, Media]', '    runtime_assumptions: "inspect skill README/demo before port; no global runtime by default"', '    fallback: "DOM/CSS/static content; reduced-motion and touch-safe path required"', '    acceptance: "desktop pointer, keyboard, touch, RTL/LTR, reduced motion, console clean"', f'    source_files: {yaml_quote(", ".join(docs[:8]) + (" …" if len(docs) > 8 else ""))}']
out.write_text('\n'.join(lines) + '\n', encoding='utf-8')
print(f'generated {out} with {len(items)} skills')
