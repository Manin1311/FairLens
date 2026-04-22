import pandas as pd
import numpy as np
from fairlearn.metrics import demographic_parity_difference, equalized_odds_difference
from sklearn.metrics import accuracy_score
from typing import List, Optional, Tuple
import io

# Keywords that indicate a column is a sensitive attribute
SENSITIVE_KEYWORDS = [
    'gender', 'sex', 'race', 'ethnicity', 'age', 'religion',
    'caste', 'nationality', 'disability', 'marital', 'color',
    'colour', 'origin', 'language', 'tribe', 'community'
]

# Keywords that indicate a column is the target/decision column
TARGET_KEYWORDS = [
    'outcome', 'decision', 'result', 'label', 'target',
    'approved', 'hired', 'status', 'class', 'output',
    'prediction', 'loan', 'admit', 'accept', 'granted', 'qualify'
]

# String values that represent a positive outcome
POSITIVE_VALUES = {
    'yes', '1', 'true', 'approved', 'hired', 'granted',
    'accepted', 'positive', 'pass', 'admit', 'success',
    'allow', '1.0', 'high', 'good'
}


def load_dataframe(content: bytes, filename: str) -> pd.DataFrame:
    """Load CSV or Excel file into DataFrame."""
    if filename.endswith('.csv'):
        df = pd.read_csv(io.BytesIO(content))
    elif filename.endswith(('.xlsx', '.xls')):
        df = pd.read_excel(io.BytesIO(content))
    else:
        raise ValueError("Unsupported file format. Please upload a CSV or Excel file.")
    return df


def detect_sensitive_columns(df: pd.DataFrame) -> List[str]:
    """Auto-detect columns that are likely sensitive attributes."""
    sensitive = []
    for col in df.columns:
        col_clean = col.lower().replace('_', ' ').replace('-', ' ')
        for keyword in SENSITIVE_KEYWORDS:
            if keyword in col_clean:
                sensitive.append(col)
                break
    return sensitive


def detect_target_column(df: pd.DataFrame) -> str:
    """Auto-detect the target/decision column."""
    for col in df.columns:
        col_clean = col.lower().replace('_', ' ').replace('-', ' ')
        for keyword in TARGET_KEYWORDS:
            if keyword in col_clean:
                return col
    return df.columns[-1]  # fallback: last column


def encode_binary(series: pd.Series) -> pd.Series:
    """Encode a series to binary 0/1 values."""
    series = series.dropna()

    # Already numeric
    if pd.api.types.is_numeric_dtype(series):
        unique_vals = series.unique()
        if set(unique_vals).issubset({0, 1, 0.0, 1.0}):
            return series.astype(int)
        return (series > series.median()).astype(int)

    # String: map positive keywords to 1
    str_series = series.astype(str).str.lower().str.strip()
    has_positive = str_series.isin(POSITIVE_VALUES).any()
    if has_positive:
        return str_series.isin(POSITIVE_VALUES).astype(int)

    # Binary string: first unique value = 1
    unique_vals = str_series.unique()
    if len(unique_vals) == 2:
        return (str_series == unique_vals[0]).astype(int)

    # Fallback: mode = 0, rest = 1
    mode_val = str_series.mode()[0]
    return (str_series != mode_val).astype(int)


def compute_attribute_metrics(
    df: pd.DataFrame,
    sensitive_col: str,
    target_col: str,
    prediction_col: Optional[str] = None
) -> dict:
    """Compute fairness metrics for one sensitive attribute."""
    try:
        working_df = df[[sensitive_col, target_col]].dropna()
        if prediction_col and prediction_col in df.columns:
            working_df = df[[sensitive_col, target_col, prediction_col]].dropna()

        y_true = encode_binary(working_df[target_col])
        y_pred = encode_binary(working_df[prediction_col]) if (
            prediction_col and prediction_col in working_df.columns
        ) else y_true.copy()
        sensitive = working_df[sensitive_col].astype(str)

        # Align indexes
        common_idx = y_true.index.intersection(y_pred.index).intersection(sensitive.index)
        y_true = y_true.loc[common_idx]
        y_pred = y_pred.loc[common_idx]
        sensitive = sensitive.loc[common_idx]

        # Core fairness metrics
        dpd = float(demographic_parity_difference(y_true, y_pred, sensitive_features=sensitive))
        eod = float(equalized_odds_difference(y_true, y_pred, sensitive_features=sensitive))

        # Group-wise breakdown
        groups_stats = {}
        for group in sensitive.unique():
            mask = sensitive == group
            gyt = y_true[mask]
            gyp = y_pred[mask]
            positive_rate = float(gyp.mean()) * 100 if len(gyp) > 0 else 0.0
            acc = float(accuracy_score(gyt, gyp)) * 100 if len(gyt) > 0 else 0.0
            groups_stats[str(group)] = {
                "count": int(mask.sum()),
                "positive_rate": round(positive_rate, 2),
                "accuracy": round(acc, 2)
            }

        # Disparate Impact Ratio
        rates = [v["positive_rate"] / 100 for v in groups_stats.values() if v["count"] > 0]
        dir_ratio = (min(rates) / max(rates)) if max(rates) > 0 else 1.0

        # Risk classification
        dpd_abs = abs(dpd)
        if dpd_abs > 0.2 or dir_ratio < 0.7:
            risk_level = "HIGH"
            fairness_score = max(0, int(100 - dpd_abs * 250))
        elif dpd_abs > 0.1 or dir_ratio < 0.8:
            risk_level = "MEDIUM"
            fairness_score = max(40, int(100 - dpd_abs * 180))
        else:
            risk_level = "LOW"
            fairness_score = min(100, int(100 - dpd_abs * 100))

        return {
            "sensitive_column": sensitive_col,
            "demographic_parity_difference": round(dpd, 4),
            "equalized_odds_difference": round(eod, 4),
            "disparate_impact_ratio": round(dir_ratio, 4),
            "risk_level": risk_level,
            "fairness_score": fairness_score,
            "group_statistics": groups_stats,
            "groups_analyzed": [str(g) for g in sensitive.unique().tolist()]
        }

    except Exception as e:
        return {
            "sensitive_column": sensitive_col,
            "error": str(e),
            "risk_level": "UNKNOWN",
            "fairness_score": 0
        }


def run_full_analysis(
    df: pd.DataFrame,
    sensitive_cols: List[str],
    target_col: str,
    prediction_col: Optional[str] = None
) -> dict:
    """Run complete bias analysis across all sensitive columns."""
    attribute_results = []
    scores = []

    for col in sensitive_cols:
        if col in df.columns and col != target_col:
            result = compute_attribute_metrics(df, col, target_col, prediction_col)
            attribute_results.append(result)
            if "fairness_score" in result:
                scores.append(result["fairness_score"])

    overall_score = int(np.mean(scores)) if scores else 50
    if overall_score < 50:
        overall_risk = "HIGH"
    elif overall_score < 75:
        overall_risk = "MEDIUM"
    else:
        overall_risk = "LOW"

    return {
        "overall_fairness_score": overall_score,
        "overall_risk_level": overall_risk,
        "total_rows": len(df),
        "columns_analyzed": len(attribute_results),
        "attribute_results": attribute_results
    }
