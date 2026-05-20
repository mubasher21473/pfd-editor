CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'team');
CREATE TYPE object_type AS ENUM ('text', 'path', 'image', 'form_xobject');
CREATE TYPE edit_status AS ENUM ('pending', 'processing', 'done', 'failed');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255),
    full_name VARCHAR(255),
    avatar_url VARCHAR(512),
    provider VARCHAR(50) DEFAULT 'email',
    tier subscription_tier DEFAULT 'free',
    stripe_customer_id VARCHAR(255),
    uploads_this_month INT DEFAULT 0,
    uploads_reset_at TIMESTAMPTZ DEFAULT date_trunc('month', now()),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE pdf_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    original_name VARCHAR(512) NOT NULL,
    s3_key VARCHAR(1024) NOT NULL,
    file_size_bytes BIGINT,
    page_count INT,
    parse_status VARCHAR(50) DEFAULT 'pending',
    parsed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE pdf_objects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID REFERENCES pdf_files(id) ON DELETE CASCADE,
    page_index INT NOT NULL,
    object_type object_type NOT NULL,
    stream_index INT,
    x FLOAT,
    y FLOAT,
    width FLOAT,
    height FLOAT,
    fill_color VARCHAR(7),
    stroke_color VARCHAR(7),
    font_name VARCHAR(255),
    font_size FLOAT,
    text_content TEXT,
    raw_attrs JSONB
);

CREATE TABLE edit_operations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID REFERENCES pdf_files(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    operation JSONB NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE exports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID REFERENCES pdf_files(id) ON DELETE CASCADE,
    s3_key VARCHAR(1024),
    status edit_status DEFAULT 'pending',
    download_url VARCHAR(2048),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pdf_objects_file_id ON pdf_objects(file_id);
CREATE INDEX idx_pdf_objects_fill_color ON pdf_objects(fill_color);
CREATE INDEX idx_pdf_objects_type ON pdf_objects(object_type);
