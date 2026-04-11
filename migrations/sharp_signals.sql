-- Sharp money signals table
create table if not exists sharp_signals (
  id            bigserial primary key,
  market_id     text not null,
  selection_id  bigint not null,
  selection_name text,
  home          text,
  away          text,
  signal_type   text not null,   -- VOLUME_SPIKE | ODDS_STEAM | REVERSE_LINE | COMBINED
  current_odds  numeric,
  previous_odds numeric,
  odds_move_pct numeric,
  matched_volume numeric,
  volume_baseline_ratio numeric,
  confidence    text not null,   -- HIGH | MEDIUM | LOW
  recommendation text,
  detected_at   timestamptz default now()
);

create index if not exists sharp_signals_detected_at_idx on sharp_signals (detected_at desc);
create index if not exists sharp_signals_confidence_idx on sharp_signals (confidence);
