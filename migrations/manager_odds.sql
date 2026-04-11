-- ─── Manager registry ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.managers (
  id                    TEXT PRIMARY KEY,
  name                  TEXT NOT NULL,
  club                  TEXT NOT NULL,
  contract_expiry       TEXT,
  status                TEXT NOT NULL
                          CHECK (status IN ('AT_RISK','LEAVING','STABLE','INTERIM')),
  predicted_destination TEXT NOT NULL,
  probability           TEXT NOT NULL
                          CHECK (probability IN ('HIGH','MED','LOW')),
  replacement_target    TEXT NOT NULL,
  notes                 TEXT NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Immutable odds snapshots ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.manager_odds (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id  TEXT NOT NULL REFERENCES public.managers(id) ON DELETE CASCADE,
  odds_value  NUMERIC(6,2) NOT NULL,
  source      TEXT NOT NULL DEFAULT 'manual',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes       TEXT
);

CREATE INDEX IF NOT EXISTS idx_manager_odds_manager_id
  ON public.manager_odds(manager_id);

CREATE INDEX IF NOT EXISTS idx_manager_odds_recorded_at
  ON public.manager_odds(recorded_at DESC);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.managers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_odds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "managers_read_all"
  ON public.managers FOR SELECT USING (true);

CREATE POLICY "manager_odds_read_all"
  ON public.manager_odds FOR SELECT USING (true);

CREATE POLICY "managers_write_auth"
  ON public.managers FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "manager_odds_insert_auth"
  ON public.manager_odds FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ─── Seed managers ────────────────────────────────────────────────────────────

INSERT INTO public.managers (id, name, club, contract_expiry, status, predicted_destination, probability, replacement_target, notes)
VALUES
  ('slot',      'Arne Slot',       'Liverpool',         'Jun 2027', 'AT_RISK', 'Sacked → Marseille / Bayern / Dutch NT', 'HIGH', 'Xabi Alonso',            'Title winner last season but form collapsed. Gerrard publicly says no way back.'),
  ('howe',      'Eddie Howe',      'Newcastle United',  'Jun 2026', 'LEAVING', 'England NT (if Tuchel exits post-WC)',   'HIGH', 'Andoni Iraola',          'Best English manager available. Newcastle have stalled. Time for both to move on.'),
  ('guardiola', 'Pep Guardiola',   'Manchester City',   'Jun 2027', 'AT_RISK', 'Sabbatical',                             'MED',  'Enzo Maresca / Kompany', '1 year left after this season. Murmurs building. Won Carabao Cup but tone is different.'),
  ('rosenior',  'Liam Rosenior',   'Chelsea',           'Jun 2031', 'AT_RISK', 'Sacked (massive payoff)',                'HIGH', 'Nagelsmann / Fabregas',  'Signed 6.5yr deal in Jan. Wheels off. BlueCo will absorb the payoff.'),
  ('glasner',   'Oliver Glasner',  'Crystal Palace',    'Jun 2026', 'LEAVING', 'Abroad / Aston Villa',                  'HIGH', 'Gareth Southgate',       'Already confirmed leaving. ECFL run could determine calibre of next club.'),
  ('iraola',    'Andoni Iraola',   'Bournemouth',       'Jun 2026', 'LEAVING', 'Newcastle United',                      'MED',  'Michel (Girona)',         'Out of contract. Widely tipped for Newcastle. Quietly excellent.'),
  ('silva',     'Marco Silva',     'Fulham',            'Jun 2026', 'LEAVING', 'Foreign club / Portugal NT',            'MED',  'Michael Carrick',        '5 years at Craven Cottage. Unlikely to extend. Lateral moves possible.'),
  ('carrick',   'Michael Carrick', 'Man Utd (Interim)', NULL,       'INTERIM', 'Fulham (permanent role)',               'MED',  'Luis Enrique / Tuchel',  'Impressive interim run. United want proven winners. Carrick won''t get the permanent job.'),
  ('emery',     'Unai Emery',      'Aston Villa',       'Jun 2027', 'AT_RISK', 'Real Madrid',                           'LOW',  'Oliver Glasner',         'Boldest call. Stock never higher. If Villa win EL, Madrid could come calling.')
ON CONFLICT (id) DO NOTHING;

-- ─── Seed initial odds snapshots ─────────────────────────────────────────────

INSERT INTO public.manager_odds (manager_id, odds_value, source, recorded_at, notes)
VALUES
  ('slot',      6.00, 'manual', '2026-03-10 09:00:00+00', 'Opening tracking'),
  ('slot',      4.00, 'manual', '2026-03-20 09:00:00+00', NULL),
  ('slot',      2.50, 'manual', '2026-04-01 09:00:00+00', NULL),
  ('slot',      2.00, 'manual', '2026-04-03 09:00:00+00', 'F365 managergeddon article'),

  ('howe',      5.00, 'manual', '2026-03-10 09:00:00+00', 'Opening tracking'),
  ('howe',      4.00, 'manual', '2026-03-20 09:00:00+00', NULL),
  ('howe',      3.00, 'manual', '2026-04-01 09:00:00+00', NULL),
  ('howe',      2.50, 'manual', '2026-04-03 09:00:00+00', NULL),

  ('guardiola', 10.00,'manual', '2026-03-10 09:00:00+00', 'Opening tracking'),
  ('guardiola',  8.00,'manual', '2026-03-20 09:00:00+00', NULL),
  ('guardiola',  6.00,'manual', '2026-04-01 09:00:00+00', NULL),
  ('guardiola',  5.00,'manual', '2026-04-03 09:00:00+00', NULL),

  ('rosenior',  4.00, 'manual', '2026-03-10 09:00:00+00', 'Opening tracking'),
  ('rosenior',  3.00, 'manual', '2026-03-20 09:00:00+00', NULL),
  ('rosenior',  2.00, 'manual', '2026-04-01 09:00:00+00', NULL),
  ('rosenior',  1.75, 'manual', '2026-04-03 09:00:00+00', NULL),

  ('glasner',   1.50, 'manual', '2026-03-10 09:00:00+00', 'Opening tracking — confirmed leaving'),
  ('glasner',   1.50, 'manual', '2026-03-20 09:00:00+00', NULL),
  ('glasner',   1.25, 'manual', '2026-04-01 09:00:00+00', NULL),
  ('glasner',   1.10, 'manual', '2026-04-03 09:00:00+00', NULL),

  ('iraola',    3.00, 'manual', '2026-03-10 09:00:00+00', 'Opening tracking'),
  ('iraola',    2.50, 'manual', '2026-03-20 09:00:00+00', NULL),
  ('iraola',    2.00, 'manual', '2026-04-01 09:00:00+00', NULL),
  ('iraola',    2.00, 'manual', '2026-04-03 09:00:00+00', NULL),

  ('silva',     2.50, 'manual', '2026-03-10 09:00:00+00', 'Opening tracking'),
  ('silva',     2.00, 'manual', '2026-03-20 09:00:00+00', NULL),
  ('silva',     1.75, 'manual', '2026-04-01 09:00:00+00', NULL),
  ('silva',     1.75, 'manual', '2026-04-03 09:00:00+00', NULL),

  ('carrick',   8.00, 'manual', '2026-03-10 09:00:00+00', 'Opening tracking'),
  ('carrick',   6.00, 'manual', '2026-03-20 09:00:00+00', NULL),
  ('carrick',   4.00, 'manual', '2026-04-01 09:00:00+00', NULL),
  ('carrick',   3.50, 'manual', '2026-04-03 09:00:00+00', NULL),

  ('emery',    14.00, 'manual', '2026-03-10 09:00:00+00', 'Opening tracking'),
  ('emery',    12.00, 'manual', '2026-03-20 09:00:00+00', NULL),
  ('emery',    10.00, 'manual', '2026-04-01 09:00:00+00', NULL),
  ('emery',     8.00, 'manual', '2026-04-03 09:00:00+00', NULL);
