from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.enum.style import WD_STYLE_TYPE
from pathlib import Path
import shutil

ROOT=Path('/mnt/data/LotoAtlas_BrandKit_v0.2')
OUT=ROOT/'brandbook'/'LotoAtlas_Brandbook_v0.2.docx'
C={
 'ink':'101729','ink2':'1D2740','violet':'6D3CFF','violet2':'8B5CFF','blue':'1677FF','teal':'12C7B0','green':'22B96B','green2':'66D889','offwhite':'F7F9FC','white':'FFFFFF','muted':'6B7280','line':'DDE3EC','light':'EEF2F7'
}

def set_cell_fill(cell, hexcolor):
    tcPr=cell._tc.get_or_add_tcPr(); shd=tcPr.find(qn('w:shd'))
    if shd is None:
        shd=OxmlElement('w:shd'); tcPr.append(shd)
    shd.set(qn('w:fill'),hexcolor)

def set_cell_margins(cell, top=120, start=140, bottom=120, end=140):
    tc=cell._tc; tcPr=tc.get_or_add_tcPr(); tcMar=tcPr.first_child_found_in('w:tcMar')
    if tcMar is None:
        tcMar=OxmlElement('w:tcMar'); tcPr.append(tcMar)
    for m,val in [('top',top),('start',start),('bottom',bottom),('end',end)]:
        node=tcMar.find(qn('w:'+m))
        if node is None:
            node=OxmlElement('w:'+m); tcMar.append(node)
        node.set(qn('w:w'),str(val)); node.set(qn('w:type'),'dxa')

def set_font(run, name='Inter', size=None, bold=None, color=None):
    run.font.name=name
    run._element.get_or_add_rPr().rFonts.set(qn('w:ascii'),name)
    run._element.get_or_add_rPr().rFonts.set(qn('w:hAnsi'),name)
    if size: run.font.size=Pt(size)
    if bold is not None: run.bold=bold
    if color: run.font.color.rgb=RGBColor.from_string(color)

def set_para(p, before=0, after=6, line=1.08):
    pf=p.paragraph_format; pf.space_before=Pt(before); pf.space_after=Pt(after); pf.line_spacing=line

def add_p(doc, text='', size=10.5, color='1D2740', bold=False, align=None, before=0, after=6):
    p=doc.add_paragraph(); set_para(p,before,after)
    if align is not None: p.alignment=align
    r=p.add_run(text); set_font(r,size=size,bold=bold,color=color)
    return p

def add_bullet(doc,text,level=0):
    p=doc.add_paragraph(style='List Bullet' if level==0 else 'List Bullet 2'); set_para(p,0,4)
    r=p.add_run(text); set_font(r,size=10.2,color=C['ink2'])
    return p

def add_h1(doc, num, title, subtitle=None):
    p=doc.add_paragraph(); set_para(p,0,5)
    r=p.add_run(f'{num:02d}  '); set_font(r,size=12,bold=True,color=C['violet'])
    r=p.add_run(title.upper()); set_font(r,size=22,bold=True,color=C['ink'])
    if subtitle:
        p2=doc.add_paragraph(); set_para(p2,0,16)
        r=p2.add_run(subtitle); set_font(r,size=11.5,color=C['muted'])
    else:
        p.paragraph_format.space_after=Pt(16)
    return p

def add_h2(doc,title):
    p=doc.add_paragraph(); set_para(p,10,5)
    r=p.add_run(title); set_font(r,size=13.2,bold=True,color=C['ink'])
    return p

def add_callout(doc,title,body,accent='6D3CFF'):
    t=doc.add_table(rows=1,cols=1); t.alignment=WD_TABLE_ALIGNMENT.CENTER
    t.autofit=False; t.columns[0].width=Inches(6.25)
    cell=t.cell(0,0); set_cell_fill(cell,'F3F0FF'); set_cell_margins(cell,180,220,180,220)
    p=cell.paragraphs[0]; set_para(p,0,4)
    r=p.add_run(title); set_font(r,size=10.5,bold=True,color=accent)
    p2=cell.add_paragraph(); set_para(p2,0,0)
    r=p2.add_run(body); set_font(r,size=10.5,color=C['ink2'])
    doc.add_paragraph().paragraph_format.space_after=Pt(2)

