"""
backend/tests/test_optimizer.py
Unit tests for OptimizerService SQL AST linting, anti-pattern detection, and transpilation.
"""
import pytest
from app.services.optimizer_service import OptimizerService
from app.schemas.optimizer import SqlOptimizeRequest, SqlOptimizeResponse


def test_select_star_detection():
    req = SqlOptimizeRequest(sql="SELECT * FROM users")
    res = OptimizerService.optimize(req)

    assert isinstance(res, SqlOptimizeResponse)
    types = [s.type for s in res.suggestions]
    assert "SELECT_STAR" in types
    assert "MISSING_LIMIT" in types


def test_missing_limit_flagged():
    req = SqlOptimizeRequest(sql="SELECT id, name FROM employees")
    res = OptimizerService.optimize(req)

    types = [s.type for s in res.suggestions]
    assert "MISSING_LIMIT" in types
    assert "SELECT_STAR" not in types


def test_leading_wildcard_flagged():
    req = SqlOptimizeRequest(sql="SELECT id FROM products WHERE title LIKE '%phone'")
    res = OptimizerService.optimize(req)

    types = [s.type for s in res.suggestions]
    assert "LEADING_WILDCARD" in types


def test_dialect_transpilation():
    req = SqlOptimizeRequest(sql="SELECT id, name FROM users LIMIT 10", dialect="sqlite", target_dialect="postgres")
    res = OptimizerService.optimize(req)

    assert res.transpiled_sql is not None
    assert "LIMIT 10" in res.transpiled_sql


def test_complexity_score_calculation():
    simple_sql = "SELECT id FROM users LIMIT 5"
    complex_sql = "SELECT u.id, COUNT(o.id) FROM users u JOIN orders o ON u.id = o.user_id GROUP BY u.id"

    res_simple = OptimizerService.optimize(SqlOptimizeRequest(sql=simple_sql))
    res_complex = OptimizerService.optimize(SqlOptimizeRequest(sql=complex_sql))

    assert res_complex.complexity_score > res_simple.complexity_score
