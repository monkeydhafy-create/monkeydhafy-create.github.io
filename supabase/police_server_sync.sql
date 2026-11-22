-- ═════════════════════════════════════════════════════════════════════════════
-- ĐỒNG BỘ VỊ TRÍ & TRUY ĐUỔI CẢNH SÁT SERVER-AUTHORITATIVE (WORLD POLICE SYNC)
-- ═════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.world_police_officers (
  map_id text NOT NULL,
  officer_id text NOT NULL,
  patrol_zone text NOT NULL CHECK (patrol_zone IN ('yellow', 'red')),
  route_points jsonb NOT NULL DEFAULT '[]'::jsonb,
  route_index integer NOT NULL DEFAULT 0,
  patrol_speed double precision NOT NULL DEFAULT 58,
  chase_speed double precision NOT NULL DEFAULT 118,
  state text NOT NULL DEFAULT 'patrol' CHECK (state IN ('patrol', 'investigate', 'chase')),
  start_x double precision NOT NULL,
  start_y double precision NOT NULL,
  target_x double precision NOT NULL,
  target_y double precision NOT NULL,
  facing text NOT NULL DEFAULT 'down',
  segment_started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  segment_duration_ms integer NOT NULL DEFAULT 1000,
  chase_target_player_id text,
  chase_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT world_police_officers_pkey PRIMARY KEY (map_id, officer_id)
);

CREATE INDEX IF NOT EXISTS idx_world_police_officers_map
  ON public.world_police_officers (map_id);