def add_table(doc, headers, rows, widths=None):
    t=doc.add_table(rows=1,cols=len(headers)); t.alignment=WD_TABLE_ALIGNMENT.CENTER; t.autofit=False
    for i,h in enumerate(headers):
        cell=t.rows[0].cells[i]; set_cell_fill(cell,C['ink']); set_cell_margins(cell)
        cell.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
        p=cell.paragraphs[0]; p.alignment=WD_ALIGN_PARAGRAPH.LEFT; set_para(p,0,0)
        r=p.add_run(h); set_font(r,size=9.2,bold=True,color=C['white'])
        if widths: cell.width=Inches(widths[i])
    for row in rows:
        cells=t.add_row().cells
        for i,val in enumerate(row):
            cell=cells[i]; set_cell_fill(cell,C['white']); set_cell_margins(cell); cell.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
            p=cell.paragraphs[0]; set_para(p,0,0)
            r=p.add_run(str(val)); set_font(r,size=9.1,color=C['ink2'])
            if widths: cell.width=Inches(widths[i])
    # subtle borders
    for row in t.rows:
        for cell in row.cells:
            tcPr=cell._tc.get_or_add_tcPr(); borders=tcPr.first_child_found_in('w:tcBorders')
            if borders is None:
                borders=OxmlElement('w:tcBorders'); tcPr.append(borders)
            for edge in ['top','left','bottom','right','insideH','insideV']:
                tag='w:'+edge; el=borders.find(qn(tag))
                if el is None: el=OxmlElement(tag); borders.append(el)
                el.set(qn('w:val'),'single'); el.set(qn('w:sz'),'4'); el.set(qn('w:color'),C['line'])
    doc.add_paragraph().paragraph_format.space_after=Pt(3)
    return t

def page_break(doc): doc.add_page_break()

def add_footer(section):
    footer=section.footer
    p=footer.paragraphs[0]; p.alignment=WD_ALIGN_PARAGRAPH.CENTER
    r=p.add_run('LotoAtlas  •  Brandbook v0.2  •  Direção de marca para desenvolvimento')
    set_font(r,size=8,color='7A8496')

# Document setup
doc=Document()
sec=doc.sections[0]
sec.page_width=Inches(8.27); sec.page_height=Inches(11.69)
sec.top_margin=Inches(0); sec.bottom_margin=Inches(0); sec.left_margin=Inches(0); sec.right_margin=Inches(0)
# cover full page
p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.space_after=Pt(0)
r=p.add_run(); r.add_picture(str(ROOT/'preview'/'brandbook-cover.png'), width=Inches(8.27), height=Inches(11.69))

# Body section
sec=doc.add_section(WD_SECTION.NEW_PAGE)
sec.page_width=Inches(8.27); sec.page_height=Inches(11.69)
sec.top_margin=Inches(0.72); sec.bottom_margin=Inches(0.65); sec.left_margin=Inches(0.78); sec.right_margin=Inches(0.78)
sec.footer.is_linked_to_previous=False
add_footer(sec)

# Normal style
styles=doc.styles
for sname in ['Normal','List Bullet','List Bullet 2']:
    st=styles[sname]; st.font.name='Inter'; st._element.rPr.rFonts.set(qn('w:ascii'),'Inter'); st._element.rPr.rFonts.set(qn('w:hAnsi'),'Inter'); st.font.size=Pt(10.5); st.font.color.rgb=RGBColor.from_string(C['ink2'])

# 1 Contents / status
add_h1(doc,1,'Como usar este Brandbook','Sistema de identidade visual e verbal do LotoAtlas.')
add_callout(doc,'STATUS DA IDENTIDADE','LotoAtlas é a direção de marca aprovada para desenvolvimento. O nome teve busca exata sem ocorrência informada no INPI em 09/09/2026, mas a registrabilidade final ainda depende de busca por semelhança e exame do INPI.')
add_h2(doc,'O que este manual define')
for x in ['plataforma e posicionamento de marca','arquitetura do nome e mensagens','logo, símbolo e suas variações','paleta, gradientes e acessibilidade','tipografia','tom de voz e vocabulário','iconografia, fotografia e ilustração','aplicação em produto, social e materiais','governança e checklist de produção']:
    add_bullet(doc,x)
add_h2(doc,'Princípio central')
add_callout(doc,'ESTRATÉGIA + SORTE','O sistema visual reconhece que loterias envolvem acaso, mas coloca método e clareza na frente. Por isso, a rede é estrutural e o trevo é central porém secundário.',accent=C['green'])
page_break(doc)

