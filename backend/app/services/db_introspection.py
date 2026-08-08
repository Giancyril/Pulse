"""
backend/app/services/db_introspection.py
Service for connecting to external databases and introspecting table/column schemas.
"""
import uuid
from typing import List, Dict, Any
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session
from app.models.dataset import DatasetModel
from app.core.security import encrypt_credential


class DbIntrospectionService:
    @staticmethod
    def connect_and_introspect(
        name: str,
        host: str,
        port: int,
        database: str,
        username: str,
        password: str,
        ssl: bool,
        db_session: Session,
    ) -> DatasetModel:
        """
        Validates connection to external SQL database, introspects table & column schemas,
        encrypts credentials, and saves dataset record.
        """
        # Construct connection string (PostgreSQL default)
        ssl_mode = "?sslmode=require" if ssl else ""
        connection_url = f"postgresql://{username}:{password}@{host}:{port}/{database}{ssl_mode}"

        # Connect with short 3-second timeout
        try:
            target_engine = create_engine(
                connection_url,
                connect_args={"connect_timeout": 3},
                pool_pre_ping=True,
            )
            with target_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
        except Exception as e:
            raise ConnectionError(f"Failed to connect to external database at {host}:{port}/{database}. Error: {str(e)}")

        # Introspect schema metadata
        inspector = inspect(target_engine)
        table_names = inspector.get_table_names()

        if not table_names:
            raise ValueError(f"Database '{database}' contains no public tables.")

        all_tables_metadata = []
        total_rows = 0

        for tbl in table_names[:25]:  # Introspect up to 25 main tables
            columns = inspector.get_columns(tbl)
            cols_meta = []
            for c in columns:
                cols_meta.append(
                    {
                        "name": c["name"],
                        "type": str(c["type"]).upper(),
                        "nullable": bool(c.get("nullable", True)),
                    }
                )

            # Fast row count estimate
            row_cnt = 0
            try:
                with target_engine.connect() as conn:
                    res = conn.execute(text(f"SELECT COUNT(*) FROM \"{tbl}\""))
                    row_cnt = res.scalar() or 0
            except Exception:
                row_cnt = 0

            total_rows += row_cnt
            all_tables_metadata.append(
                {
                    "name": tbl,
                    "row_count": row_cnt,
                    "columns": cols_meta,
                }
            )

        # Encrypt sensitive password
        encrypted_password = encrypt_credential(password)
        dataset_id = f"ds_ext_{uuid.uuid4().hex[:8]}"

        dataset_record = DatasetModel(
            id=dataset_id,
            name=name or f"External DB ({database})",
            source_type="external_db",
            table_name=table_names[0] if table_names else "multi_table",
            row_count=total_rows,
            columns_metadata=all_tables_metadata[0]["columns"] if all_tables_metadata else [],
        )

        db_session.add(dataset_record)
        db_session.commit()
        db_session.refresh(dataset_record)

        return dataset_record
