export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
}

export interface TableInfo {
  name: string;
  row_count?: number;
  columns: ColumnInfo[];
}

export interface Dataset {
  id: string;
  name: string;
  source: "upload" | "external_db";
  created_at: string;
  tables: TableInfo[];
}

export interface UploadResponse {
  success: boolean;
  dataset_id: string;
  table_name: string;
  row_count: number;
  columns: ColumnInfo[];
}

export interface ConnectDbRequest {
  name: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
}

export interface ConnectDbResponse {
  success: boolean;
  dataset_id: string;
  tables: TableInfo[];
}
