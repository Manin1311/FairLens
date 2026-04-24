import pandas as pd
import numpy as np
from fairlearn.metrics import demographic_parity_difference, equalized_odds_difference
from sklearn.metrics import accuracy_score
from typing import List, Optional
import io

# ── Column detection keywords ──────────────────────────────────────────────────
SENSITIVE_KEYWORDS = [
    'gender', 'sex', 'race', 'ethnicity', 'age', 'religion',
    'caste', 'nationality', 'disability', 'marital', 'color',
    'colour', 'origin', 'language', 'tribe', 'community'
]
TARGET_KEYWORDS = [
    'outcome', 'decision', 'result', 'label', 'target',
    'approved', 'hired', 'status', 'class', 'output',
    'prediction', 'loan', 'admit', 'accept', 'granted', 'qualify'
]
POSITIVE_VALUES = {
    'yes', '1', 'true', 'approved', 'hired', 'granted',
    'accepted', 'positive', 'pass', 'admit', 'success',
    'allow', '1.0', 'high', 'good', 'm', 'malignant', 'yes'
}

MAX_CATEGORIES  = 20   # More than this → we bin the column
MIN_GROUP_ROWS  = 5    # Groups smaller than this are dropped


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
    """Encode any series robustly to binary 0/1 values."""
    # Guard: DataFrame with duplicate column names → take first column
    if isinstance(series, pd.DataFrame):
        series = series.iloc[:, 0]

    series = series.copy()

    # Already numeric with only 0/1 values
    if pd.api.types.is_numeric_dtype(series):
        unique_vals = set(series.dropna().unique())
        if unique_vals.issubset({0, 1, 0.0, 1.0}):
            return series.fillna(0).astype(int)
        # Numeric with more values → above median = 1
        med = series.median()
        return (series > med).astype(int)

    # String: map positive keywords to 1
    str_series = series.astype(str).str.lower().str.strip()
    str_series = str_series.replace({'nan': None, 'none': None, '': None})
    str_series = str_series.fillna(str_series.mode()[0] if not str_series.mode().empty else '0')

    if str_series.isin(POSITIVE_VALUES).any():
        return str_series.isin(POSITIVE_VALUES).astype(int)

    unique_vals = str_series.unique()
    if len(unique_vals) == 2:
        return (str_series == unique_vals[0]).astype(int)

    # Multi-class: mode = 0, rest = 1
    mode_val = str_series.mode()[0] if not str_series.mode().empty else unique_vals[0]
    return (str_series != mode_val).astype(int)


def _make_categorical(series: pd.Series, col_name: str) -> pd.Series:
    """
    Convert a sensitive column to a clean categorical series.
    Handles numeric, string, and edge cases robustly.
    """
    # Guard: if somehow a DataFrame was passed (duplicate col names), take first col
    if isinstance(series, pd.DataFrame):
        series = series.iloc[:, 0]

    series = series.astype(str).str.strip()
    series = series.replace({'nan': 'Unknown', 'none': 'Unknown', 'NaN': 'Unknown', '': 'Unknown'})

    n_unique = series.nunique()

    # Try to treat as numeric and bin it
    try:
        numeric = pd.to_numeric(series, errors='raise')
        if n_unique > MAX_CATEGORIES:
            # Bin into at most 4 quartile groups; fall back to 2 if too few unique values
            for q in [4, 3, 2]:
                try:
                    labels = ['Q1 Low', 'Q2', 'Q3', 'Q4 High'][:q]
                    binned = pd.qcut(numeric, q=q, labels=labels, duplicates='drop')
                    result = binned.astype(str).replace({'nan': 'Unknown'})
                    if result.nunique() >= 2:
                        return pd.Series(result.values, index=series.index)
                except Exception:
                    continue
            # Last resort: median split
            med = numeric.median()
            return pd.Series(
                (numeric > med).map({True: 'High', False: 'Low'}).values,
                index=series.index
            )
        else:
            return series  # numeric but few unique values → treat as categorical
    except (ValueError, TypeError):
        pass  # not numeric — fall through to string handling

    # String column with too many categories → keep top N, rest = 'Other'
    if n_unique > MAX_CATEGORIES:
        top = series.value_counts().nlargest(MAX_CATEGORIES - 1).index.tolist()
        return series.where(series.isin(top), other='Other')

    return series


