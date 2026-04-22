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
    "HIGH": colors.HexColor("#ef4444"),
    "MEDIUM": colors.HexColor("#f59e0b"),
    "LOW": colors.HexColor("#22c55e"),
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

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("Title", fontSize=22, fontName="Helvetica-Bold",
                                 textColor=colors.HexColor("#0f172a"), spaceAfter=4)
    h2_style = ParagraphStyle("H2", fontSize=14, fontName="Helvetica-Bold",
                               textColor=colors.HexColor("#1e40af"), spaceBefore=12, spaceAfter=6)
    body_style = ParagraphStyle("Body", fontSize=10, leading=14,
                                textColor=colors.HexColor("#374151"), spaceAfter=6)
    small_style = ParagraphStyle("Small", fontSize=9, textColor=colors.HexColor("#6b7280"))

    risk = analysis.get("overall_risk_level", "UNKNOWN")
    score = analysis.get("overall_fairness_score", 0)
    risk_color = RISK_COLORS.get(risk, colors.gray)

    story = []

    # Header
    story.append(Paragraph("🔍 FairLens", ParagraphStyle("Brand", fontSize=28,
                            fontName="Helvetica-Bold", textColor=colors.HexColor("#1e40af"))))
    story.append(Paragraph("AI Bias Audit Report", title_style))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#e2e8f0")))
    story.append(Spacer(1, 0.3*cm))

    # Meta info
    meta_data = [
        ["Audit Name:", audit.name],
        ["Organization:", user.organization or "—"],
        ["Dataset:", audit.dataset_name],
        ["Total Rows:", str(analysis.get("total_rows", 0))],
        ["Date:", datetime.utcnow().strftime("%B %d, %Y")],
    ]
    meta_table = Table(meta_data, colWidths=[4*cm, 12*cm])
    meta_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#374151")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 0.5*cm))

    # Risk verdict box
    verdict_table = Table([[f"Overall Risk: {risk}  |  Fairness Score: {score}/100"]],
                           colWidths=[17*cm])
    verdict_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), risk_color),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.white),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 14),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("ROUNDEDCORNERS", [8, 8, 8, 8]),
    ]))
    story.append(verdict_table)
    story.append(Spacer(1, 0.5*cm))

    # Executive summary
    if summary:
        story.append(Paragraph("Executive Summary", h2_style))
        story.append(Paragraph(summary, body_style))
        story.append(Spacer(1, 0.3*cm))

    # AI Explanation
    story.append(Paragraph("AI Analysis (Powered by Google Gemini)", h2_style))
    if explanation:
        for para in explanation.split("\n\n"):
            if para.strip():
                story.append(Paragraph(para.strip(), body_style))
    story.append(Spacer(1, 0.3*cm))

    # Metrics per attribute
    story.append(Paragraph("Bias Metrics by Attribute", h2_style))
    for attr in analysis.get("attribute_results", []):
        if "error" in attr:
            continue
        attr_risk_color = RISK_COLORS.get(attr.get("risk_level", ""), colors.gray)
        story.append(Paragraph(f"📊 {attr['sensitive_column'].upper()}", ParagraphStyle(
            "AttrHeader", fontSize=11, fontName="Helvetica-Bold",
            textColor=colors.HexColor("#1e40af"), spaceBefore=8, spaceAfter=4)))

        metrics_data = [
            ["Metric", "Value", "Threshold", "Status"],
            ["Demographic Parity Diff.", f"{attr.get('demographic_parity_difference', 0):.4f}", "< 0.10", "✓" if abs(attr.get('demographic_parity_difference', 1)) < 0.10 else "✗"],
            ["Equalized Odds Diff.", f"{attr.get('equalized_odds_difference', 0):.4f}", "< 0.10", "✓" if abs(attr.get('equalized_odds_difference', 1)) < 0.10 else "✗"],
            ["Disparate Impact Ratio", f"{attr.get('disparate_impact_ratio', 0):.4f}", "> 0.80", "✓" if attr.get('disparate_impact_ratio', 0) > 0.80 else "✗"],
            ["Fairness Score", f"{attr.get('fairness_score', 0)}/100", "> 75", "✓" if attr.get('fairness_score', 0) > 75 else "✗"],
        ]
        t = Table(metrics_data, colWidths=[6*cm, 4*cm, 4*cm, 3*cm])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e40af")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#f8fafc")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0f9ff")]),
            ("ALIGN", (1, 0), (-1, -1), "CENTER"),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(t)
        story.append(Spacer(1, 0.3*cm))

    # Fix suggestions
    if fixes:
        story.append(Paragraph("Recommended Fixes", h2_style))
        for i, fix in enumerate(fixes, 1):
            fix_color = RISK_COLORS.get(fix.get("priority", ""), colors.gray)
            story.append(Paragraph(
                f"{i}. {fix.get('title', '')} [{fix.get('priority', '')} priority]",
                ParagraphStyle("FixTitle", fontSize=10, fontName="Helvetica-Bold",
                               textColor=fix_color, spaceBefore=6, spaceAfter=2)
            ))
            story.append(Paragraph(fix.get("description", ""), body_style))
            story.append(Paragraph(
                f"Expected Impact: {fix.get('expected_impact', '')}  |  Effort: {fix.get('effort', '')}",
                small_style
            ))

    # Footer
    story.append(Spacer(1, 1*cm))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e2e8f0")))
    story.append(Paragraph(
        "Generated by FairLens — AI Bias Auditing Platform | fairlens.app",
        ParagraphStyle("Footer", fontSize=8, textColor=colors.HexColor("#94a3b8"),
                       alignment=TA_CENTER, spaceBefore=8)
    ))

    doc.build(story)
    return buffer.getvalue()
