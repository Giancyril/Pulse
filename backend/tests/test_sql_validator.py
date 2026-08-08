"""
backend/tests/test_sql_validator.py
Unit tests for SQL AST validator and security guardrails.
"""
import pytest
from app.services.sql_validator import SqlValidator, SqlValidationError


def test_valid_select_query():
    sql = "SELECT category, SUM(amount) AS total FROM sales GROUP BY category ORDER BY total DESC;"
    validated = SqlValidator.validate_and_format(sql, max_limit=100)

    assert "SELECT" in validated
    assert "LIMIT 100" in validated
    assert validated.endswith(";")


def test_prohibit_destructive_drop_table():
    sql = "DROP TABLE sales;"
    with pytest.raises(SqlValidationError) as exc:
        SqlValidator.validate_and_format(sql)
    assert "prohibited command 'DROP'" in str(exc.value) or "Security Violation" in str(exc.value)


def test_prohibit_delete_from():
    sql = "DELETE FROM sales WHERE amount > 100;"
    with pytest.raises(SqlValidationError) as exc:
        SqlValidator.validate_and_format(sql)
    assert "prohibited command 'DELETE'" in str(exc.value) or "Security Violation" in str(exc.value)


def test_prohibit_update():
    sql = "UPDATE sales SET amount = 0;"
    with pytest.raises(SqlValidationError) as exc:
        SqlValidator.validate_and_format(sql)
    assert "prohibited command 'UPDATE'" in str(exc.value) or "Security Violation" in str(exc.value)


def test_limit_injection():
    sql = "SELECT * FROM tbl_ds_12345"
    validated = SqlValidator.validate_and_format(sql, max_limit=500)
    assert "LIMIT 500" in validated
