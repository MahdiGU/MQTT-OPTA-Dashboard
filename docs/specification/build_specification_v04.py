"""Rebuild the reviewed 2026-11-01 specification from versioned content.

Requires reportlab and pypdf. Run from any directory; outputs are repo-relative.
The source snapshot is documentation-only and does not query or modify services.
"""
from pathlib import Path
import json
import re
from xml.sax.saxutils import escape
from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Flowable, Image
from reportlab.pdfgen import canvas
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
OUT = ROOT / 'output/pdf/ElMAJD_Automation_System_Specification_v0.4.pdf'
SOURCE = HERE / 'specification-v0.4.json'
W, H = A4
CW = W - 96
GREEN = HexColor('#13745E')
DARK = HexColor('#153D35')
INK = HexColor('#233D38')
MUTED = HexColor('#607670')
PALE = HexColor('#EDF6F2')
LINE = HexColor('#D7E5DF')
AMBER = HexColor('#9A5A14')

fontdir = Path('C:/Windows/Fonts')
for name, filename in [('Body','arial.ttf'), ('Bold','arialbd.ttf'), ('Italic','ariali.ttf')]:
    pdfmetrics.registerFont(TTFont(name, str(fontdir / filename)))
pdfmetrics.registerFontFamily('Body', normal='Body', bold='Bold', italic='Italic', boldItalic='Bold')
STYLES = {
    'body': ParagraphStyle('body', fontName='Body', fontSize=9.2, leading=13.6, textColor=INK, spaceAfter=8),
    'small': ParagraphStyle('small', fontName='Body', fontSize=8, leading=11.4, textColor=MUTED, spaceAfter=6),
    'h1': ParagraphStyle('h1', fontName='Bold', fontSize=23, leading=27, textColor=DARK, spaceAfter=12),
    'h2': ParagraphStyle('h2', fontName='Bold', fontSize=11.5, leading=15, textColor=GREEN, spaceBefore=10, spaceAfter=6, keepWithNext=True),
    'cell': ParagraphStyle('cell', fontName='Body', fontSize=8.1, leading=11.3, textColor=INK),
    'head': ParagraphStyle('head', fontName='Bold', fontSize=8.1, leading=11.3, textColor=colors.white),
    'title': ParagraphStyle('title', fontName='Bold', fontSize=36, leading=41, textColor=DARK, spaceAfter=16),
    'subtitle': ParagraphStyle('subtitle', fontName='Body', fontSize=15, leading=21, textColor=MUTED, spaceAfter=16),
    'mono': ParagraphStyle('mono', fontName='Courier', fontSize=7.7, leading=10.5, textColor=DARK, spaceAfter=7),
}

def clean(s):
    return str(s).replace('\u2011','-').replace('\u2013','-').replace('\u2014','-').replace('\u00a0',' ')

def para(s, style='body'):
    s = clean(s)
    s = escape(s)
    s = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', s)
    return Paragraph(s.replace('\n','<br/>'), STYLES[style])

def tab(headers, rows, widths=None):
    widths = [CW/len(headers)]*len(headers) if widths is None else [CW*x/sum(widths) for x in widths]
    t = Table([[para(x,'head') for x in headers]] + [[para(x,'cell') for x in row] for row in rows], colWidths=widths, repeatRows=1, hAlign='LEFT')
    t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0),DARK), ('VALIGN',(0,0),(-1,-1),'TOP'),
        ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,HexColor('#F5F8F6')]),
        ('LINEBELOW',(0,0),(-1,0),0.5,DARK), ('LINEBELOW',(0,1),(-1,-1),0.4,LINE),
        ('LEFTPADDING',(0,0),(-1,-1),8), ('RIGHTPADDING',(0,0),(-1,-1),8),
        ('TOPPADDING',(0,0),(-1,-1),7), ('BOTTOMPADDING',(0,0),(-1,-1),7),
    ]))
    t.spaceAfter=10
    return t

def note(text):
    t=Table([[para(text)]],colWidths=[CW]);t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,-1),PALE),('BOX',(0,0),(-1,-1),0.6,LINE),
        ('LEFTPADDING',(0,0),(-1,-1),12),('RIGHTPADDING',(0,0),(-1,-1),12),
        ('TOPPADDING',(0,0),(-1,-1),10),('BOTTOMPADDING',(0,0),(-1,-1),5),
    ]));t.spaceBefore=6;t.spaceAfter=10;return t