# 2 Brand platform
add_h1(doc,2,'Plataforma de Marca','Por que a marca existe e qual espaço pretende ocupar.')
add_table(doc,['Elemento','Definição'],[
['Essência','Clareza para explorar possibilidades.'],
['Propósito','Ajudar pessoas a organizar, analisar e acompanhar seus jogos com mais clareza, método e responsabilidade.'],
['Promessa','Transformar uma experiência normalmente guiada por impulso ou superstição em uma experiência mais organizada e compreensível.'],
['Tagline','Organize. Analise. Confira.'],
['Mensagem de apoio','Estratégia com mais clareza para os seus jogos.'],
], widths=[1.55,4.75])
add_h2(doc,'Pilares')
add_table(doc,['Pilar','Expressão na marca'],[
['Clareza','Explicação simples, hierarquia visual, métricas compreensíveis.'],
['Método','Estratégias explícitas, regras documentadas e comparações auditáveis.'],
['Controle','Carteiras, histórico, conferência e decisões visíveis ao usuário.'],
['Responsabilidade','Sem previsão, pressão, promessa ou glamourização de ganhos.'],
], widths=[1.45,4.85])
page_break(doc)

# 3 Positioning
add_h1(doc,3,'Posicionamento','Uma marca de tecnologia e análise, não uma estética de cassino.')
add_callout(doc,'POSICIONAMENTO','Para adultos que jogam loterias e querem mais organização e informação, LotoAtlas é uma plataforma digital de estratégias, carteiras, histórico e conferência que torna regras e resultados compreensíveis sem vender previsão ou certeza.')
add_h2(doc,'Arquétipos')
add_table(doc,['Arquétipo','Peso','Como aparece'],[
['Sábio','70%','Conhecimento, lógica, explicação, transparência e método.'],
['Explorador','30%','Descoberta, possibilidades, curiosidade e autonomia.'],
], widths=[1.45,0.8,4.05])
add_h2(doc,'Personalidade')
for x in ['Inteligente, não pedante.','Objetiva, não fria.','Segura, não autoritária.','Moderna, não cripto/cassino.','Otimista, não promissora.','Responsável, não moralista.']:
    add_bullet(doc,x)
page_break(doc)

# 4 Name / messaging
add_h1(doc,4,'Nome e Mensagens','LotoAtlas traduz categoria + visão ampla.')
add_h2(doc,'Nome oficial')
add_p(doc,'LotoAtlas',size=28,bold=True,color=C['violet'],after=8)
add_p(doc,'“Loto” cria reconhecimento imediato da categoria. “Atlas” comunica mapa, organização, amplitude e visão estruturada.',size=11)
add_h2(doc,'Grafia')
add_table(doc,['Correto','Evitar'],[
['LotoAtlas','Loto Atlas'],['LotoAtlas','Lotoatlas'],['LOTOATLAS em títulos gráficos','LOTO ATLAS como nome formal']
], widths=[3.05,3.05])
add_h2(doc,'Hierarquia de mensagens')
add_table(doc,['Nível','Mensagem'],[
['Tagline','Organize. Analise. Confira.'],
['Hero','Seus jogos, em uma visão mais completa.'],
['Apoio','Organize carteiras, compare estratégias e confira resultados com mais clareza.'],
['Manifesto curto','Números constroem histórias. Você escolhe como organizar as suas.'],
], widths=[1.35,4.75])
page_break(doc)

# 5 Logo concept
add_h1(doc,5,'Logo — Conceito','Um mapa de combinações com um sinal de sorte no centro.')
p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER
p.add_run().add_picture(str(ROOT/'logos'/'png'/'lotoatlas-symbol-color-1024.png'),width=Inches(3.4))
add_table(doc,['Código visual','Significado'],[
['Rede / nós','números, jogos, relações e carteira'],
['Estrutura em A','Atlas, orientação, arquitetura e direção'],
['Trevo','sorte e reconhecimento da categoria'],
['Gradiente','tecnologia, fluxo e exploração'],
], widths=[1.7,4.4])
add_callout(doc,'HIERARQUIA DO SÍMBOLO','O trevo não deve dominar o sistema. LotoAtlas fala primeiro de método e clareza; a sorte é reconhecida como parte inevitável da loteria.',accent=C['green'])
page_break(doc)

