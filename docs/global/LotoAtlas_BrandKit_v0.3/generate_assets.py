from pathlib import Path
import json, subprocess, textwrap

ROOT = Path('/mnt/data/LotoAtlas_BrandKit_v0.2')
SVG = ROOT/'logos'/'svg'
PNG = ROOT/'logos'/'png'
TOK = ROOT/'design-tokens'
TPL = ROOT/'templates'
PRE = ROOT/'preview'
for p in [SVG,PNG,TOK,TPL,PRE]: p.mkdir(parents=True, exist_ok=True)

C = {
  'ink':'#101729',
  'ink2':'#1D2740',
  'violet':'#6D3CFF',
  'violet2':'#8B5CFF',
  'blue':'#1677FF',
  'teal':'#12C7B0',
  'green':'#22B96B',
  'green2':'#66D889',
  'offwhite':'#F7F9FC',
  'white':'#FFFFFF',
  'muted':'#6B7280',
  'line':'#DDE3EC',
}

def defs():
    return f'''<defs>
      <linearGradient id="atlasGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="{C['violet']}"/>
        <stop offset="52%" stop-color="{C['blue']}"/>
        <stop offset="100%" stop-color="{C['teal']}"/>
      </linearGradient>
      <linearGradient id="atlasGrad2" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="{C['violet2']}"/>
        <stop offset="100%" stop-color="{C['violet']}"/>
      </linearGradient>
      <linearGradient id="cloverGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="{C['green2']}"/>
        <stop offset="100%" stop-color="{C['green']}"/>
      </linearGradient>
      <filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#101729" flood-opacity="0.14"/>
      </filter>
    </defs>'''

def clover(cx=200, cy=162, scale=1.0, fill='url(#cloverGrad)'):
    """Balanced four-leaf clover with the optical center at (cx, cy).

    Each leaf is a heart-shaped lobe whose point meets the common center.
    Rotating one canonical leaf around the exact same origin avoids the
    vertical drift/asymmetry present in the first draft.
    """
    leaf = 'M 0 0 C -10 -12 -38 -32 -38 -56 C -38 -82 -8 -92 0 -68 C 8 -92 38 -82 38 -56 C 38 -32 10 -12 0 0 Z'
    parts=[]
    for angle in (0, 90, 180, 270):
        parts.append(f'<path d="{leaf}" transform="translate({cx},{cy}) rotate({angle}) scale({scale})" fill="{fill}"/>')
    parts.append(f'<circle cx="{cx}" cy="{cy}" r="{7*scale}" fill="{fill}"/>')
    return ''.join(parts)

def symbol_svg(bg=None, mono=None, width=400, height=330, padding=0):
    if mono:
        stroke = mono
        nodes = [mono]*6
        clover_fill = mono
    else:
        stroke = 'url(#atlasGrad)'
        nodes = [C['violet2'],C['blue'],C['teal'],C['violet'],C['teal'],C['blue']]
        clover_fill = 'url(#cloverGrad)'
    bgrect = f'<rect width="100%" height="100%" fill="{bg}"/>' if bg else ''
    coords=[(200,46),(114,132),(286,132),(63,265),(200,265),(337,265)]
    edges=[(0,1),(0,2),(1,2),(1,3),(1,4),(2,4),(2,5)]
    lines=''.join(f'<line x1="{coords[a][0]}" y1="{coords[a][1]}" x2="{coords[b][0]}" y2="{coords[b][1]}" stroke="{stroke}" stroke-width="15" stroke-linecap="round"/>' for a,b in edges)
    circles=''.join(f'<circle cx="{x}" cy="{y}" r="27" fill="{nodes[i]}" stroke="{C["white"] if bg==C["ink"] else C["white"]}" stroke-opacity="0.10" stroke-width="2"/>' for i,(x,y) in enumerate(coords))
    # v0.3 optical-centering correction: the node network's true visible
    # bounds (including the 27px node radius) are y=19..292, whose center
    # (155.5) sits 9.5px above the 400x330 canvas's own center (165). The
    # viewBox is shifted up by 9.5 (instead of moving any node/clover
    # coordinate) so the unchanged geometry renders with symmetric top/bottom
    # margins (28.5/28.5) — a framing fix, not a redraw.
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 -9.5 400 330">
    {defs()}{bgrect}
    <g>{lines}{circles}{clover(200,165,0.58,clover_fill)}</g>
    </svg>'''

def ui_symbol_transparent():
    """Tightly-cropped, transparent symbol for in-app UI use (header, compact
    nav). No background rect — meant to sit directly on whatever surface
    token is behind it, never a baked-in dark rectangle."""
    body = symbol_svg().split('<g>')[1].split('</g>')[0]
    # True content bbox including node radius: x=36..364, y=19..292 (already
    # symmetric in x around 200); pad 15px on all sides for breathing room.
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="358" height="303" viewBox="21 4 358 303">
    {defs()}
    <g>{body}</g>
    </svg>'''