ALTER TABLE public.world_police_officers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "world_police_officers_read_all" ON public.world_police_officers;
CREATE POLICY "world_police_officers_read_all"
  ON public.world_police_officers
  FOR SELECT
  TO anon, authenticated
  USING (true);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.world_police_officers;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.sync_world_police(
  p_map_id text,
  p_seed_officers jsonb DEFAULT NULL
)
RETURNS TABLE(
  officer_id text,
  patrol_zone text,
  state text,
  x double precision,
  y double precision,
  start_x double precision,
  start_y double precision,
  target_x double precision,
  target_y double precision,
  facing text,
  segment_started_at_ms bigint,
  segment_duration_ms integer,
  chase_until_ms bigint,
  server_now_ms bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_now_ms bigint;
  v_seed jsonb;
  v_oid text;
  v_zone text;
  v_pts jsonb;
  v_len integer;
  v_patrol_spd double precision;
  v_chase_spd double precision;
  v_sx double precision;
  v_sy double precision;
  v_tx double precision;
  v_ty double precision;
  v_dx double precision;
  v_dy double precision;
  v_dist double precision;
  v_dur integer;
  v_face text;
  v_next_idx integer;
  r public.world_police_officers%ROWTYPE;
  v_elapsed_ms double precision;
  v_t double precision;
  v_cur_x double precision;
  v_cur_y double precision;
  v_extra_ms double precision;
  v_loop_ms bigint;
  v_i integer;
  v_ax double precision;
  v_ay double precision;
  v_bx double precision;
  v_by double precision;
  v_idx integer;
  v_steps integer;
  v_seg_start timestamptz;
BEGIN
  IF p_map_id NOT IN ('vietnam', 'japan') THEN
    RETURN;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('world_police:' || p_map_id));

  v_now := clock_timestamp();
  v_now_ms := floor(extract(epoch FROM v_now) * 1000.0)::bigint;

  IF p_seed_officers IS NOT NULL AND jsonb_typeof(p_seed_officers) = 'array' THEN
    FOR v_seed IN SELECT value FROM jsonb_array_elements(p_seed_officers) LOOP
      v_oid := trim(COALESCE(v_seed->>'officer_id', ''));
      IF length(v_oid) = 0 THEN
        CONTINUE;
      END IF;
      v_zone := CASE WHEN v_seed->>'patrol_zone' = 'red' THEN 'red' ELSE 'yellow' END;
      v_pts := COALESCE(v_seed->'route_points', '[]'::jsonb);
      IF jsonb_typeof(v_pts) <> 'array' THEN
        CONTINUE;
      END IF;
      v_len := jsonb_array_length(v_pts);
      IF v_len < 1 THEN
        CONTINUE;
      END IF;

      v_patrol_spd := GREATEST(25.0, LEAST(220.0, COALESCE((v_seed->>'patrol_speed')::double precision, 58.0)));
      v_chase_spd := GREATEST(40.0, LEAST(280.0, COALESCE((v_seed->>'chase_speed')::double precision, 118.0)));

      v_sx := (v_pts->0->>'x')::double precision;
      v_sy := (v_pts->0->>'y')::double precision;
      IF v_len >= 2 THEN
        v_tx := (v_pts->1->>'x')::double precision;
        v_ty := (v_pts->1->>'y')::double precision;
        v_next_idx := 1;
      ELSE
        v_tx := v_sx;
        v_ty := v_sy;
        v_next_idx := 0;
      END IF;

      v_dx := v_tx - v_sx;
      v_dy := v_ty - v_sy;
      v_dist := sqrt(v_dx * v_dx + v_dy * v_dy);
      v_dur := GREATEST(600, round((v_dist / GREATEST(25.0, v_patrol_spd)) * 1000.0)::integer);
      v_face := CASE
        WHEN abs(v_dx) > abs(v_dy) THEN CASE WHEN v_dx >= 0 THEN 'right' ELSE 'left' END
        ELSE CASE WHEN v_dy >= 0 THEN 'down' ELSE 'up' END
      END;

      INSERT INTO public.world_police_officers (
        map_id, officer_id, patrol_zone, route_points, route_index,
        patrol_speed, chase_speed, state,
        start_x, start_y, target_x, target_y, facing,
        segment_started_at, segment_duration_ms, updated_at
      )
      VALUES (
        p_map_id, v_oid, v_zone, v_pts, v_next_idx,
        v_patrol_spd, v_chase_spd, 'patrol',
        v_sx, v_sy, v_tx, v_ty, v_face,
        v_now, v_dur, v_now
      )
      ON CONFLICT ON CONSTRAINT world_police_officers_pkey DO NOTHING;
    END LOOP;
  END IF;

  FOR r IN
    SELECT *
    FROM public.world_police_officers AS w
    WHERE w.map_id = p_map_id
    ORDER BY w.officer_id
  LOOP
    v_elapsed_ms := GREATEST(0.0, extract(epoch FROM (v_now - r.segment_started_at)) * 1000.0);
    v_t := CASE
      WHEN r.segment_duration_ms <= 0 THEN 1.0
      ELSE LEAST(1.0, v_elapsed_ms / r.segment_duration_ms)
    END;
    v_cur_x := r.start_x + (r.target_x - r.start_x) * v_t;
    v_cur_y := r.start_y + (r.target_y - r.start_y) * v_t;
    v_len := COALESCE(jsonb_array_length(r.route_points), 0);

    IF r.state IN ('chase', 'investigate') AND (r.chase_until IS NULL OR r.chase_until <= v_now) THEN
      IF v_len >= 1 THEN
        v_next_idx := (r.route_index + 1) % v_len;
        v_tx := (r.route_points->v_next_idx->>'x')::double precision;
        v_ty := (r.route_points->v_next_idx->>'y')::double precision;
      ELSE
        v_next_idx := 0;
        v_tx := v_cur_x;
        v_ty := v_cur_y;
      END IF;

      v_dx := v_tx - v_cur_x;
      v_dy := v_ty - v_cur_y;
      v_dist := sqrt(v_dx * v_dx + v_dy * v_dy);
      v_dur := GREATEST(600, round((v_dist / GREATEST(25.0, r.patrol_speed)) * 1000.0)::integer);
      v_face := CASE
        WHEN abs(v_dx) > abs(v_dy) THEN CASE WHEN v_dx >= 0 THEN 'right' ELSE 'left' END
        ELSE CASE WHEN v_dy >= 0 THEN 'down' ELSE 'up' END
      END;

      UPDATE public.world_police_officers AS w
      SET state = 'patrol',
          route_index = v_next_idx,
          start_x = v_cur_x,
          start_y = v_cur_y,
          target_x = v_tx,
          target_y = v_ty,
          facing = v_face,
          segment_started_at = v_now,
          segment_duration_ms = v_dur,
          chase_target_player_id = NULL,
          chase_until = NULL,
          updated_at = v_now
      WHERE w.map_id = p_map_id AND w.officer_id = r.officer_id
      RETURNING * INTO r;

    ELSIF r.state = 'patrol' AND v_len >= 2 AND v_elapsed_ms >= r.segment_duration_ms THEN
      v_extra_ms := v_elapsed_ms - r.segment_duration_ms;

      IF v_extra_ms > 60000.0 THEN
        v_loop_ms := 0;
        FOR v_i IN 0..(v_len - 1) LOOP
          v_ax := (r.route_points->v_i->>'x')::double precision;
          v_ay := (r.route_points->v_i->>'y')::double precision;
          v_bx := (r.route_points->((v_i + 1) % v_len)->>'x')::double precision;
          v_by := (r.route_points->((v_i + 1) % v_len)->>'y')::double precision;
          v_dist := sqrt((v_bx - v_ax) * (v_bx - v_ax) + (v_by - v_ay) * (v_by - v_ay));
          v_loop_ms := v_loop_ms + GREATEST(600, round((v_dist / GREATEST(25.0, r.patrol_speed)) * 1000.0)::bigint);
        END LOOP;
        IF v_loop_ms > 0 THEN
          v_extra_ms := mod(floor(v_extra_ms)::bigint, v_loop_ms)::double precision;
        END IF;
      END IF;

      v_idx := ((r.route_index % v_len) + v_len) % v_len;
      v_sx := r.target_x;
      v_sy := r.target_y;
      v_steps := 0;

      LOOP
        v_next_idx := (v_idx + 1) % v_len;
        v_tx := (r.route_points->v_next_idx->>'x')::double precision;
        v_ty := (r.route_points->v_next_idx->>'y')::double precision;
        v_dx := v_tx - v_sx;
        v_dy := v_ty - v_sy;
        v_dist := sqrt(v_dx * v_dx + v_dy * v_dy);
        v_dur := GREATEST(600, round((v_dist / GREATEST(25.0, r.patrol_speed)) * 1000.0)::integer);
        v_steps := v_steps + 1;

        IF v_extra_ms < v_dur OR v_steps >= v_len + 4 THEN
          EXIT;
        END IF;

        v_extra_ms := v_extra_ms - v_dur;
        v_idx := v_next_idx;
        v_sx := v_tx;
        v_sy := v_ty;
      END LOOP;

      v_seg_start := v_now - make_interval(secs => (v_extra_ms / 1000.0)::double precision);
      v_face := CASE
        WHEN abs(v_dx) > abs(v_dy) THEN CASE WHEN v_dx >= 0 THEN 'right' ELSE 'left' END
        ELSE CASE WHEN v_dy >= 0 THEN 'down' ELSE 'up' END
      END;

      UPDATE public.world_police_officers AS w
      SET route_index = v_next_idx,
          start_x = v_sx,
          start_y = v_sy,
          target_x = v_tx,
          target_y = v_ty,
          facing = v_face,
          segment_started_at = v_seg_start,
          segment_duration_ms = v_dur,
          updated_at = v_now
      WHERE w.map_id = p_map_id AND w.officer_id = r.officer_id
      RETURNING * INTO r;

      v_t := CASE
        WHEN r.segment_duration_ms <= 0 THEN 1.0
        ELSE LEAST(1.0, GREATEST(0.0, v_extra_ms) / r.segment_duration_ms)
      END;
      v_cur_x := r.start_x + (r.target_x - r.start_x) * v_t;
      v_cur_y := r.start_y + (r.target_y - r.start_y) * v_t;
    END IF;

    officer_id := r.officer_id;
    patrol_zone := r.patrol_zone;
    state := r.state;
    x := v_cur_x;
    y := v_cur_y;
    start_x := r.start_x;
    start_y := r.start_y;
    target_x := r.target_x;
    target_y := r.target_y;
    facing := r.facing;
    segment_started_at_ms := floor(extract(epoch FROM r.segment_started_at) * 1000.0)::bigint;
    segment_duration_ms := r.segment_duration_ms;
    chase_until_ms := CASE
      WHEN r.chase_until IS NULL THEN NULL
      ELSE floor(extract(epoch FROM r.chase_until) * 1000.0)::bigint
    END;
    server_now_ms := v_now_ms;
    RETURN NEXT;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_world_police(text, jsonb) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.report_world_police_chase(
  p_map_id text,
  p_officer_id text,
  p_target_x double precision,
  p_target_y double precision,
  p_player_id text,
  p_duration_ms integer DEFAULT 6000
)
RETURNS TABLE(
  officer_id text,
  patrol_zone text,
  state text,
  x double precision,
  y double precision,
  start_x double precision,
  start_y double precision,
  target_x double precision,
  target_y double precision,
  facing text,
  segment_started_at_ms bigint,
  segment_duration_ms integer,
  chase_until_ms bigint,
  server_now_ms bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_now_ms bigint;
  r public.world_police_officers%ROWTYPE;
  v_elapsed_ms double precision;
  v_t double precision;
  v_cur_x double precision;
  v_cur_y double precision;
  v_dx double precision;
  v_dy double precision;
  v_dist double precision;
  v_chase_ms integer;
  v_seg_dur integer;
  v_face text;
BEGIN
  IF p_map_id NOT IN ('vietnam', 'japan') THEN
    RETURN;
  END IF;
  IF p_target_x IS NULL OR p_target_y IS NULL
     OR NOT (p_target_x BETWEEN 0 AND 20000)
     OR NOT (p_target_y BETWEEN 0 AND 20000) THEN
    RETURN;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('world_police:' || p_map_id));

  v_now := clock_timestamp();
  v_now_ms := floor(extract(epoch FROM v_now) * 1000.0)::bigint;

  SELECT *
  INTO r
  FROM public.world_police_officers AS w
  WHERE w.map_id = p_map_id AND w.officer_id = p_officer_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_elapsed_ms := GREATEST(0.0, extract(epoch FROM (v_now - r.segment_started_at)) * 1000.0);
  v_t := CASE
    WHEN r.segment_duration_ms <= 0 THEN 1.0
    ELSE LEAST(1.0, v_elapsed_ms / r.segment_duration_ms)
  END;
  v_cur_x := r.start_x + (r.target_x - r.start_x) * v_t;
  v_cur_y := r.start_y + (r.target_y - r.start_y) * v_t;

  v_dx := p_target_x - v_cur_x;
  v_dy := p_target_y - v_cur_y;
  v_dist := sqrt(v_dx * v_dx + v_dy * v_dy);
  IF v_dist > 650.0 THEN
    RETURN;
  END IF;

  v_chase_ms := LEAST(12000, GREATEST(2000, COALESCE(p_duration_ms, 6000)));
  v_seg_dur := GREATEST(350, LEAST(9000, round((v_dist / GREATEST(40.0, r.chase_speed)) * 1000.0)::integer));
  v_face := CASE
    WHEN v_dist < 1.0 THEN r.facing
    WHEN abs(v_dx) > abs(v_dy) THEN CASE WHEN v_dx >= 0 THEN 'right' ELSE 'left' END
    ELSE CASE WHEN v_dy >= 0 THEN 'down' ELSE 'up' END
  END;

  UPDATE public.world_police_officers AS w
  SET state = 'chase',
      start_x = v_cur_x,
      start_y = v_cur_y,
      target_x = p_target_x,
      target_y = p_target_y,
      facing = v_face,
      segment_started_at = v_now,
      segment_duration_ms = v_seg_dur,
      chase_target_player_id = NULLIF(left(COALESCE(p_player_id, ''), 96), ''),
      chase_until = v_now + make_interval(secs => (v_chase_ms / 1000.0)::double precision),
      updated_at = v_now
  WHERE w.map_id = p_map_id AND w.officer_id = p_officer_id
  RETURNING * INTO r;

  officer_id := r.officer_id;
  patrol_zone := r.patrol_zone;
  state := r.state;
  x := v_cur_x;
  y := v_cur_y;
  start_x := r.start_x;
  start_y := r.start_y;
  target_x := r.target_x;
  target_y := r.target_y;
  facing := r.facing;
  segment_started_at_ms := floor(extract(epoch FROM r.segment_started_at) * 1000.0)::bigint;
  segment_duration_ms := r.segment_duration_ms;
  chase_until_ms := CASE
    WHEN r.chase_until IS NULL THEN NULL
    ELSE floor(extract(epoch FROM r.chase_until) * 1000.0)::bigint
  END;
  server_now_ms := v_now_ms;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.report_world_police_chase(text, text, double precision, double precision, text, integer) TO anon, authenticated;
