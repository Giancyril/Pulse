"""
backend/app/services/ingestion_service.py
Ingestion service for parsing CSV/XLSX files, inferring types, and storing into DB tables.
"""
import re
import uuid
import pandas as pd
from sqlalchemy import inspect
from sqlalchemy.orm import Session
from app.core.database import engine, Base
from app.models.dataset import DatasetModel


def sanitize_column_name(col: str) -> str:
    """Sanitize column name to SQL-safe lowercase snake_case identifier."""
    col_str = str(col).strip().lower()
    col_str = re.sub(r"[^\w\s]", "", col_str)
    col_str = re.sub(r"\s+", "_", col_str).strip("_")
    if not col_str or col_str[0].isdigit():
        col_str = f"col_{col_str}"
    return col_str


def map_pandas_type_to_sql(dtype: str) -> str:
    """Map pandas data type string to standard SQL data type."""
    dtype_str = str(dtype).lower()
    if "int" in dtype_str:
        return "INTEGER"
    elif "float" in dtype_str:
        return "FLOAT"
    elif "datetime" in dtype_str:
        return "TIMESTAMP"
    elif "bool" in dtype_str:
        return "BOOLEAN"
    else:
        return "TEXT"


class IngestionService:
    @staticmethod
    def process_file(file_bytes: bytes, filename: str, db: Session) -> DatasetModel:
        """Parse CSV or Excel file, clean columns, create database table, and save metadata."""
        # Ensure database tables exist
        Base.metadata.create_all(bind=engine)

        # Load file with pandas
        if filename.endswith(".csv"):
            df = pd.read_csv(pd.io.common.BytesIO(file_bytes))
        elif filename.endswith((".xlsx", ".xls")):
            df = pd.read_excel(pd.io.common.BytesIO(file_bytes))
        else:
            raise ValueError("Unsupported file format. Please upload a CSV or XLSX spreadsheet.")

        if df.empty:
            raise ValueError("The uploaded spreadsheet contains no data rows.")

        # Sanitize column names
        column_mapping = {col: sanitize_column_name(col) for col in df.columns}
        df.rename(columns=column_mapping, inplace=True)

        # Generate unique dataset ID and table name
        dataset_id = f"ds_{uuid.uuid4().hex[:10]}"
        table_name = f"tbl_{dataset_id}"

        # Extract column metadata
        columns_metadata = []
        for col in df.columns:
            sql_type = map_pandas_type_to_sql(str(df[col].dtype))
            columns_metadata.append(
                {
                    "name": col,
                    "type": sql_type,
                    "nullable": bool(df[col].isnull().any()),
                }
            )

        # Save dataframe directly to SQL database engine
        df.to_sql(
            name=table_name,
            con=engine,
            if_exists="replace",
            index=False,
            chunksize=5000,
        )

        # Create dataset metadata record
        dataset_record = DatasetModel(
            id=dataset_id,
            name=filename,
            source_type="upload",
            table_name=table_name,
            row_count=len(df),
            columns_metadata=columns_metadata,
        )

        db.add(dataset_record)
        db.commit()
        db.refresh(dataset_record)

        return dataset_record