def primary_horizontal(reversed=False):
    ink = C['white'] if reversed else C['ink']
    tag = '#CFD6E4' if reversed else C['muted']
    bg = C['ink'] if reversed else None
    bgrect = f'<rect width="100%" height="100%" fill="{bg}"/>' if bg else ''
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="1300" height="360" viewBox="0 0 1300 360">
    {defs()}{bgrect}
    <g transform="translate(20,12) scale(0.98)">
      <g transform="scale(0.82)">{symbol_svg().split('<g>')[1].split('</g>')[0]}</g>
    </g>
    <text x="390" y="170" font-family="Inter, Arial, sans-serif" font-size="108" font-weight="800" letter-spacing="-4" fill="{ink}">Loto</text>
    <text x="617" y="170" font-family="Inter, Arial, sans-serif" font-size="108" font-weight="800" letter-spacing="-4" fill="url(#atlasGrad2)">Atlas</text>
    <text x="396" y="232" font-family="Inter, Arial, sans-serif" font-size="25" font-weight="600" letter-spacing="8" fill="{tag}">ORGANIZE. ANALISE. CONFIRA.</text>
    </svg>'''

def ui_horizontal_transparent():
    """Transparent, tagline-free horizontal lockup for in-app navigation
    headers. Same symbol+wordmark geometry/position as primary_horizontal
    (reversed), just without the baked-in dark rect or the tagline line, and
    cropped tightly to the actual rendered content (measured via headless
    browser getBBox: symbol x=48.93..312.51 y=27.27..246.65; "Loto"+"Atlas"
    text x=390..903.94 y=51..203) with a 20px margin."""
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="895" height="260" viewBox="29 7 895 260">
    {defs()}
    <g transform="translate(20,12) scale(0.98)">
      <g transform="scale(0.82)">{symbol_svg().split('<g>')[1].split('</g>')[0]}</g>
    </g>
    <text x="390" y="170" font-family="Inter, Arial, sans-serif" font-size="108" font-weight="800" letter-spacing="-4" fill="{C['white']}">Loto</text>
    <text x="617" y="170" font-family="Inter, Arial, sans-serif" font-size="108" font-weight="800" letter-spacing="-4" fill="url(#atlasGrad2)">Atlas</text>
    </svg>'''

def stacked(reversed=False):
    ink = C['white'] if reversed else C['ink']
    tag = '#CFD6E4' if reversed else C['muted']
    bg = C['ink'] if reversed else None
    bgrect = f'<rect width="100%" height="100%" fill="{bg}"/>' if bg else ''
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="720" height="760" viewBox="0 0 720 760">
    {defs()}{bgrect}
    <g transform="translate(160,28)">{symbol_svg().split('<g>')[1].split('</g>')[0]}</g>
    <text x="360" y="545" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="95" font-weight="800" letter-spacing="-4" fill="{ink}">Loto<tspan fill="url(#atlasGrad2)">Atlas</tspan></text>
    <text x="360" y="610" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="600" letter-spacing="7" fill="{tag}">ORGANIZE. ANALISE. CONFIRA.</text>
    </svg>'''

def wordmark(reversed=False):
    ink = C['white'] if reversed else C['ink']
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="900" height="220" viewBox="0 0 900 220">
    {defs()}
    <text x="20" y="145" font-family="Inter, Arial, sans-serif" font-size="130" font-weight="800" letter-spacing="-5" fill="{ink}">Loto</text>
    <text x="315" y="145" font-family="Inter, Arial, sans-serif" font-size="130" font-weight="800" letter-spacing="-5" fill="url(#atlasGrad2)">Atlas</text>
    </svg>'''

