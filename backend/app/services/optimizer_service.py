"""
backend/app/services/optimizer_service.py
SQL performance optimizer, static analyzer, and dialect transpiler powered by sqlglot.
"""
from typing import List, Optional
import sqlglot
from sqlglot import exp
from app.schemas.optimizer import (
    SqlOptimizeRequest,
    SqlOptimizeResponse,
    OptimizationSuggestion,
)


class OptimizerService:
    @staticmethod
    def optimize(req: SqlOptimizeRequest) -> SqlOptimizeResponse:
        sql = req.sql.strip()
        dialect = req.dialect.lower()
        target_dialect = req.target_dialect.lower() if req.target_dialect else None

        try:
            parsed = sqlglot.parse_one(sql, read=dialect)
        except Exception as e:
            # Fallback for unparseable raw SQL
            return SqlOptimizeResponse(
                original_sql=sql,
                optimized_sql=sql,
                transpiled_sql=None,
                target_dialect=target_dialect,
                complexity_score=10,
                suggestions=[
                    OptimizationSuggestion(
                        type="PARSE_ERROR",
                        impact="LOW",
                        title="SQL Parsing Notice",
                        explanation=f"Could not parse query AST: {str(e)}",
                        suggestion="Ensure standard SQL syntax.",
                    )
                ],
                ast_summary="Raw SQL Expression",
            )

        # 1. Pretty-print optimized SQL
        optimized_sql = parsed.sql(pretty=True, dialect=dialect)

        # 2. Dialect Transpilation
        transpiled_sql = None
        if target_dialect and target_dialect != dialect:
            try:
                transpiled_sql = parsed.sql(pretty=True, dialect=target_dialect)
            except Exception:
                transpiled_sql = None

        # 3. Rule-based AST static analysis for anti-patterns
        suggestions: List[OptimizationSuggestion] = []

        # Check A: SELECT * usage
        for select in parsed.find_all(exp.Select):
            for expression in select.expressions:
                if isinstance(expression, exp.Star):
                    suggestions.append(
                        OptimizationSuggestion(
                            type="SELECT_STAR",
                            impact="MEDIUM",
                            title="Avoid SELECT *",
                            explanation="SELECT * retrieves all table columns, increasing I/O overhead and memory payload.",
                            suggestion="Explicitly name only the columns required by your application.",
                        )
                    )
                    break

        # Check B: Missing LIMIT clause on SELECT
        has_limit = parsed.find(exp.Limit) is not None
        is_aggregate = parsed.find(exp.Group) is not None or any(
            isinstance(e, exp.Func) for e in parsed.find_all(exp.Func)
        )
        if isinstance(parsed, exp.Select) and not has_limit and not is_aggregate:
            suggestions.append(
                OptimizationSuggestion(
                    type="MISSING_LIMIT",
                    impact="HIGH",
                    title="Unbounded Result Set (Missing LIMIT)",
                    explanation="Query has no LIMIT clause and could return millions of rows, overloading application memory.",
                    suggestion="Add a LIMIT clause (e.g. LIMIT 100) to cap maximum returned rows.",
                )
            )

        # Check C: Leading Wildcard LIKE '%term'
        for like in parsed.find_all(exp.Like):
            right_val = str(like.right).strip("'\"")
            if right_val.startswith("%"):
                suggestions.append(
                    OptimizationSuggestion(
                        type="LEADING_WILDCARD",
                        impact="HIGH",
                        title="Non-Sargable LIKE Pattern",
                        explanation=f"LIKE '{right_val}' starts with a wildcard '%', forcing a full table scan instead of using B-tree indexes.",
                        suggestion="Consider full-text search indexes or trailing wildcard matching 'term%'.",
                    )
                )

        # Check D: Function wrappers in WHERE clause
        where = parsed.find(exp.Where)
        if where:
            for func in where.find_all(exp.Func):
                suggestions.append(
                    OptimizationSuggestion(
                        type="FUNCTION_IN_WHERE",
                        impact="MEDIUM",
                        title="Function Application on Filtering Column",
                        explanation=f"Function {func.sql()} in WHERE clause prevents index lookup on the underlying column.",
                        suggestion="Pre-compute or filter using direct column comparisons where possible.",
                    )
                )

        # Check E: JOIN without ON condition
        for join in parsed.find_all(exp.Join):
            if not join.args.get("on"):
                suggestions.append(
                    OptimizationSuggestion(
                        type="CROSS_JOIN",
                        impact="HIGH",
                        title="Implicit Cartesian / Cross Join",
                        explanation="JOIN clause lacks an ON condition, creating a Cartesian product of all rows.",
                        suggestion="Add explicit JOIN ... ON condition.",
                    )
                )

        # 4. Complexity Scoring (1-100)
        joins_count = len(list(parsed.find_all(exp.Join)))
        subqueries_count = len(list(parsed.find_all(exp.Subquery)))
        aggregates_count = len(list(parsed.find_all(exp.Group)))
        where_count = 1 if parsed.find(exp.Where) else 0

        score = min(100, 10 + (joins_count * 20) + (subqueries_count * 25) + (aggregates_count * 15) + (where_count * 5))

        # AST summary
        ast_summary = f"Root: {parsed.key.upper()} | Joins: {joins_count} | Subqueries: {subqueries_count} | Aggregations: {aggregates_count}"

        return SqlOptimizeResponse(
            original_sql=sql,
            optimized_sql=optimized_sql,
            transpiled_sql=transpiled_sql,
            target_dialect=target_dialect,
            complexity_score=score,
            suggestions=suggestions,
            ast_summary=ast_summary,
        )