class Diagram(Flowable):
    def __init__(self, kind):
        Flowable.__init__(self);self.kind=kind;self.width=CW;self.height=300 if kind=='system' else 220
    def draw(self):
        c=self.canv
        def box(x,y,w,h,title,lines,color=PALE):
            c.setFillColor(color);c.setStrokeColor(LINE);c.roundRect(x,y,w,h,9,fill=1,stroke=1)
            c.setFillColor(DARK);c.setFont('Bold',10);c.drawCentredString(x+w/2,y+h-19,title)
            c.setFont('Body',8.5)
            for i,line in enumerate(lines):c.drawCentredString(x+w/2,y+h-35-i*12,line)
        def arrow(x1,y1,x2,y2,label=None):
            c.setStrokeColor(GREEN);c.setFillColor(GREEN);c.setLineWidth(1.5);c.line(x1,y1,x2,y2)
            import math
            a=math.atan2(y2-y1,x2-x1);p=c.beginPath();p.moveTo(x2,y2)
            p.lineTo(x2-7*math.cos(a-.4),y2-7*math.sin(a-.4));p.lineTo(x2-7*math.cos(a+.4),y2-7*math.sin(a+.4));p.close();c.drawPath(p,fill=1,stroke=0)
            if label:
                c.setFillColor(MUTED);c.setFont('Body',7.5);c.drawCentredString((x1+x2)/2,(y1+y2)/2+8,label)
        if self.kind=='system':
            box(0,213,140,77,'FIELD / OPTA',['0-10 V temperature','24 V binary inputs','Relays + LED state'])
            box(183,213,133,77,'EMQX',['MQTT authentication','Topic authorization','Rules + Publish API'])
            box(359,213,140,77,'SUPABASE',['HTTPS ingestion','PostgreSQL + Auth','RLS + Realtime'])
            arrow(140,249,183,249,'MQTTS')
            arrow(316,249,359,249,'HTTPS')
            box(0,38,140,90,'ANDROID',['Auth + REST / RPC','Realtime over WSS','FCM notifications','No direct broker session'])
            box(183,38,133,90,'ALARM WORKER',['State + durable queues','Minute scheduling','FCM / Gmail adapters'])
            box(359,38,140,90,'PROVIDERS',['FCM -> phone','Gmail -> mailbox','Provider result != receipt'])
            arrow(429,213,429,166,'Database events / RPC')
            c.setStrokeColor(GREEN);c.line(429,166,70,166);arrow(70,166,70,128)
            arrow(249,166,249,128)
            arrow(316,83,359,83,'HTTPS')
            c.setFillColor(MUTED);c.setFont('Body',8)
            c.drawString(0,9,'Command return path: Android -> Supabase -> EMQX HTTPS API -> Opta MQTT.')
        else:
            box(0,144,140,68,'DETECT',['Fresh samples / timer','Persistence + hysteresis'])
            box(180,144,140,68,'RECORD',['One active event','Recipients + queue'])
            box(360,144,139,68,'DISPATCH',['Lease + recheck','Provider send + audit'])
            arrow(140,178,180,178);arrow(320,178,360,178)
            box(0,24,229,77,'ACKNOWLEDGE',['Record user and time','Cancel queued routine reminders','Physical condition stays active'])
            box(269,24,230,77,'RECOVER',['Valid recovery condition + delay','Record resolution; retain history','Cancel queued deliveries'])
            arrow(249,144,249,117)
            c.setStrokeColor(GREEN);c.line(114,117,384,117);arrow(114,117,114,101);arrow(384,117,384,101)

class NumberedCanvas(canvas.Canvas):
    def __init__(self,*args,**kwargs):
        canvas.Canvas.__init__(self,*args,**kwargs);self.states=[]
    def showPage(self):
        self.states.append(dict(self.__dict__));self._startPage()
    def save(self):
        total=len(self.states)
        for state in self.states:
            self.__dict__.update(state)
            self.setFillColor(MUTED);self.setFont('Body',7.5)
            self.drawString(48,27,'ELMAJD AUTOMATION  |  Controlled working baseline v0.4')
            self.drawRightString(W-48,27,f'{self._pageNumber} / {total}')
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