def app_icon():
    # v0.3 optical-centering correction: with scale(2.0), the symbol's true
    # content (post-transform y=203..749, center 476) sat 34px above the
    # backdrop circle's center (510) — a visibly larger empty margin below
    # the mark than above. translateY 165 -> 199 (+34) recenters the
    # unchanged symbol geometry inside the circle (92px margin top/bottom).
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
    {defs()}
    <rect x="32" y="32" width="960" height="960" rx="220" fill="{C['ink']}"/>
    <circle cx="512" cy="510" r="365" fill="#14203B"/>
    <g transform="translate(112,199) scale(2.0)">
      {symbol_svg().split('<g>')[1].split('</g>')[0]}
    </g>
    </svg>'''

def favicon():
    # simplified mark for micro size
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    {defs()}
    <rect width="128" height="128" rx="28" fill="{C['ink']}"/>
    <path d="M31 93 L64 27 L97 93 M44 67 L84 67" fill="none" stroke="url(#atlasGrad)" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
    {clover(64,63,0.21,'url(#cloverGrad)')}
    </svg>'''

files={
 'lotoatlas-symbol-color.svg':symbol_svg(),
 'lotoatlas-symbol-on-dark.svg':symbol_svg(bg=C['ink']),
 'lotoatlas-symbol-mono-ink.svg':symbol_svg(mono=C['ink']),
 'lotoatlas-symbol-mono-white.svg':symbol_svg(mono=C['white'], bg=C['ink']),
 'lotoatlas-logo-horizontal.svg':primary_horizontal(False),
 'lotoatlas-logo-horizontal-reversed.svg':primary_horizontal(True),
 'lotoatlas-logo-stacked.svg':stacked(False),
 'lotoatlas-logo-stacked-reversed.svg':stacked(True),
 'lotoatlas-wordmark.svg':wordmark(False),
 'lotoatlas-wordmark-reversed.svg':wordmark(True),
 'lotoatlas-app-icon.svg':app_icon(),
 'lotoatlas-favicon.svg':favicon(),
}
for name,svg in files.items():
    (SVG/name).write_text(svg,encoding='utf-8')

# Design tokens
colors = {
  'brand': {
    'atlas-ink': C['ink'], 'atlas-ink-2':C['ink2'], 'atlas-violet':C['violet'],
    'atlas-violet-light':C['violet2'], 'atlas-blue':C['blue'], 'atlas-teal':C['teal'],
    'luck-green':C['green'], 'luck-green-light':C['green2'], 'atlas-offwhite':C['offwhite'],
    'atlas-white':C['white'], 'atlas-muted':C['muted'], 'atlas-line':C['line']
  },
  'gradients': {
    'atlas-spectrum':'linear-gradient(135deg, #6D3CFF 0%, #1677FF 52%, #12C7B0 100%)',
    'atlas-violet':'linear-gradient(90deg, #8B5CFF 0%, #6D3CFF 100%)',
    'luck':'linear-gradient(135deg, #66D889 0%, #22B96B 100%)'
  }
}
(TOK/'colors.json').write_text(json.dumps(colors,ensure_ascii=False,indent=2),encoding='utf-8')
(TOK/'tokens.css').write_text('''/* LotoAtlas brand tokens v0.2 */\n:root {\n  --la-ink:#101729; --la-ink-2:#1D2740; --la-violet:#6D3CFF; --la-violet-light:#8B5CFF;\n  --la-blue:#1677FF; --la-teal:#12C7B0; --la-luck:#22B96B; --la-luck-light:#66D889;\n  --la-offwhite:#F7F9FC; --la-white:#FFFFFF; --la-muted:#6B7280; --la-line:#DDE3EC;\n  --la-gradient:linear-gradient(135deg,#6D3CFF 0%,#1677FF 52%,#12C7B0 100%);\n  --la-gradient-luck:linear-gradient(135deg,#66D889 0%,#22B96B 100%);\n  --la-font-display:"Inter",system-ui,sans-serif; --la-font-body:"Inter",system-ui,sans-serif;\n}\n''',encoding='utf-8')
(TOK/'typography.json').write_text(json.dumps({
  'primary_family':'Inter','fallback':'system-ui, Arial, sans-serif',
  'weights':{'regular':400,'medium':500,'semibold':600,'bold':700,'extra_bold':800},
  'usage':{'display':'700-800','headings':'600-700','body':'400','labels':'500-600'}
},ensure_ascii=False,indent=2),encoding='utf-8')
(TOK/'brand-metadata.json').write_text(json.dumps({
  'brand':'LotoAtlas','version':'0.2','status':'candidate approved for identity development',
  'tagline':'Organize. Analise. Confira.','descriptor':'Estratégia com mais clareza para os seus jogos.',
  'archetypes':{'primary':'Sábio','secondary':'Explorador'},
  'pillars':['Clareza','Método','Controle','Responsabilidade']
},ensure_ascii=False,indent=2),encoding='utf-8')