def _validate_sensitive_col(sensitive: pd.Series, col_name: str) -> Optional[str]:
    """Return an error string if the column is unusable, else None."""
    n_unique = sensitive.nunique()
    if n_unique < 2:
        return f"Column '{col_name}' has only one unique value — cannot compare groups."
    counts = sensitive.value_counts()
    usable_groups = counts[counts >= MIN_GROUP_ROWS]
    if len(usable_groups) < 2:
        return (f"Column '{col_name}' does not have at least 2 groups with ≥{MIN_GROUP_ROWS} rows each. "
                f"Largest group: {counts.max()} rows.")
    return None


def compute_attribute_metrics(
    df: pd.DataFrame,
    sensitive_col: str,
    target_col: str,
    prediction_col: Optional[str] = None
) -> dict:
    """Compute fairness metrics for one sensitive attribute — robust to any data shape."""
    try:
        # Select relevant columns and drop NaN
        cols = [sensitive_col, target_col]
        if prediction_col and prediction_col in df.columns and prediction_col != target_col:
            cols.append(prediction_col)
        working_df = df[cols].dropna().reset_index(drop=True)

        if len(working_df) < 10:
            return _error_result(sensitive_col,
                                 f"Not enough data: only {len(working_df)} rows after removing blanks (need ≥10).")

        # ── Encode target ──────────────────────────────────────────────────────
        y_true = encode_binary(working_df[target_col])

        # ── Encode prediction (or use y_true as proxy) ─────────────────────────
        if prediction_col and prediction_col in working_df.columns:
            y_pred = encode_binary(working_df[prediction_col])
        else:
            y_pred = y_true.copy()

        # ── Categorical-ize the sensitive column ───────────────────────────────
        sensitive_raw = _make_categorical(working_df[sensitive_col], sensitive_col)

        # Filter to only groups with enough rows
        counts = sensitive_raw.value_counts()
        valid_groups = counts[counts >= MIN_GROUP_ROWS].index
        mask = sensitive_raw.isin(valid_groups)
        if mask.sum() < 10:
            return _error_result(sensitive_col,
                                 f"After filtering small groups, only {mask.sum()} rows remain (need ≥10).")

        sensitive = sensitive_raw[mask].reset_index(drop=True)
        y_true    = y_true[mask].reset_index(drop=True)
        y_pred    = y_pred[mask].reset_index(drop=True)

        err = _validate_sensitive_col(sensitive, sensitive_col)
        if err:
            return _error_result(sensitive_col, err)

        # ── Core fairness metrics ──────────────────────────────────────────────
        dpd = float(demographic_parity_difference(y_true, y_pred, sensitive_features=sensitive))
        eod = float(equalized_odds_difference(y_true, y_pred, sensitive_features=sensitive))

        # ── Group-wise breakdown ───────────────────────────────────────────────
        groups_stats = {}
        for group in sorted(sensitive.unique()):
            gm  = sensitive == group
            gyt = y_true[gm]
            gyp = y_pred[gm]
            positive_rate = float(gyp.mean()) * 100 if len(gyp) > 0 else 0.0
            acc           = float(accuracy_score(gyt, gyp)) * 100 if len(gyt) > 0 else 0.0
            groups_stats[str(group)] = {
                "count":         int(gm.sum()),
                "positive_rate": round(positive_rate, 2),
                "accuracy":      round(acc, 2),
            }

        # ── Disparate Impact Ratio ─────────────────────────────────────────────
        rates = [v["positive_rate"] / 100 for v in groups_stats.values() if v["count"] >= MIN_GROUP_ROWS]
        if len(rates) >= 2 and max(rates) > 0:
            dir_ratio = min(rates) / max(rates)
        else:
            dir_ratio = 1.0

        # ── Bias contribution (correlation between sensitive col and target) ───
        # Use Cramér's V for categorical association
        try:
            from scipy.stats import chi2_contingency
            ct = pd.crosstab(sensitive, y_true)
            chi2, _, _, _ = chi2_contingency(ct)
            n = ct.sum().sum()
            phi2 = chi2 / n
            r, k = ct.shape
            cramers_v = float(np.sqrt(phi2 / (min(k - 1, r - 1)))) if min(k - 1, r - 1) > 0 else 0.0
            bias_contribution_pct = round(min(cramers_v * 100, 100), 1)
        except Exception:
            bias_contribution_pct = round(abs(dpd) * 100, 1)

        # ── Risk & Score ───────────────────────────────────────────────────────
        dpd_abs = abs(dpd)
        if dpd_abs > 0.2 or dir_ratio < 0.7:
            risk_level    = "HIGH"
            fairness_score = max(0, int(100 - dpd_abs * 250))
        elif dpd_abs > 0.1 or dir_ratio < 0.8:
            risk_level    = "MEDIUM"
            fairness_score = max(40, int(100 - dpd_abs * 180))
        else:
            risk_level    = "LOW"
            fairness_score = min(100, int(100 - dpd_abs * 100))

        # ── Most disadvantaged group ───────────────────────────────────────────
        if groups_stats:
            most_disadvantaged = min(groups_stats, key=lambda g: groups_stats[g]["positive_rate"])
            most_advantaged    = max(groups_stats, key=lambda g: groups_stats[g]["positive_rate"])
        else:
            most_disadvantaged = most_advantaged = "N/A"

        return {
            "sensitive_column":                sensitive_col,
            "demographic_parity_difference":   round(dpd, 4),
            "equalized_odds_difference":        round(eod, 4),
            "disparate_impact_ratio":           round(dir_ratio, 4),
            "risk_level":                       risk_level,
            "fairness_score":                   fairness_score,
            "bias_contribution_pct":            bias_contribution_pct,
            "most_disadvantaged_group":         most_disadvantaged,
            "most_advantaged_group":            most_advantaged,
            "group_statistics":                 groups_stats,
            "groups_analyzed":                  [str(g) for g in sensitive.unique().tolist()],
            "rows_analyzed":                    int(mask.sum()),
        }

    except Exception as e:
        return _error_result(sensitive_col, str(e))


