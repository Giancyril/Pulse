"""
backend/app/services/sql_validator.py
SQL AST validator & security guard enforcing READ-ONLY SELECT queries and LIMIT injection.
"""
import re
import sqlglot
from sqlglot import exp
from app.core.config import settings

FORBIDDEN_KEYWORDS = {
    "DROP", "DELETE", "UPDATE", "INSERT", "ALTER", "TRUNCATE",
    "GRANT", "REVOKE", "COPY", "EXEC", "EXECUTE", "CREATE",
    "RENAME", "VACUUM", "PG_SLEEP"
}


class SqlValidationError(ValueError):
    """Raised when generated SQL breaks safety guardrails."""
    pass


class SqlValidator:
    @staticmethod
    def validate_and_format(sql_query: str, max_limit: int = None) -> str:
        """
        Validates that generated SQL is strictly a READ-ONLY SELECT query,
        strips dangerous statements, and enforces a row limit.
        """
        if not sql_query or not sql_query.strip():
            raise SqlValidationError("Generated SQL query is empty.")

        clean_sql = sql_query.strip()
        # Remove trailing semicolons
        clean_sql = clean_sql.rstrip(";")

        # Quick keyword check
        upper_sql = clean_sql.upper()
        for kw in FORBIDDEN_KEYWORDS:
            # Check for keyword surrounded by word boundaries
            if re.search(rf"\b{kw}\b", upper_sql):
                raise SqlValidationError(
                    f"Security Error: Query contains prohibited command '{kw}'. Only READ-ONLY SELECT queries are allowed."
                )

        # Parse AST with sqlglot
        try:
            parsed_expressions = sqlglot.parse(clean_sql, read="postgres")
        except Exception as e:
            # Fallback parsing
            try:
                parsed_expressions = sqlglot.parse(clean_sql)
            except Exception:
                raise SqlValidationError(f"SQL Syntax Error: Unable to parse query. Detail: {str(e)}")

        for expression in parsed_expressions:
            if expression is None:
                continue
            # Ensure top-level expression is SELECT
            if not isinstance(expression, exp.Select):
                raise SqlValidationError(
                    f"Security Violation: Query type '{expression.key.upper()}' is not permitted. Only SELECT statements are allowed."
                )

        # Inject row limit if not specified
        limit = max_limit or settings.MAX_ROW_LIMIT
        if "LIMIT" not in upper_sql:
            clean_sql = f"{clean_sql} LIMIT {limit}"

        return clean_sql + ";"