# Templates
social = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">{defs()}<rect width="1080" height="1080" fill="{C['offwhite']}"/><rect x="70" y="70" width="940" height="940" rx="60" fill="{C['white']}" stroke="{C['line']}"/><text x="110" y="150" font-family="Inter" font-size="28" font-weight="600" fill="{C['muted']}">LOTOATLAS / TEMPLATE SOCIAL 1:1</text><text x="110" y="390" font-family="Inter" font-size="76" font-weight="800" fill="{C['ink']}">Título principal</text><text x="110" y="455" font-family="Inter" font-size="34" fill="{C['muted']}">Mensagem curta, clara e responsável.</text><rect x="110" y="790" width="860" height="150" rx="36" fill="{C['ink']}"/><text x="160" y="875" font-family="Inter" font-size="34" font-weight="700" fill="{C['white']}">Organize. Analise. Confira.</text><circle cx="905" cy="865" r="35" fill="{C['green']}"/></svg>'''
(TPL/'social-post-1080x1080.svg').write_text(social,encoding='utf-8')
story = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">{defs()}<rect width="1080" height="1920" fill="{C['ink']}"/><circle cx="860" cy="280" r="360" fill="{C['violet']}" opacity="0.20"/><circle cx="220" cy="1570" r="420" fill="{C['teal']}" opacity="0.16"/><text x="90" y="220" font-family="Inter" font-size="30" font-weight="600" fill="#CBD5E1">LOTOATLAS / STORY 9:16</text><text x="90" y="760" font-family="Inter" font-size="100" font-weight="800" fill="white">Título\nprincipal</text><text x="90" y="1040" font-family="Inter" font-size="42" fill="#CBD5E1">Mensagem de apoio.</text><rect x="90" y="1520" width="900" height="160" rx="40" fill="white"/><text x="145" y="1618" font-family="Inter" font-size="40" font-weight="700" fill="{C['ink']}">Organize. Analise. Confira.</text></svg>'''
(TPL/'story-1080x1920.svg').write_text(story,encoding='utf-8')
cover = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">{defs()}<rect width="1920" height="1080" fill="{C['offwhite']}"/><rect x="0" y="0" width="720" height="1080" fill="{C['ink']}"/><circle cx="330" cy="390" r="250" fill="{C['violet']}" opacity="0.16"/><text x="820" y="330" font-family="Inter" font-size="96" font-weight="800" fill="{C['ink']}">Título da apresentação</text><text x="825" y="420" font-family="Inter" font-size="38" fill="{C['muted']}">Subtítulo / contexto</text><text x="825" y="900" font-family="Inter" font-size="28" font-weight="600" fill="{C['violet']}">LOTOATLAS</text><text x="825" y="950" font-family="Inter" font-size="24" fill="{C['muted']}">Organize. Analise. Confira.</text></svg>'''
(TPL/'presentation-cover-1920x1080.svg').write_text(cover,encoding='utf-8')

