import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from models.database import get_db, Audit, User
from routers.auth import get_current_user
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer,
    Table, TableStyle, HRFlowable
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT
import io
from datetime import datetime

router = APIRouter()

RISK_COLORS = {
    "HIGH":   colors.HexColor("#ef4444"),
    "MEDIUM": colors.HexColor("#f59e0b"),
    "LOW":    colors.HexColor("#22c55e"),
}


@router.get("/{audit_id}/pdf")
def download_pdf_report(
    audit_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    audit = db.query(Audit).filter(
        Audit.id == audit_id, Audit.user_id == current_user.id
    ).first()
    if not audit or not audit.result:
        raise HTTPException(status_code=404, detail="Audit not found")

    result = audit.result
    analysis = json.loads(result.raw_analysis)
    fixes = json.loads(result.fix_suggestions) if result.fix_suggestions else []

    pdf_bytes = _build_pdf(audit, analysis, result.gemini_explanation, result.report_summary, fixes, current_user)

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="fairlens_report_{audit_id}.pdf"'}
    )


def _build_pdf(audit, analysis, explanation, summary, fixes, user) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
                            leftMargin=2*cm, rightMargin=2*cm,
                            topMargin=2*cm, bottomMargin=2*cm)

    # ── Styles ─────────────────────────────────────────────────────────────────
    brand_style = ParagraphStyle("Brand", fontSize=20, fontName="Helvetica-Bold",
                                 textColor=colors.HexColor("#1e40af"))
    h2_style = ParagraphStyle("H2", fontSize=13, fontName="Helvetica-Bold",
                               textColor=colors.HexColor("#1e40af"), spaceBefore=14, spaceAfter=6)
    body_style = ParagraphStyle("Body", fontSize=10, leading=15,
                                textColor=colors.HexColor("#374151"), spaceAfter=6)
    small_style = ParagraphStyle("Small", fontSize=9,
                                 textColor=colors.HexColor("#6b7280"), spaceAfter=3)

    risk = analysis.get("overall_risk_level", "UNKNOWN")
    score = analysis.get("overall_fairness_score", 0)
    risk_color = RISK_COLORS.get(risk, colors.gray)

    story = []

    # ── Header: brand left, title right (NO emoji — causes rendering issues) ──
    header_table = Table(
        [[
            Paragraph("FairLens", brand_style),
            Paragraph("AI Bias Audit Report", ParagraphStyle(
                "ReportTitle", fontSize=18, fontName="Helvetica-Bold",
                textColor=colors.HexColor("#0f172a"), alignment=2))
        ]],
        colWidths=[9*cm, 8*cm]
    )
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(header_table)
    story.append(Paragraph(
        "Making AI Fair for Everyone  ·  Powered by Google Gemini",
        ParagraphStyle("tagline", fontSize=8,
                       textColor=colors.HexColor("#94a3b8"), spaceAfter=6)
    ))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#1e40af")))
    story.append(Spacer(1, 0.4*cm))

    # ── Meta Info ──────────────────────────────────────────────────────────────
    meta_data = [
        ["Audit Name:",   audit.name],
        ["Organization:", user.organization or "—"],
        ["Dataset:",      audit.dataset_name],
        ["Total Rows:",   str(analysis.get("total_rows", 0))],
        ["Date:",         datetime.utcnow().strftime("%B %d, %Y")],
    ]
    meta_table = Table(meta_data, colWidths=[4*cm, 13*cm])
    meta_table.setStyle(TableStyle([
        ("FONTNAME",      (0, 0), (0, -1),  "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, -1), 10),
        ("TEXTCOLOR",     (0, 0), (0, -1),  colors.HexColor("#374151")),
        ("TEXTCOLOR",     (1, 0), (1, -1),  colors.HexColor("#1e293b")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING",    (0, 0), (-1, -1), 3),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 0.5*cm))

    # ── Risk Banner ────────────────────────────────────────────────────────────
    verdict_table = Table(
        [[f"Overall Risk: {risk}   |   Fairness Score: {score}/100"]],
        colWidths=[17*cm]
    )
    verdict_table.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), risk_color),
        ("TEXTCOLOR",     (0, 0), (-1, -1), colors.white),
        ("FONTNAME",      (0, 0), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, -1), 14),
        ("ALIGN",         (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING",    (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
    ]))
    story.append(verdict_table)
    story.append(Spacer(1, 0.5*cm))

    # ── Compliance Status ──────────────────────────────────────────────────────
    attrs = analysis.get("attribute_results", [])
    valid_attrs = [a for a in attrs if "error" not in a]
    if valid_attrs:
        avg_dpd  = sum(abs(a.get("demographic_parity_difference", 0)) for a in valid_attrs) / len(valid_attrs)
        avg_dir  = sum(a.get("disparate_impact_ratio", 1) for a in valid_attrs) / len(valid_attrs)
        eu_pass  = avg_dpd < 0.1 and avg_dir > 0.8
        eeoc_pass = avg_dir >= 0.80

        story.append(Paragraph("Regulatory Compliance Status", h2_style))
        comp_data = [
            ["Framework",     "Requirement",               "Result",                        "Status"],
            ["EU AI Act",     "DPD < 0.1  &  DIR > 0.8",  f"DPD={avg_dpd:.3f}, DIR={avg_dir:.3f}", "PASS" if eu_pass  else "FAIL"],
            ["EEOC 4/5 Rule", "DIR >= 0.80 (80% rule)",   f"DIR={avg_dir:.3f}",                     "PASS" if eeoc_pass else "FAIL"],
            ["ISO 42001",     "Bias risk assessment done", "Audit documented",                       "PASS"],
        ]
        comp_table = Table(comp_data, colWidths=[4*cm, 5.5*cm, 5*cm, 2.5*cm])
        style_cmds = [
            ("BACKGROUND",    (0, 0), (-1, 0),  colors.HexColor("#1e40af")),
            ("TEXTCOLOR",     (0, 0), (-1, 0),  colors.white),
            ("FONTNAME",      (0, 0), (-1, 0),  "Helvetica-Bold"),
            ("FONTSIZE",      (0, 0), (-1, -1), 9),
            ("GRID",          (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("ROWBACKGROUNDS",(0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ("ALIGN",         (3, 0), (3, -1),  "CENTER"),
            ("FONTNAME",      (3, 1), (3, -1),  "Helvetica-Bold"),
            ("TEXTCOLOR",     (3, 1), (3, 1),   colors.HexColor("#16a34a") if eu_pass   else colors.HexColor("#dc2626")),
            ("TEXTCOLOR",     (3, 2), (3, 2),   colors.HexColor("#16a34a") if eeoc_pass else colors.HexColor("#dc2626")),
            ("TEXTCOLOR",     (3, 3), (3, 3),   colors.HexColor("#16a34a")),
            ("TOPPADDING",    (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]
        comp_table.setStyle(TableStyle(style_cmds))
        story.append(comp_table)
        story.append(Spacer(1, 0.4*cm))

    # ── Executive Summary ──────────────────────────────────────────────────────
    if summary:
        story.append(Paragraph("Executive Summary", h2_style))
        story.append(Paragraph(summary, body_style))
        story.append(Spacer(1, 0.3*cm))

    # ── AI Explanation ─────────────────────────────────────────────────────────
    story.append(Paragraph("AI Analysis — Powered by Google Gemini", h2_style))
    if explanation:
        for para in explanation.split("\n\n"):
            if para.strip():
                story.append(Paragraph(para.strip(), body_style))
    story.append(Spacer(1, 0.3*cm))

    # ── Bias Metrics Per Attribute ─────────────────────────────────────────────
    story.append(Paragraph("Bias Metrics by Attribute", h2_style))
    for attr in analysis.get("attribute_results", []):
        if "error" in attr:
            story.append(Paragraph(
                f"{attr['sensitive_column'].upper()} — Error: {attr['error']}",
                ParagraphStyle("ErrAttr", fontSize=10,
                               textColor=colors.HexColor("#ef4444"), spaceBefore=6)
            ))
            continue

        story.append(Paragraph(attr["sensitive_column"].upper(), ParagraphStyle(
            "AttrHeader", fontSize=11, fontName="Helvetica-Bold",
            textColor=colors.HexColor("#1e40af"), spaceBefore=10, spaceAfter=4)))

        metrics_data = [
            ["Metric",                   "Value",                                            "Threshold", "Status"],
            ["Demographic Parity Diff.", f"{attr.get('demographic_parity_difference',0):.4f}", "< 0.10",  "PASS" if abs(attr.get('demographic_parity_difference', 1)) < 0.10 else "FAIL"],
            ["Equalized Odds Diff.",     f"{attr.get('equalized_odds_difference',0):.4f}",     "< 0.10",  "PASS" if abs(attr.get('equalized_odds_difference', 1))    < 0.10 else "FAIL"],
            ["Disparate Impact Ratio",   f"{attr.get('disparate_impact_ratio',0):.4f}",        "> 0.80",  "PASS" if attr.get('disparate_impact_ratio', 0)             > 0.80 else "FAIL"],
            ["Fairness Score",           f"{attr.get('fairness_score',0)}/100",                "> 75",    "PASS" if attr.get('fairness_score', 0)                      > 75   else "FAIL"],
        ]
        pass_rows = [i for i, row in enumerate(metrics_data[1:], 1) if row[3] == "PASS"]
        fail_rows = [i for i, row in enumerate(metrics_data[1:], 1) if row[3] == "FAIL"]
        t_cmds = [
            ("BACKGROUND",    (0, 0), (-1, 0),  colors.HexColor("#1e40af")),
            ("TEXTCOLOR",     (0, 0), (-1, 0),  colors.white),
            ("FONTNAME",      (0, 0), (-1, 0),  "Helvetica-Bold"),
            ("FONTSIZE",      (0, 0), (-1, -1), 9),
            ("GRID",          (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("ROWBACKGROUNDS",(0, 1), (-1, -1), [colors.white, colors.HexColor("#f0f9ff")]),
            ("ALIGN",         (1, 0), (-1, -1), "CENTER"),
            ("TOPPADDING",    (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("FONTNAME",      (3, 1), (3, -1),  "Helvetica-Bold"),
        ]
        for r in pass_rows:
            t_cmds.append(("TEXTCOLOR", (3, r), (3, r), colors.HexColor("#16a34a")))
        for r in fail_rows:
            t_cmds.append(("TEXTCOLOR", (3, r), (3, r), colors.HexColor("#dc2626")))

        t = Table(metrics_data, colWidths=[6*cm, 4*cm, 4*cm, 3*cm])
        t.setStyle(TableStyle(t_cmds))
        story.append(t)

        # Group breakdown table
        if attr.get("group_statistics"):
            story.append(Spacer(1, 0.2*cm))
            story.append(Paragraph("Group Breakdown:", small_style))
            grp_rows = [["Group", "Count", "Positive Rate", "Accuracy"]]
            for grp, stats in attr["group_statistics"].items():
                grp_rows.append([
                    str(grp),
                    str(stats.get("count", 0)),
                    f"{stats.get('positive_rate', 0):.1f}%",
                    f"{stats.get('accuracy', 0):.1f}%",
                ])
            grp_t = Table(grp_rows, colWidths=[5*cm, 3*cm, 4.5*cm, 4.5*cm])
            grp_t.setStyle(TableStyle([
                ("BACKGROUND",    (0, 0), (-1, 0),  colors.HexColor("#475569")),
                ("TEXTCOLOR",     (0, 0), (-1, 0),  colors.white),
                ("FONTNAME",      (0, 0), (-1, 0),  "Helvetica-Bold"),
                ("FONTSIZE",      (0, 0), (-1, -1), 8),
                ("GRID",          (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("ROWBACKGROUNDS",(0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
                ("ALIGN",         (1, 0), (-1, -1), "CENTER"),
                ("TOPPADDING",    (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]))
            story.append(grp_t)
        story.append(Spacer(1, 0.4*cm))

    # ── Fix Suggestions ────────────────────────────────────────────────────────
    if fixes:
        story.append(Paragraph("Recommended Fixes", h2_style))
        for i, fix in enumerate(fixes, 1):
            fix_color = RISK_COLORS.get(fix.get("priority", ""), colors.gray)
            story.append(Paragraph(
                f"{i}. {fix.get('title', '')}  [{fix.get('priority', '')} PRIORITY]",
                ParagraphStyle("FixTitle", fontSize=10, fontName="Helvetica-Bold",
                               textColor=fix_color, spaceBefore=8, spaceAfter=3)
            ))
            story.append(Paragraph(fix.get("description", ""), body_style))
            story.append(Paragraph(
                f"Expected Impact: {fix.get('expected_impact', '')}   |   Effort: {fix.get('effort', '')}",
                small_style
            ))

    # ── Footer ─────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 1*cm))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e2e8f0")))
    story.append(Paragraph(
        "Generated by FairLens  |  AI Bias Auditing Platform  |  Google Solution Challenge 2026",
        ParagraphStyle("Footer", fontSize=8, textColor=colors.HexColor("#94a3b8"),
                       alignment=TA_CENTER, spaceBefore=8)
    ))

    doc.build(story)
    return buffer.getvalue()