def _error_result(sensitive_col: str, error_msg: str) -> dict:
    """Return a structured error result instead of crashing."""
    return {
        "sensitive_column":    sensitive_col,
        "error":               error_msg,
        "risk_level":          "UNKNOWN",
        "fairness_score":      None,
        "bias_contribution_pct": None,
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
    bias_drivers = []

    for col in sensitive_cols:
        if col not in df.columns or col == target_col:
            continue
        result = compute_attribute_metrics(df, col, target_col, prediction_col)
        attribute_results.append(result)
        if result.get("fairness_score") is not None:
            scores.append(result["fairness_score"])
        if result.get("bias_contribution_pct") is not None:
            bias_drivers.append({
                "column":     col,
                "contribution_pct": result["bias_contribution_pct"],
                "risk_level": result.get("risk_level", "UNKNOWN"),
            })

    # Sort bias drivers highest → lowest
    bias_drivers.sort(key=lambda x: x["contribution_pct"], reverse=True)

    # Overall score: only from successful analyses
    if scores:
        overall_score = int(np.mean(scores))
        if overall_score < 50:
            overall_risk = "HIGH"
        elif overall_score < 75:
            overall_risk = "MEDIUM"
        else:
            overall_risk = "LOW"
    else:
        # All attributes failed
        overall_score = 0
        overall_risk  = "ERROR"

    return {
        "overall_fairness_score": overall_score,
        "overall_risk_level":     overall_risk,
        "total_rows":             len(df),
        "columns_analyzed":       len([r for r in attribute_results if "error" not in r]),
        "attribute_results":      attribute_results,
        "bias_drivers":           bias_drivers,   # NEW: ranked influence per attribute
    }
