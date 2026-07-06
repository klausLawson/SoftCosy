import os
import tempfile
from datetime import date

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable


# ── Palette SoftCosy ──────────────────────────────────────────────────────────
BLUE_DARK  = colors.HexColor('#1e293b')
BLUE_MED   = colors.HexColor('#3b5bdb')
BLUE_LIGHT = colors.HexColor('#e8ecff')
GREEN      = colors.HexColor('#2f9e44')
RED        = colors.HexColor('#c92a2a')
ORANGE     = colors.HexColor('#e67700')
GREY_LIGHT = colors.HexColor('#f8f9fa')
GREY_MED   = colors.HexColor('#dee2e6')


def _build_doc(filepath: str, title: str, subtitle: str, table_data: list, col_widths: list) -> str:
    """Construit un PDF générique à partir d'un tableau de données."""
    doc = SimpleDocTemplate(
        filepath,
        pagesize=A4,
        leftMargin=1.5 * cm,
        rightMargin=1.5 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Title'],
        fontSize=18,
        textColor=BLUE_DARK,
        spaceAfter=4,
        fontName='Helvetica-Bold',
    )
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#64748b'),
        spaceAfter=2,
        fontName='Helvetica',
    )
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#94a3b8'),
        fontName='Helvetica-Oblique',
    )

    today = date.today()
    week_num = today.isocalendar()[1]

    elements = [
        Paragraph('SoftCosy', ParagraphStyle('Brand', parent=styles['Normal'],
                  fontSize=11, textColor=BLUE_MED, fontName='Helvetica-Bold')),
        Spacer(1, 0.3 * cm),
        Paragraph(title, title_style),
        Paragraph(subtitle, subtitle_style),
        Paragraph(f"Généré le {today.strftime('%d/%m/%Y')} — Semaine {week_num}", footer_style),
        Spacer(1, 0.5 * cm),
        HRFlowable(width='100%', thickness=2, color=BLUE_MED, spaceAfter=0.4 * cm),
    ]

    if len(table_data) <= 1:
        elements.append(Paragraph('Aucune donnée enregistrée pour cette journée.', styles['Normal']))
    else:
        table = Table(table_data, colWidths=col_widths, repeatRows=1)
        table.setStyle(TableStyle([
            # En-tête
            ('BACKGROUND',    (0, 0), (-1, 0), BLUE_MED),
            ('TEXTCOLOR',     (0, 0), (-1, 0), colors.white),
            ('FONTNAME',      (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE',      (0, 0), (-1, 0), 8),
            ('TOPPADDING',    (0, 0), (-1, 0), 6),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
            ('ALIGN',         (0, 0), (-1, 0), 'CENTER'),
            # Corps
            ('FONTNAME',      (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE',      (0, 1), (-1, -1), 7.5),
            ('TOPPADDING',    (0, 1), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 4),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, GREY_LIGHT]),
            ('GRID',          (0, 0), (-1, -1), 0.4, GREY_MED),
            ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        elements.append(table)

    elements += [
        Spacer(1, 0.8 * cm),
        HRFlowable(width='100%', thickness=0.5, color=GREY_MED),
        Spacer(1, 0.2 * cm),
        Paragraph(
            f'Document archivé automatiquement par SoftCosy • {today.strftime("%d/%m/%Y")}',
            footer_style,
        ),
    ]

    doc.build(elements)
    return filepath


def generate_stock_pdf(movements, report_date: date) -> str:
    """
    Génère un PDF listant tous les mouvements de stock du jour.
    Retourne le chemin vers le fichier temporaire créé.
    """
    week_num = report_date.isocalendar()[1]
    filename = f"liste-stock-semaine-{week_num:02d}-{report_date.strftime('%Y-%m-%d')}.pdf"
    filepath = os.path.join(tempfile.gettempdir(), filename)

    headers = ['#', 'Produit', 'SKU / Variante', 'Type', 'Qté', 'Raison', 'Notes', 'Utilisateur']
    col_widths = [0.8*cm, 4.2*cm, 3*cm, 2.2*cm, 1.2*cm, 3.2*cm, 3.5*cm, 2.5*cm]

    table_data = [headers]
    total_entrees = 0
    total_sorties = 0

    for m in movements:
        mvt_type = m.movement_type
        qty = m.quantite

        if mvt_type == 'ENTREE':
            total_entrees += qty
            type_label = '+ ENTRÉE'
        elif mvt_type == 'SORTIE':
            total_sorties += qty
            type_label = '− SORTIE'
        else:
            type_label = '~ AJUST.'

        product_name = ''
        if m.product:
            product_name = m.product.name if hasattr(m.product, 'name') else str(m.product)
        elif m.stock and m.stock.variant:
            product_name = str(m.stock.variant)

        sku = ''
        if m.stock and m.stock.variant:
            sku = getattr(m.stock.variant, 'sku', '') or ''

        user_name = str(m.user) if m.user else '—'

        table_data.append([
            str(m.id),
            product_name[:40],
            sku[:22],
            type_label,
            str(qty),
            (m.reason or '—')[:30],
            (m.notes or '—')[:35],
            user_name[:20],
        ])

    # Ligne de totaux
    table_data.append([
        '', 'TOTAUX', '', '',
        f'+{total_entrees} / −{total_sorties}',
        '', '', '',
    ])

    subtitle = (
        f"Mouvements de stock du {report_date.strftime('%d/%m/%Y')} — "
        f"{len(movements)} mouvement(s) • +{total_entrees} entrées / −{total_sorties} sorties"
    )

    return _build_doc(filepath, 'Rapport Mouvements de Stock', subtitle, table_data, col_widths)


def generate_sales_pdf(sales, report_date: date) -> str:
    """
    Génère un PDF listant toutes les ventes du jour avec leurs lignes.
    Retourne le chemin vers le fichier temporaire créé.
    """
    week_num = report_date.isocalendar()[1]
    filename = f"liste-vente-semaine-{week_num:02d}-{report_date.strftime('%Y-%m-%d')}.pdf"
    filepath = os.path.join(tempfile.gettempdir(), filename)

    headers = ['#', 'Client', 'Canal', 'Produit(s)', 'Sous-total', 'Remise', 'Total', 'Statut']
    col_widths = [0.8*cm, 3.5*cm, 2*cm, 5*cm, 2.2*cm, 2*cm, 2*cm, 2*cm]

    table_data = [headers]
    grand_total = 0

    for sale in sales:
        lines = sale.lines.all() if hasattr(sale, 'lines') else []
        products_str = ', '.join(
            (l.product.name if l.product else '?') + f' ×{l.quantity}'
            for l in lines
        )[:60]

        client = sale.customer_name or (str(sale.customer) if sale.customer else '—')
        grand_total += float(sale.total or 0)

        table_data.append([
            f'#{sale.id}',
            client[:30],
            sale.channel,
            products_str or '—',
            f"{sale.subtotal:.0f}",
            f"{sale.discount_amount:.0f}",
            f"{sale.total:.0f}",
            sale.status,
        ])

    # Ligne de totaux
    table_data.append([
        '', f'{len(sales)} vente(s)', '', '', '', 'TOTAL', f'{grand_total:.0f}', '',
    ])

    subtitle = (
        f"Ventes du {report_date.strftime('%d/%m/%Y')} — "
        f"{len(sales)} vente(s) • Total journée : {grand_total:.2f}"
    )

    return _build_doc(filepath, 'Rapport des Ventes', subtitle, table_data, col_widths)