def header(c,doc):
    if doc.page==1:return
    c.setStrokeColor(LINE);c.setLineWidth(.6);c.line(48,H-39,W-48,H-39)
    c.setFillColor(GREEN);c.setFont('Bold',8);c.drawString(48,H-28,'ELMAJD AUTOMATION')
    c.setFont('Body',8);c.setFillColor(MUTED);c.drawRightString(W-48,H-28,'System specification  |  01 November 2026')

data=json.loads(SOURCE.read_text(encoding='utf-8'))
story=[]
markdown=['# ElMAJD Automation - System Specification v0.4','', 'Issue: 2026-11-01. Controlled working baseline; operational acceptance pending.','']
for index,page in enumerate(data['pages']):
    if index:story.append(PageBreak())
    if index==0:
        story.append(Spacer(1,32))
        icon=ROOT/'app/src/main/assets/elmajd-icon.png'
        if icon.exists():story.append(Image(str(icon),width=82,height=82,hAlign='LEFT'))
        story.extend([Spacer(1,28),para('ElMAJD\nAutomation','title'),para('System specification book','subtitle'),Spacer(1,12)])
    else:
        story.append(para(f'{index:02d}  /  {page["eyebrow"].upper()}','small'))
        story.append(para(page['title'],'h1'))
    markdown.extend([f'## {page["title"]}',''])
    for block in page['blocks']:
        kind=block['type']
        if kind in ('p','h2','note','small'):
            story.append(note(block['text']) if kind=='note' else para(block['text'],{'p':'body','h2':'h2','small':'small'}[kind]))
            markdown.extend([('### ' if kind=='h2' else '')+block['text'],''])
        elif kind=='table':
            story.append(tab(block['headers'],block['rows'],block.get('widths')))
            markdown.append('| '+' | '.join(block['headers'])+' |')
            markdown.append('| '+' | '.join(['---']*len(block['headers']))+' |')
            markdown.extend('| '+' | '.join(row)+' |' for row in block['rows']);markdown.append('')
        elif kind=='bullets':
            for item in block['items']:story.append(para('- '+item))
            markdown.extend('- '+item for item in block['items']);markdown.append('')
        elif kind=='code':
            text=block['text'];story.append(note('Illustrative frame; not a live measurement.') if block.get('example') else Spacer(1,2))
            for line in text.splitlines():story.append(para(line.replace(' ','\u00a0'),'mono'))
            markdown.extend(['```json',text,'```',''])
        elif kind=='diagram':story.append(Diagram(block['kind']));markdown.extend(['[Vector diagram included in the PDF.]',''])
        elif kind=='links':
            for label,url in block['items']:
                story.append(Paragraph(f'<link href="{escape(url)}" color="#13745E"><b>{escape(label)}</b></link>',STYLES['small']))
                story.append(para(url,'small'));markdown.extend([f'- [{label}]({url})'])
            markdown.append('')
        else:raise ValueError(kind)
OUT.parent.mkdir(parents=True,exist_ok=True)
doc=SimpleDocTemplate(str(OUT),pagesize=A4,leftMargin=48,rightMargin=48,topMargin=60,bottomMargin=49,
    title='ElMAJD Automation - System Specification v0.4',author='ElMAJD Automation',
    subject='Reconciled pilot requirements, implementation and pending acceptance - 2026-11-01')
doc.build(story,onFirstPage=header,onLaterPages=header,canvasmaker=NumberedCanvas)
(HERE/'ElMAJD_Automation_System_Specification_v0.4.md').write_text('\n'.join(markdown),encoding='utf-8')
reader=PdfReader(OUT)
for i,page in enumerate(reader.pages):
    if not page.extract_text().strip():raise RuntimeError(f'Blank page {i+1}')
print(json.dumps({'output':str(OUT),'pages':len(reader.pages),'planned_pages':len(data['pages']),'bytes':OUT.stat().st_size}))
if len(reader.pages)!=len(data['pages']):raise RuntimeError('Unexpected page overflow; inspect and rebalance content')