# 6 Logo variants
add_h1(doc,6,'Assinaturas','Escolha a versão pela função e pelo espaço disponível.')
for img,cap,w in [
('lotoatlas-logo-horizontal-1600.png','Assinatura primária horizontal',5.8),
('lotoatlas-logo-stacked-1200.png','Assinatura vertical / institucional',3.0),
('lotoatlas-app-icon-512.png','App icon / avatar',1.55),
]:
    p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.add_run().add_picture(str(ROOT/'logos'/'png'/img),width=Inches(w))
    cp=doc.add_paragraph(); cp.alignment=WD_ALIGN_PARAGRAPH.CENTER; set_para(cp,0,9); rr=cp.add_run(cap); set_font(rr,size=9.5,color=C['muted'])
page_break(doc)

# 7 Protection and sizes
add_h1(doc,7,'Área de Proteção e Redução','A marca precisa respirar e continuar legível.')
add_h2(doc,'Área de proteção')
add_p(doc,'Defina x como o diâmetro de um nó externo do símbolo. Preserve no mínimo 1x em todos os lados da assinatura.',size=11)
add_h2(doc,'Tamanhos mínimos')
add_table(doc,['Aplicação','Mínimo recomendado'],[
['Logo horizontal digital','120 px de largura'],
['Logo horizontal impresso','30 mm de largura'],
['Símbolo digital','32 px'],
['Favicon','micro mark simplificado em 16–32 px'],
], widths=[3.35,2.75])
add_h2(doc,'Fundos recomendados')
add_table(doc,['Fundo','Uso'],[
['Atlas Off-white / branco','assinatura colorida'],
['Atlas Ink','assinatura reversa'],
['Imagem','somente com contraste e área visual limpa'],
], widths=[2.6,3.5])
page_break(doc)

# 8 Misuse
add_h1(doc,8,'Usos Incorretos','Consistência constrói reconhecimento.')
for x in ['Não distorcer ou esticar.','Não inclinar a marca.','Não trocar cores livremente.','Não aplicar sombras/glows pesados.','Não aumentar o trevo até dominar a rede.','Não adicionar cifrão, moedas, dinheiro ou jackpot ao logo.','Não usar efeitos 3D ou estética de cassino.','Não usar cores de uma modalidade como identidade corporativa principal.','Não colocar a marca sobre fundos de baixo contraste.','Não recriar o wordmark com outra fonte.']:
    add_bullet(doc,x)
add_callout(doc,'POR QUE NÃO USAR DINHEIRO NO LOGO?','A marca pode reconhecer sorte pelo trevo, mas dinheiro, moedas e jackpot deslocariam o posicionamento de “ferramenta de análise” para “promessa de ganho / casa de apostas”.')
page_break(doc)

# 9 Colors
add_h1(doc,9,'Paleta de Cores','Tecnologia e confiança com um código de sorte controlado.')
colors=[('Atlas Ink','#101729','Confiança / fundo'),('Atlas Violet','#6D3CFF','Marca / tecnologia'),('Atlas Blue','#1677FF','Clareza / dados'),('Atlas Teal','#12C7B0','Análise / apoio'),('Luck Green','#22B96B','Trevo / confirmação'),('Atlas Off-white','#F7F9FC','Fundo')]
t=doc.add_table(rows=1,cols=3); t.alignment=WD_TABLE_ALIGNMENT.CENTER; t.autofit=False
for i,h in enumerate(['Cor','Código','Papel']):
    cell=t.rows[0].cells[i]; set_cell_fill(cell,C['ink']); set_cell_margins(cell); rr=cell.paragraphs[0].add_run(h); set_font(rr,size=9.2,bold=True,color=C['white'])
for name,hexv,role in colors:
    row=t.add_row().cells; set_cell_margins(row[0]); set_cell_margins(row[1]); set_cell_margins(row[2]);
    set_cell_fill(row[0],hexv.replace('#',''))
    rr=row[0].paragraphs[0].add_run(name); set_font(rr,size=9,bold=True,color='FFFFFF' if name not in ['Atlas Off-white'] else C['ink'])
    rr=row[1].paragraphs[0].add_run(hexv); set_font(rr,size=9.2,color=C['ink2'])
    rr=row[2].paragraphs[0].add_run(role); set_font(rr,size=9.2,color=C['ink2'])
add_h2(doc,'Gradientes')
add_p(doc,'Atlas Spectrum: #6D3CFF → #1677FF → #12C7B0',bold=True,color=C['violet'])
add_p(doc,'Luck: #66D889 → #22B96B',bold=True,color=C['green'])
page_break(doc)

