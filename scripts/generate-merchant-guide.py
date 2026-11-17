#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Generate docs/MERCHANT-SETUP-v1.7.2.docx - the official Microsoft Word version of the
Bengali merchant setup guide (always-free rails, built-in free persistent Postgres).
Run:  python scripts/generate-merchant-guide.py
Requires: pip install python-docx
"""
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

ACCENT      = RGBColor(0x0B, 0x3B, 0x36)      # deep teal — headings
ACCENT_SOFT = RGBColor(0x0F, 0x76, 0x6E)      # teal green
GREY        = RGBColor(0x55, 0x5B, 0x6E)

def set_cell_bg(cell, hex_fill):
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear'); shd.set(qn('w:color'), 'auto'); shd.set(qn('w:fill'), hex_fill)
    tcPr = cell._tc.get_or_add_tcPr()
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    mar = OxmlElement('w:tcMar')
    for tag, val in (('top', top), ('bottom', bottom), ('start', left), ('end', right)):
        el = OxmlElement(f'w:{tag}')
        el.set(qn('w:w'), str(val)); el.set(qn('w:type'), 'dxa')
        mar.append(el)
    tcPr.append(mar)

def set_col_widths(table, widths_cm):
    table.autofit = False
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    for row in table.rows:
        for i, cell in enumerate(row.cells):
            cell.width = Cm(widths_cm[i])
    grid = table._tbl.find(qn('w:tblGrid'))
    if grid is not None:
        for i, gc in enumerate(grid.findall(qn('w:gridCol'))):
            gc.set(qn('w:w'), str(int(Cm(widths_cm[i]).twips)))
    tblPr = table._tbl.find(qn('w:tblPr'))
    layout = OxmlElement('w:tblLayout'); layout.set(qn('w:val'), 'fixed')
    tblPr.append(layout)

def set_repeat_table_header(row):
    trPr = row._tr.get_or_add_trPr()
    trPr.append(OxmlElement('w:tblHeader'))

def set_row_cant_split(row):
    trPr = row._tr.get_or_add_trPr()
    trPr.append(OxmlElement('w:cantSplit'))

def add_field_run(paragraph, fieldcode):
    r1 = paragraph.add_run(); f1 = OxmlElement('w:fldChar'); f1.set(qn('w:fldCharType'), 'begin'); r1._element.append(f1)
    r2 = paragraph.add_run(); it = OxmlElement('w:instrText'); it.set(qn('xml:space'), 'preserve'); it.text = fieldcode; r2._element.append(it)
    r3 = paragraph.add_run(); f3 = OxmlElement('w:fldChar'); f3.set(qn('w:fldCharType'), 'end'); r3._element.append(f3)

doc = Document()
for section in doc.sections:
    section.page_width, section.page_height = Cm(21.0), Cm(29.7)
    section.top_margin, section.bottom_margin = Cm(1.9), Cm(1.9)
    section.left_margin, section.right_margin = Cm(2.1), Cm(2.1)
    section.header_distance = section.footer_distance = Cm(1.0)

styles = doc.styles
normal = styles['Normal']
normal.font.name = 'Nirmala UI'
normal.font.size = Pt(10.5)
normal.font.color.rgb = RGBColor(0x1F, 0x24, 0x33)
normal.paragraph_format.space_before = Pt(2)
normal.paragraph_format.space_after = Pt(5)
normal.paragraph_format.line_spacing = 1.12
normal.paragraph_format.widow_control = True

def style_heading(name, size, color, before, after, keep_with_next=True):
    s = styles[name]
    s.font.name = 'Nirmala UI'
    s.font.size = Pt(size); s.font.bold = True; s.font.color.rgb = color
    s.paragraph_format.space_before = Pt(before); s.paragraph_format.space_after = Pt(after)
    s.paragraph_format.keep_with_next = keep_with_next
    s.paragraph_format.keep_together = True

style_heading('Title', 34, ACCENT, 6, 10)
style_heading('Heading 1', 19, ACCENT, 13, 6)
style_heading('Heading 2', 13, ACCENT_SOFT, 8, 3)
style_heading('Heading 3', 11, ACCENT, 6, 2)

# Header/footer
section = doc.sections[0]
hp = section.header.paragraphs[0]; hp.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = hp.add_run('⚡ FREE Payment Gateways  ·  মার্চেন্ট সেটআপ গাইড')
r.font.name = 'Nirmala UI'; r.font.size = Pt(8.5); r.font.bold = True; r.font.color.rgb = ACCENT_SOFT
fp = section.footer.paragraphs[0]; fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
r1 = fp.add_run('Copyright (c) 2026 iamtanzir and contributors · AGPL-3.0 License · পৃষ্ঠা ')
r1.font.name = 'Nirmala UI'; r1.font.size = Pt(8); r1.font.color.rgb = GREY
add_field_run(fp, 'PAGE')
r2 = fp.add_run(' এর '); r2.font.name = 'Nirmala UI'; r2.font.size = Pt(8); r2.font.color.rgb = GREY
add_field_run(fp, 'NUMPAGES')
for rr in fp.runs:
    rr.font.name = 'Nirmala UI'; rr.font.size = Pt(8); rr.font.color.rgb = GREY

def h1(t): doc.add_heading(t, level=1)
def h2(t): doc.add_heading(t, level=2)
def h3(t): doc.add_heading(t, level=3)

def para(text, bold_prefix=None, size=None, color=None, align=None, space_after=None):
    p = doc.add_paragraph()
    if bold_prefix:
        rb = p.add_run(bold_prefix); rb.bold = True
    p.add_run(text)
    if size:
        for rr in p.runs: rr.font.size = Pt(size)
    if color:
        for rr in p.runs: rr.font.color.rgb = color
    if align is not None: p.alignment = align
    if space_after is not None: p.paragraph_format.space_after = Pt(space_after)
    return p

def bullets(items):
    for item in items:
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Cm(0.45); p.paragraph_format.space_after = Pt(2)
        p.add_run('▸  ').font.color.rgb = ACCENT_SOFT
        if isinstance(item, tuple):
            rb = p.add_run(item[0]); rb.bold = True; rb.font.color.rgb = ACCENT
            p.add_run(item[1])
        else:
            p.add_run(item)

def table(headers, rows, col_widths):
    t = doc.add_table(rows=len(rows) + 1, cols=len(headers))
    hdr = t.rows[0]
    for i, htext in enumerate(headers):
        cell = hdr.cells[i]
        set_cell_bg(cell, '10B981'); set_cell_margins(cell)
        cp = cell.paragraphs[0]; cp.paragraph_format.space_after = Pt(0)
        rr = cp.add_run(htext); rr.bold = True
        rr.font.color.rgb = RGBColor.from_string('FFFFFF'); rr.font.size = Pt(9.5)
    set_repeat_table_header(hdr); set_row_cant_split(hdr)
    for ridx, row in enumerate(rows):
        trow = t.rows[ridx + 1]; set_row_cant_split(trow)
        for i, cell_text in enumerate(row):
            cell = trow.cells[i]; set_cell_margins(cell)
            if ridx % 2 == 1: set_cell_bg(cell, 'F4FAF7')
            cp = cell.paragraphs[0]; cp.paragraph_format.space_after = Pt(0)
            rr = cp.add_run(str(cell_text)); rr.font.size = Pt(9)
    set_col_widths(t, col_widths)
    p = doc.add_paragraph(); p.paragraph_format.space_after = Pt(2); p.paragraph_format.space_before = Pt(0)
    return t

def callout(text, fill='D7F5E8', bold_lead=None, fill_hex=None):
    t = doc.add_table(rows=1, cols=1)
    cell = t.rows[0].cells[0]
    set_cell_bg(cell, fill_hex or fill); set_cell_margins(cell, top=140, bottom=140, left=180, right=180)
    set_col_widths(t, [16.7])
    p = cell.paragraphs[0]; p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.keep_with_next = True
    p.paragraph_format.keep_together = True
    if bold_lead:
        rb = p.add_run(bold_lead + '  '); rb.bold = True; rb.font.color.rgb = ACCENT
    p.add_run(text)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)

def code_block(text):
    t = doc.add_table(rows=1, cols=1)
    cell = t.rows[0].cells[0]
    set_cell_bg(cell, 'F1F5F9'); set_cell_margins(cell, top=120, bottom=120, left=180, right=180)
    set_col_widths(t, [16.7])
    p = cell.paragraphs[0]; p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.keep_with_next = True
    p.paragraph_format.keep_together = True
    rr = p.add_run(text); rr.font.name = 'Consolas'; rr.font.size = Pt(8.5)
    rr.font.color.rgb = RGBColor(0x0F, 0x17, 0x33)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)
    return t

def checklist(items):
    for item in items:
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Cm(0.45); p.paragraph_format.space_after = Pt(3)
        p.add_run('☐  ').font.color.rgb = ACCENT_SOFT
        p.add_run(item)

def spacer(pts=4):
    p = doc.add_paragraph(); p.paragraph_format.space_after = Pt(pts)

# ── COVER PAGE ───────────────────────────────────────────────────────
spacer(8)
p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.space_after = Pt(2)
r = p.add_run('⚡'); r.font.size = Pt(58)
p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.space_after = Pt(0)
r = p.add_run('FREE Payment Gateways'); r.font.size = Pt(15); r.font.bold = True; r.font.color.rgb = ACCENT_SOFT
p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.space_after = Pt(24)
r = p.add_run('নিজের সার্ভারে ফ্রি Payment Gateway'); r.font.color.rgb = GREY; r.font.size = Pt(11)
p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.space_after = Pt(0)
r = p.add_run('মার্চেন্ট সেটআপ গাইড'); r.bold = True; r.font.size = Pt(30); r.font.color.rgb = ACCENT; r.font.name = 'Nirmala UI'
p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.space_after = Pt(2)
r = p.add_run('৳০-তে নিজের bKash / Nagad / Bangla QR-এ পেমেন্ট নিন')
r.font.size = Pt(12.5); r.font.color.rgb = ACCENT_SOFT; r.bold = True
p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run('প্রমাণিত v1.7.2 — Built-in Free Persistent Postgres'); r.font.color.rgb = GREY; r.font.size = Pt(10.5)
spacer(8)
table(['Version', 'License', 'Date'], [['v1.7.2', 'AGPL-3.0', '১৭ নভেম্বর ২০২৬']], [5.6, 5.6, 5.5])
spacer(4)
p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.space_after = Pt(0)
r = p.add_run('Code:  github.com/iamtanzir/FREE-Payment-Gateways'); r.font.size = Pt(10.5); r.bold = True; r.font.color.rgb = ACCENT_SOFT
spacer(18)

# ── সূচিপত্র ─────────────────────────────────────────────────────────
h1('সূচিপত্র')
for line in [
    ('এক চোখে', ' — কী জিনিস, কার জন্য, কত খরচ'),
    ('ধাপ ১', ' — Render-এ ফ্রি account খুলুন'),
    ('ধাপ ২', ' — এক ক্লিকে Gateway deploy (৫ মিনিট)'),
    ('ধাপ ২.৫', ' — 🗄️ স্থায়ী ডেটাবেস (v1.2.0+, ফ্রি Postgres) ⭐'),
    ('ধাপ ৩', ' — প্রথম login ও password'),
    ('ধাপ ৪', ' — টাকা নেওয়ার মাধ্যম সেট করুন'),
    ('ধাপ ৫', ' — নিজে পরীক্ষা (Demo)'),
    ('ধাপ ৬', ' — WordPress/WooCommerce-এ যোগ করুন'),
    ('ধাপ ৭', ' — Go-Live Checklist'),
    ('FAQ', ' — সমস্যা ও সমাধান'),
    ('শেষকথা', ' — কিভাবে system কাজ করে · সহায়তা'),
]:
    p = doc.add_paragraph(); p.paragraph_format.space_after = Pt(3)
    rb = p.add_run(line[0] + ' '); rb.bold = True; rb.font.color.rgb = ACCENT
    p.add_run(line[1])


# ═════════════════════════════════════════════════════════════════════
h1('এক চোখে — কী এটা, কার জন্য?')
table(['প্রশ্ন', 'উত্তর'], [
    ['এটা কী?', 'আপনার নিজস্ব সম্পূর্ণ payment gateway — ডেটা আপনার, টাকা সরাসরি আপনার wallet/ব্যাংকে যায়।'],
    ['কত টাকা লাগবে?', '৳০ — মাসিক/সেটআপ ফি নেই; এমনকি hosting-ও ফ্রি (Render free plan)।'],
    ['কাকে টাকা দিব?', 'কাউকে না — গ্রাহকরা সরাসরি আপনার bKash / Nagad / ব্যাংক-এ টাকা দিবে।'],
    ['আমাকে কী করতে হবে?', 'Render-এ ৫ মিনিটের এক ক্লিক deploy + Settings-এ আপনার নম্বর/QR দিন — হয়ে গেল।'],
    ['আমার site আছে?', 'WordPress/WooCommerce হলে প্লাগইন দিয়ে ৫ মিনিট; নাহলে payment link বানাবেন (developer লাগে)।'],
    ['Developer লাগবে?', 'না — গাইডটা হেল্প-ফ্রিভাবে লেখা। চাইলে যেকোনো developer-কে এই ফাইলটা দিন।'],
    ['ডেটা স্থায়ী থাকবে?', 'হ্যাঁ — v1.2.0 থেকে ফ্রি স্থায়ী Postgres built-in (Neon / CockroachDB — CockroachDB 10 GB free)। Render Free restart-এ ডেটা মুছে যাওয়ার সমস্যা পুরোপুরি সমাধান।'],
], [4.6, 12.1])
callout('ইন্টারনেট + একটা email + যেকোনো phone/computer + আপনার bKash / Nagad / Bank নম্বর বা Bangla QR।', bold_lead='লাগবে:')

# ═════════════════════════════════════════════════════════════════════
h1('ধাপ ১ — Render-এ ফ্রি অ্যাকাউন্ট খুলুন (২ মিনিট)')
bullets([
    ('১. ', 'ব্রাউজারে যান: render.com → Get Started / Sign up'),
    ('২. ', 'GitHub দিয়ে sign up করুন (GitHub-এও free account লাগবে: github.com → Sign up)'),
    ('৩. ', 'Render আপনাকে GitHub দিয়ে verify করতে চাইবে — Authorize দিন'),
])
callout('সব ফ্রি। কোনো credit card চাইবে না।', bold_lead='লক্ষ রাখুন:')

# ═════════════════════════════════════════════════════════════════════
h1('ধাপ ২ — এক ক্লিকে Gateway deploy (৫ মিনিট)')
bullets([
    ('১. ', 'Repo খুলুন: github.com/iamtanzir/FREE-Payment-Gateways'),
    ('২. ', 'README-র নিচে নীল “Deploy to Render” button — অথবা লিংক: https://render.com/deploy?repo=https://github.com/iamtanzir/FREE-Payment-Gateways'),
    ('৩. ', 'Render জিজ্ঞেস করবে — Free plan সিলেক্ট আছে কিনা দেখে নিন (লাগে শুধু account creation)'),
    ('৪. ', 'দুইটা জিনিস লিখতে বলবে:'),
])
bullets([
    ('BASE_URL', ' — যেমন https://free-mfs-bd.onrender.com (আপনার app-এর ঠিকানা; বদলাতে না চাইলে যেটাই দেখায় সেটাই রাখুন)'),
    ('ADMIN_PASSWORD', ' — নিজের মনে রাখার মতো strong password দিন (এই password /admin-এ ঢোকার কী; কেউ জানে না)'),
])
bullets([
    ('৫. ', 'Apply / Deploy চাপুন → ৩–৫ মিনিট অপেক্ষা → screen-এ “Live” লেখা দেখলে ✅'),
    ('৬. ', 'ব্রাউজারে লিখুন: https://<app-name>.onrender.com/health — {"ok":true,"version":"1.7.2"} দেখলে deploy সঠিক'),
])
callout('Step 2 যদি কঠিন লাগে: যেকোনো developer/nephew-কে এই ফাইলটা পাঠান — “পড়ো, ১০ মিনিটের কাজ”। সত্যই।', bold_lead='টিপ:')

# ═════════════════════════════════════════════════════════════════════
h1('ধাপ ২.৫ — 🗄️ স্থায়ী ডেটাবেস সেট করুন (v1.2.0+, সব ফ্রি) ⭐ গুরুত্বপূর্ণ')
para('Render Free প্রতি restart/redeploy-এ সব ডেটা মুছে ফেলে (ephemeral filesystem)। v1.2.0 থেকে আমাদের app-এ built-in PostgreSQL support আছে — একটা DATABASE_URL দিলেই ডেটা স্থায়ী হয়ে যাবে (deploy বা restart কখনো ডেটা তাকায় না)।')

h2('ফ্রি Postgres দুটি (সব ফ্রি, app-এ built-in):')
table(['Provider', 'ফ্রি storage', 'অঞ্চল'], [
    ['CockroachDB Serverless', '10 GB (সবচেয়ে বড়)', 'AWS Singapore — বাংলাদেশে দ্রুততম'],
    ['Neon', '0.5 GB', 'AWS Singapore — বাংলাদেশে দ্রুততম (v1.7.2-এ সরাসরি test করা)'],
], [4.2, 6.4, 6.1])

h2('Neon দিয়ে সেট করুন (৩ মিনিট)')
bullets([
    ('১. ', 'neon.tech → Sign in (GitHub দিয়ে) → New project'),
    ('২. ', 'Project Name: FREE MFS BD · Region: AWS Asia Pacific 1 (Singapore) · PostgreSQL 17 · Create project'),
    ('৩. ', 'Project তৈরির পরে Connect button চাপুন'),
    ('৪. ', 'Connection string কপি করুন — দেখতে হবে:'),
])
code_block('postgresql://fpg_app:<PASSWORD>@ep-<id>-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require')
bullets([
    ('৫. ', 'Render dashboard → service → Environment → Add variable: Key = DATABASE_URL · Value = ঐ connection string'),
    ('৬. ', 'Save → Manual Deploy → Deploy latest commit'),
    ('৭. ', '/health check করুন — {"ok":true,"version":"1.7.2"} পেলে সফল'),
])
callout('Neon-এর বদলে CockroachDB Serverless নিলে 10 GB পর্যন্ত ফ্রি data — একই পদ্ধতিতে Render-এ DATABASE_URL বসিয়ে redeploy।', bold_lead='Tip:', fill_hex='FFF7D6')

# ═════════════════════════════════════════════════════════════════════
h1('ধাপ ৩ — প্রথম login ও password')
bullets([
    ('১. ', 'যান: https://<app-name>.onrender.com/admin'),
    ('২. ', 'ADMIN_PASSWORD (ধাপ ২ বা Render dashboard-এ Set করা) দিয়ে sign in করুন'),
    ('৩. ', 'Settings-এ ঢুকে ইচ্ছামতো password পরিবর্তন করতে পারেন — মনে রাখবেন: Render Free-এ restart/redeploy-এ SQLite reset হয়; স্থায়ী password পরিবর্তন করতে Render → Environment → ADMIN_PASSWORD পরিবর্তন করে redeploy করুন, অথবা ধাপ ২.৫ অনুযায়ী DATABASE_URL সেট করুন'),
])
callout('Render কখনো আপনার password দেখায় না (masked) — কেবল আপনি জানেন। .env কখনো GitHub-এ commit করবেন না (আমাদের .gitignore তা রোধ করে)।', bold_lead='Security:')

# ═════════════════════════════════════════════════════════════════════
h1('ধাপ ৪ — টাকা নেওয়ার মাধ্যম সেট করুন (৫ মিনিট)')
para('Admin → Settings মেনুতে তিনটি উপায় — যেকোনোটা (বা দুটোই) সেট করুন:')
h2('৪.১  🇧🇩 Bangla QR — সবচেয়ে ফ্রি ও সরাসরি')
bullets([
    ('১. ', 'আপনার ব্যাংকের মোবাইল অ্যাপ (DBBL Nexus / Citytouch / EBL Skybanking) → Bangla QR অপশন → আপনার QR ডাউনলোড করুন (PNG/JPG)'),
    ('২. ', 'ছবি আপলোড: আপনার website থাকলে WordPress Media Library-তে, নাহলে imgbb.com-এ free upload'),
    ('৩. ', 'Admin → Settings → 🇧🇩 Bangla QR → URL পেস্ট → Save'),
    ('৪. ', 'Test: একটা order বানিয়ে QR scan → টাকা → TrxID → Approve'),
])
h2('৪.২  📱 bKash / Nagad / Rocket / ব্যাংক')
bullets([
    ('১. ', 'Settings → 📱 Manual payment receiving accounts'),
    ('২. ', 'আপনার bKash নম্বর (personal/merchant যেটায় নিবেন)'),
    ('৩. ', 'Nagad / Rocket নম্বর'),
    ('৪. ', 'Bank account বিবরণ (free text)'),
    ('৫. ', 'Save — customer-এর TrxID verify করে Approve করলেই order confirm'),
])

# ═════════════════════════════════════════════════════════════════════
h1('ধাপ ৫ — নিজে আগে পরীক্ষা করুন (৫ মিনিট)')
bullets([
    ('১. ', 'Settings → Demo provider tick আছে কিনা দেখে নিন (Default: enabled)'),
    ('২. ', 'একটা order বানিয়ে demo “Pay now (simulated)” বাটনে ক্লিক — পুরো flow দেখা যাবে, কোনো আসল টাকা নয়'),
    ('৩. ', 'তারপর আপনার নিজের ফোন থেকে এক টাকা bKash করে TrxID দিয়ে Order-এ Approve করুন — system লাইভ'),
])

# ═════════════════════════════════════════════════════════════════════
h1('ধাপ ৬ — আপনার site/app-এ যুক্ত করুন')
h2('৬A.  WordPress / WooCommerce (সবচেয়ে সহজ)')
bullets([
    ('১. ', 'Repo ডাউনলোড: github.com/iamtanzir/FREE-Payment-Gateways → wordpress/free-payment-gateways → আপনার site-এর wp-content/plugins/-এ কপি করুন'),
    ('২. ', 'WordPress → Plugins → Installed Plugins → FREE Payment Gateways → Activate'),
    ('৩. ', 'Settings → FPG Gateway: Gateway Base URL = https://<app-name>.onrender.com · API Key = Admin → API Keys → Create থেকে key → Save'),
    ('৪. ', 'WooCommerce → Settings → Payments ট্যাবে দুটি gateway — FPG Bangla QR & MFS (checkout-এ payment + TrxID) · FPG Self-Hosted Gateway (hosted checkout redirect)'),
    ('৫. ', 'একটা test order করে দেখুন — সব ঠিক'),
])
h2('৬B.  সাধারণ website/app (developer লাগে)')
para('Client API দিয়ে payment link বানায়, customer ঐ link খোলেন:')
code_block('curl -X POST https://<app-name>.onrender.com/api/v1/checkout \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"amount":500,"currency":"BDT","description":"Order #1",\n        "success_url":"https://yoursite.com/thanks"}\'')
para('যে link (checkout_url) আসবে সেটা customer-কে দিবেন (WhatsApp/SMS/Website)। Customer টাকা দিলে webhook (payment.paid) আপনার site-এ যায়। যেকোনো website বা app integrate-এ এটাই পথ।')

# ═════════════════════════════════════════════════════════════════════
h1('ধাপ ৭ — Go-Live Checklist (প্রিন্ট করে রাখুন)')
checklist([
    'https://<app>.onrender.com/health → {"ok":true,"version":"1.7.2"} দেয়',
    '/admin → login করে password পরিবর্তন করা হয়েছে',
    'DATABASE_URL সেট করা হয়েছে (v1.2.0+ — স্থায়ী ডেটা, ধাপ ২.৫)',
    'Bangla QR — টেস্ট করা (স্ক্যান → pay → TrxID → Approve)',
    'Manual bKash/Nagad — টেস্ট করা',
    'WooCommerce — test order approve হয়েছে',
    'প্রথম customer-কে একই payment link পাঠান — সব কাজ করে দেখে নিন',
])

# ═════════════════════════════════════════════════════════════════════
h1('সমস্যা হলে — FAQ')
table(['উপসর্গ', 'সমাধান'], [
    ['/health এ 504 error', 'Deploy-এ ⏳ — Render free service ঘুমিয়ে থাকে, ~৫০ সেকেন্ড পর আবার চেষ্টা করুন।'],
    ['Render-এ data হারাচ্ছে?', 'v1.2.0 থেকে DATABASE_URL দিয়ে ফ্রি Postgres (Neon / CockroachDB 10 GB) সেট করলে ডেটা স্থায়ী — ধাপ ২.৫।'],
    ['admin-এ login হচ্ছে না', 'Password ভুলে গেলে Render → Environment → ADMIN_PASSWORD দেখে/বদলে দিয়ে Manual Deploy করুন।'],
    ['Customer TrxID দিলে আসছে না', 'Order → “FPG MFS payment — verification needed” box → TrxID দেখে bank/app-এ Approve করুন।'],
    ['Bangla QR ছবি দেখা যাচ্ছে না', 'Settings-এ URL ঠিক আছে কিনা যাচাই করুন — খালি URL হলে QR দেখা যাবে না।'],
    ['bKash cash-out fee', 'এটা gateway-র ফি না — bKash-এর নিজস্ব ফি (guideline অনুযায়ী)।'],
    ['বুঝতে পারছি না', 'Nephew/developer-কে এই ফাইলটা দিন — “পড়ো, ১০ মিনিটের কাজ”।'],
], [5.6, 11.1])

# ═════════════════════════════════════════════════════════════════════
h1('শেষকথা — পুরো system কিভাবে কাজ করে')
table(['ধাপ', 'কী হয়'], [
    ['Customer', 'Website থেকে order → payment page → bKash/QR দিয়ে টাকা'],
    ['আপনি', '/admin → Invoices → customer-এর TrxID verify করে “Approve”'],
    ['System', 'আপনার site-এ webhook (payment.paid) যায় → order confirmed'],
], [3.2, 13.5])
para('সহায়তা কোথায় পাবেন:', size=10.5)
bullets([
    ('Technical developer', ' — repo/plumbing নিয়ে: github.com/iamtanzir/FREE-Payment-Gateways (Issues tab)'),
    ('Render/Node/Docker/nginx', ' — docs/DEPLOYMENT.md (বাংলা, A to Z)'),
    ('bangla QR / ব্যাংক policy', ' — আপনার ব্যাংক (Citytouch / DBBL / EBL / …)'),
    ('ম্যানুয়াল bKash/Nagad/Rocket/Bank', ' — আপনার নিজের ওয়ালেট/ব্যাংক (enrollment লাগে না)'),
])
h2('তথ্য এক জায়গায়')
bullets([
    ('Source code', ' — github.com/iamtanzir/FREE-Payment-Gateways'),
    ('Official docs', ' — repo-র README.md ও docs/DEPLOYMENT.md (বাংলা, A to Z)'),
    ('Support', ' — repo-র Issues tab'),
    ('License', ' — AGPL-3.0 (নিজের নামে ব্যবহার/পরিবর্তন করুন, এমনকি অন্যের জন্য হোস্ট করুন)'),
])
spacer(8)
p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run('⚡ FREE Payment Gateways — নিজের সার্ভারে, আপনার নিয়মে, ৳০-তেই')
r.bold = True; r.font.color.rgb = ACCENT_SOFT; r.font.size = Pt(11)
p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run('Built with ❤️ by Tanzir Ahmed — https://iamtanzir.github.io/')
r.bold = True; r.font.size = Pt(9.5); r.font.color.rgb = ACCENT_SOFT

out = 'docs/MERCHANT-SETUP-v1.7.2.docx'
doc.save(out)
print('Saved', out)
