-- Model versioning tables
create table if not exists model_versions (
  id text primary key,
  name text not null,
  version int not null,
  status text not null, -- 'training', 'shadow', 'active', 'archived'
  weights jsonb not null,
  metrics jsonb not null, -- {avgCLV, roi, winRate, totalBets, sharpeRatio, maxDrawdown, sampleSize}
  created_at timestamp default now(),
  tested_at timestamp,
  promoted_at timestamp
);

create table if not exists model_comparisons (
  id text primary key,
  model1_id text references model_versions(id),
  model2_id text references model_versions(id),
  winner text not null,
  clv_difference float,
  roi_difference float,
  recommendation text, -- 'promote', 'reject', 'inconclusive'
  reasoning text,
  created_at timestamp default now()
);

-- Probability calibration
create table if not exists calibration_data (
  id int primary key default 1,
  bucket_data jsonb not null, -- stores all calibration buckets
  calibration_error float,
  updated_at timestamp default now()
);

-- System metrics
create table if not exists system_metrics (
  id int primary key default 1,
  calibration_error float,
  calibration_data jsonb,
  market_regime text,
  last_training timestamp,
  updated_at timestamp default now()
);

-- Feature importance
create table if not exists feature_importance (
  feature text primary key,
  value float not null,
  updated_at timestamp default now()
);

-- Market regime tracking
create table if not exists market_regime (
  id int primary key default 1,
  regime text not null, -- 'FAVOURABLE', 'NEUTRAL', 'UNFAVOURABLE'
  avg_clv_recent float,
  avg_clv_all_time float,
  trend text, -- 'improving', 'stable', 'declining'
  confidence float,
  updated_at timestamp default now()
);

-- Indexes for performance
create index if not exists idx_model_versions_status on model_versions(status);
create index if not exists idx_model_versions_created on model_versions(created_at);
create index if not exists idx_model_comparisons_created on model_comparisons(created_at);