# 10 Accessibility
add_h1(doc,10,'Acessibilidade de Cor','Cor comunica; contraste garante leitura.')
add_table(doc,['Par','Contraste aprox.','Orientação'],[
['Atlas Ink / White','17,85:1','Excelente'],
['Atlas Ink / Off-white','16,92:1','Excelente'],
['Atlas Violet / White','5,61:1','Texto normal aprovado'],
['Atlas Blue / White','4,10:1','Evitar texto pequeno'],
['Atlas Teal / Atlas Ink','8,35:1','Excelente'],
['Luck Green / Atlas Ink','6,99:1','Excelente'],
['Atlas Teal / White','2,14:1','Não usar para texto normal'],
['Luck Green / White','2,55:1','Não usar para texto normal'],
], widths=[2.55,1.25,2.3])
add_callout(doc,'REGRA DE INTERFACE','Estados nunca devem depender apenas da cor. Use texto, ícone e/ou forma para comunicar seleção, acerto, erro e confirmação.')
page_break(doc)

# 11 Typography
add_h1(doc,11,'Tipografia','Inter como linguagem principal de produto e comunicação.')
add_p(doc,'Aa',size=54,bold=True,color=C['ink'],after=0)
add_p(doc,'Inter',size=20,bold=True,color=C['violet'],after=12)
add_table(doc,['Uso','Peso recomendado'],[
['Display / Hero','ExtraBold 800'],['H1/H2','Bold 700'],['H3','SemiBold 600'],['Texto','Regular 400'],['Labels/UI','Medium/SemiBold 500–600'],['Dados','SemiBold 600 + numerais tabulares quando possível']
], widths=[3.0,3.1])
add_h2(doc,'Fallback digital')
add_p(doc,'Inter, system-ui, -apple-system, BlinkMacSystemFont, “Segoe UI”, Arial, sans-serif',size=9.8,color=C['muted'])
page_break(doc)

# 12 Tone
add_h1(doc,12,'Tom de Voz','Factual antes de persuasivo.')
add_table(doc,['Faça','Evite'],[
['Explique o que a estratégia muda.','Dizer que ela “vai aumentar suas chances de ganhar”.'],
['Traduza termos técnicos.','Expor jargão como primeira camada.'],
['Reconheça a aleatoriedade.','Falar em “números fortes” ou previsão.'],
['Convide o usuário a comparar.','Pressionar com urgência.'],
['Use confiança tranquila.','Euforia de jackpot.'],
], widths=[3.05,3.05])
add_h2(doc,'Vocabulário preferido')
add_p(doc,'organizar • analisar • conferir • carteira • estratégia • método • histórico • resultado oficial • simulação • clareza • comparação • controle',size=10.5,color=C['violet'],bold=True)
add_h2(doc,'Claims proibidos')
add_p(doc,'certeza • garantido • número vencedor • fórmula para ganhar • lucro garantido • recuperar perdas • oportunidade imperdível • aposta sem risco',size=10.2,color='A33A3A')
page_break(doc)

# 13 Iconography / imagery
add_h1(doc,13,'Iconografia e Imagem','Visual de produto digital, não de cassino.')
add_table(doc,['Território','Usar','Evitar'],[
['Estratégia','rede, nós, barras, matriz','bolas douradas/jackpot'],
['Carteira','cards, camadas, grids','maços de dinheiro'],
['Análise','lupa, gráfico, histórico','cristal/previsão'],
['Conferência','check, shield, comparação','troféu de ganhador'],
['Sorte','trevo secundário','trevo gigante como única ideia'],
], widths=[1.35,2.3,2.45])
add_h2(doc,'Fotografia')
for x in ['adultos reais em contexto cotidiano','smartphone/notebook','expressão tranquila e concentrada','ambiente de decisão/organização']:
    add_bullet(doc,x)
add_p(doc,'Evitar euforia exagerada, champanhe, chuva de dinheiro ou representação de “ganhador”.',size=10.3,color='A33A3A',bold=True)
page_break(doc)

# 14 UI
add_h1(doc,14,'Aplicação na Interface','A marca deve organizar a experiência, não disputar atenção com os dados.')
add_table(doc,['Elemento','Diretriz'],[
['Botão primário','Atlas Violet + texto branco'],
['Botão secundário','branco/off-white + borda Atlas Line + Atlas Ink'],
['Cards','fundo branco, raio moderado, sombra mínima'],
['Sucesso','Luck Green + label/ícone textual'],
['Erro','cor semântica própria de UI, não identidade principal'],
['Números','alto contraste e estados inequívocos'],
], widths=[2.0,4.1])
add_callout(doc,'MODALIDADES','Mega-Sena, Lotofácil e futuros jogos podem manter cores próprias como identificadores locais. A navegação e a marca institucional continuam LotoAtlas.')
page_break(doc)