# Brandboard
board = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">{defs()}<rect width="1920" height="1080" fill="{C['offwhite']}"/><text x="100" y="110" font-family="Inter" font-size="28" font-weight="600" fill="{C['muted']}">LOTOATLAS / BRAND BOARD v0.2</text><g transform="translate(70,130)">{stacked(False).split('<svg')[1].split('>',1)[1].rsplit('</svg>',1)[0]}</g><rect x="1100" y="120" width="700" height="450" rx="60" fill="{C['ink']}"/><g transform="translate(1240,175) scale(0.92)">{symbol_svg().split('<g>')[1].split('</g>')[0]}</g><text x="1450" y="515" text-anchor="middle" font-family="Inter" font-size="54" font-weight="800" fill="white">Loto<tspan fill="{C['violet2']}">Atlas</tspan></text><text x="1100" y="650" font-family="Inter" font-size="30" font-weight="700" fill="{C['ink']}">PALETA</text><g transform="translate(1100,700)"><circle cx="35" cy="35" r="35" fill="{C['ink']}"/><circle cx="135" cy="35" r="35" fill="{C['violet']}"/><circle cx="235" cy="35" r="35" fill="{C['blue']}"/><circle cx="335" cy="35" r="35" fill="{C['teal']}"/><circle cx="435" cy="35" r="35" fill="{C['green']}"/></g><text x="1100" y="855" font-family="Inter" font-size="30" font-weight="700" fill="{C['ink']}">IDEIA CENTRAL</text><text x="1100" y="910" font-family="Inter" font-size="34" fill="{C['muted']}">Estratégia + sorte, com clareza e controle.</text><text x="1100" y="985" font-family="Inter" font-size="27" font-weight="600" letter-spacing="5" fill="{C['violet']}">ORGANIZE. ANALISE. CONFIRA.</text></svg>'''
(PRE/'lotoatlas-brandboard.svg').write_text(board,encoding='utf-8')

# Export helper

def export(svg_path, out_path, width=None, height=None):
    cmd=['inkscape',str(svg_path),'--export-filename='+str(out_path)]
    if width: cmd.append('--export-width='+str(width))
    if height: cmd.append('--export-height='+str(height))
    subprocess.run(cmd,check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE)

# Main exports
export(SVG/'lotoatlas-logo-horizontal.svg', PNG/'lotoatlas-logo-horizontal-1600.png', width=1600)
export(SVG/'lotoatlas-logo-horizontal-reversed.svg', PNG/'lotoatlas-logo-horizontal-reversed-1600.png', width=1600)
export(SVG/'lotoatlas-logo-stacked.svg', PNG/'lotoatlas-logo-stacked-1200.png', width=1200)
export(SVG/'lotoatlas-logo-stacked-reversed.svg', PNG/'lotoatlas-logo-stacked-reversed-1200.png', width=1200)
export(SVG/'lotoatlas-symbol-color.svg', PNG/'lotoatlas-symbol-color-1024.png', width=1024)
for s in [1024,512,256,192,180,128,64,32]:
    export(SVG/'lotoatlas-app-icon.svg', PNG/f'lotoatlas-app-icon-{s}.png', width=s, height=s)
for s in [128,64,48,32,16]:
    export(SVG/'lotoatlas-favicon.svg', PNG/f'lotoatlas-favicon-{s}.png', width=s, height=s)
export(PRE/'lotoatlas-brandboard.svg', PRE/'lotoatlas-brandboard.png', width=1920)
export(TPL/'social-post-1080x1080.svg', PRE/'social-post-template.png', width=1080)
export(TPL/'presentation-cover-1920x1080.svg', PRE/'presentation-cover-template.png', width=1920)

# ICO via imagemagick
subprocess.run(['/opt/imagemagick/bin/convert', str(PNG/'lotoatlas-favicon-16.png'), str(PNG/'lotoatlas-favicon-32.png'), str(PNG/'lotoatlas-favicon-48.png'), str(PNG/'lotoatlas-favicon.ico')],check=True)

print('assets generated')
