"""
backend/tests/test_ingestion.py
Unit tests for spreadsheet parsing, type inference, and database table creation.
"""
import io
import pandas as pd
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.services.ingestion_service import IngestionService, sanitize_column_name, map_pandas_type_to_sql

# Setup in-memory test database
TEST_SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(TEST_SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def test_sanitize_column_name():
    assert sanitize_column_name("Total Sales ($)") == "total_sales"
    assert sanitize_column_name("123 Year") == "col_123_year"
    assert sanitize_column_name(" First Name  ") == "first_name"


def test_map_pandas_type_to_sql():
    assert map_pandas_type_to_sql("int64") == "INTEGER"
    assert map_pandas_type_to_sql("float64") == "FLOAT"
    assert map_pandas_type_to_sql("datetime64[ns]") == "TIMESTAMP"
    assert map_pandas_type_to_sql("bool") == "BOOLEAN"
    assert map_pandas_type_to_sql("object") == "TEXT"


def test_csv_ingestion():
    # Create sample CSV in memory
    csv_data = "Product,Sales,Quantity,In_Stock\nLaptop,1200.50,5,True\nPhone,800.00,10,True\n"
    csv_bytes = csv_data.encode("utf-8")

    db = TestingSessionLocal()
    try:
        dataset = IngestionService.process_file(csv_bytes, "sample_sales.csv", db)
        assert dataset.name == "sample_sales.csv"
        assert dataset.row_count == 2
        assert len(dataset.columns_metadata) == 4
        col_names = [c["name"] for c in dataset.columns_metadata]
        assert "product" in col_names
        assert "sales" in col_names
        assert "quantity" in col_names
        assert "in_stock" in col_names
    finally:
        db.close()