# 15 Social
add_h1(doc,15,'Conteúdo e Social','Educação e confiança como motor de aquisição.')
add_h2(doc,'Pilares editoriais')
for x in ['Entenda o jogo — regras, probabilidades e glossário.','Estratégias sem mito — o que muda e o que não muda.','Dados e resultados — fatos e histórico.','Como usar o LotoAtlas — tutoriais e features.','Jogo responsável — orçamento e limites.']:
    add_bullet(doc,x)
add_h2(doc,'Template de referência')
p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.add_run().add_picture(str(ROOT/'preview'/'social-post-template.png'),width=Inches(3.5))
add_p(doc,'Um dado ou ideia por peça. Gradiente como detalhe, não como ruído.',size=10,color=C['muted'],align=WD_ALIGN_PARAGRAPH.CENTER)
page_break(doc)

# 16 Legal
add_h1(doc,16,'Naming, Legal e Responsabilidade','A identidade precisa ser diferenciada sem sugerir vínculo oficial.')
add_h2(doc,'Triagem atual')
add_p(doc,'Busca exata informada no INPI em 09/09/2026: nenhum resultado exato para “LotoAtlas”. Isso não garante registrabilidade.',size=10.8)
add_h2(doc,'Antes do lançamento comercial')
for x in ['buscar marcas semelhantes e fonéticas no INPI','validar classes aplicáveis com profissional','verificar domínio .com.br e .com','verificar App Store e Google Play','verificar handles em redes sociais','obter parecer de PI se a monetização avançar']:
    add_bullet(doc,x)
add_h2(doc,'Independência')
add_p(doc,'Nunca sugerir que LotoAtlas é produto da CAIXA, loteria oficial, operador de apostas ou casa de apostas.',size=10.8,bold=True,color=C['ink'])
page_break(doc)

# 17 Assets
add_h1(doc,17,'Pacote de Ativos','Arquivos entregues para continuidade do Brandbook e produção.')
add_table(doc,['Grupo','Conteúdo'],[
['SVG','horizontal, reverso, vertical, símbolo, mono, wordmark, app icon, favicon'],
['PNG','logos principais, símbolo, app icons e favicons'],
['Tokens','colors.json, typography.json, brand-metadata.json, tokens.css'],
['Templates','social 1:1, story 9:16, apresentação 16:9'],
['Guidelines','14 arquivos Markdown de estratégia e uso'],
['Referência','boards visuais aprovados na conversa'],
], widths=[1.5,4.6])
add_h2(doc,'Status dos vetores')
add_p(doc,'São ativos vetoriais de trabalho coerentes com a direção aprovada. Recomenda-se um último refinamento do símbolo e a conversão do wordmark em curvas antes de registro definitivo e ampla produção comercial.',size=10.5)
page_break(doc)

# 18 Next steps
add_h1(doc,18,'Próximos Passos','Do sistema v0.1 para um Brandbook final v1.0.')
add_table(doc,['Prioridade','Próximo passo'],[
['P1','Busca por semelhança e disponibilidade de domínio/handles.'],
['P1','Refino final do símbolo/trevo com designer e teste de redução.'],
['P1','Aplicar identidade no produto real e validar contraste/legibilidade.'],
['P2','Criar regras de co-branding e campanhas.'],
['P2','Criar componentes sociais adicionais.'],
['P2','Gerar finais AI/EPS/PDF e CMYK/Pantone se houver impressão.'],
['P3','Pesquisa de reconhecimento/aceitação após uso real.'],
], widths=[1.0,5.1])
add_callout(doc,'NORTE DA MARCA','LotoAtlas não precisa parecer “sortudo” para falar de loteria. Precisa mostrar que entende a categoria, reconhece o acaso e dá ao usuário mais clareza sobre o que está fazendo.')
add_p(doc,'LotoAtlas',size=30,bold=True,color=C['ink'],align=WD_ALIGN_PARAGRAPH.CENTER,before=25,after=2)
add_p(doc,'ORGANIZE. ANALISE. CONFIRA.',size=11,bold=True,color=C['violet'],align=WD_ALIGN_PARAGRAPH.CENTER)

# Save
OUT.parent.mkdir(parents=True,exist_ok=True)
doc.save(OUT)
print(OUT)
