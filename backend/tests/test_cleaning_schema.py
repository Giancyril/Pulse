"""
backend/tests/test_cleaning_schema.py
Unit tests verifying CleaningActionModel and EDAReportModel schema creation and persistence.
"""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.models.dataset import DatasetModel
from app.models.cleaning_action import CleaningActionModel
from app.models.eda_report import EDAReportModel


@pytest.fixture
def in_memory_db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


def test_cleaning_action_persistence(in_memory_db):
    """Verify CleaningActionModel can be saved and converted to dict."""
    dataset = DatasetModel(
        id="ds_test_101",
        name="test_data.csv",
        source_type="upload",
        table_name="tbl_test_101",
        row_count=100,
        columns_metadata=[],
    )
    in_memory_db.add(dataset)
    in_memory_db.commit()

    action = CleaningActionModel(
        dataset_id="ds_test_101",
        action_type="impute_median",
        column_name="age",
        parameters={"column": "age", "value": 29.5},
        rows_affected=5,
        summary="Imputed 5 missing values in 'age' with median 29.5",
    )
    in_memory_db.add(action)
    in_memory_db.commit()
    in_memory_db.refresh(action)

    assert action.id.startswith("act_")
    assert action.rows_affected == 5
    d = action.to_dict()
    assert d["action_type"] == "impute_median"
    assert d["column_name"] == "age"
    assert d["parameters"]["value"] == 29.5


def test_eda_report_persistence(in_memory_db):
    """Verify EDAReportModel can be saved and converted to dict."""
    dataset = DatasetModel(
        id="ds_test_102",
        name="eda_data.csv",
        source_type="upload",
        table_name="tbl_test_102",
        row_count=50,
        columns_metadata=[],
    )
    in_memory_db.add(dataset)
    in_memory_db.commit()

    eda = EDAReportModel(
        dataset_id="ds_test_102",
        correlations={"columns": ["a", "b"], "matrix": [[1.0, 0.5], [0.5, 1.0]], "top_pairs": []},
        distributions=[{"column": "a", "mean": 10.0, "bins": []}],
        categorical_breakdowns=[],
        pairwise_scatters=[],
        narrative_summary={"overview": "Test EDA summary", "key_findings": []},
    )
    in_memory_db.add(eda)
    in_memory_db.commit()
    in_memory_db.refresh(eda)

    assert eda.id.startswith("eda_")
    assert eda.dataset_id == "ds_test_102"
    d = eda.to_dict()
    assert d["narrative_summary"]["overview"] == "Test EDA summary"
