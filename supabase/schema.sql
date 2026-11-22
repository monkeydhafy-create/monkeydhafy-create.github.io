-- ============================================================================
-- ENGBBQ Open World — Supabase Client-Auth + RLS + 50 CCU Shared World Schema
-- Chạy script này trong Supabase SQL Editor (Dashboard -> SQL Editor -> New query)
-- ============================================================================

-- 1. Trạng thái sống & vị trí thời gian thực của từng tài khoản
CREATE TABLE IF NOT EXISTS public.player_live_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  map_id text NOT NULL DEFAULT 'vietnam',
  x double precision NOT NULL DEFAULT 936,
  y double precision NOT NULL DEFAULT 2136,
  facing text NOT NULL DEFAULT 'down',
  is_moving boolean NOT NULL DEFAULT false,
  hp real NOT NULL DEFAULT 100,
  hunger real NOT NULL DEFAULT 100,
  stamina real NOT NULL DEFAULT 100,
  body_temp_c real NOT NULL DEFAULT 36.8,
  skin_id text NOT NULL DEFAULT 'samurai_blue',
  gender text NOT NULL DEFAULT 'male',
  hair_id text NOT NULL DEFAULT 'hair_short_dark',
  equipped_pet_id text,
  session_id text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Kho đồ, Safebox, Trang bị, Nhà, Thú cưng, Nhiệm vụ, Danh vọng của từng tài khoản
CREATE TABLE IF NOT EXISTS public.player_saves (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  save_json jsonb NOT NULL,
  seq bigint NOT NULL DEFAULT 1,
  last_session_id text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Rương đồ & Tòa nhà dùng chung toàn thế giới (Atomic Anti-Dupe)
CREATE TABLE IF NOT EXISTS public.world_containers (
  map_id text NOT NULL,
  container_id text NOT NULL,
  title text NOT NULL DEFAULT '',
  source_type text NOT NULL DEFAULT 'chest_wooden',
  biome text NOT NULL DEFAULT 'city',
  zone text NOT NULL DEFAULT 'yellow',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  opened_at timestamptz NOT NULL DEFAULT now(),
  refresh_at timestamptz NOT NULL DEFAULT now(),
  state_version bigint NOT NULL DEFAULT 1,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (map_id, container_id)
);

CREATE INDEX IF NOT EXISTS idx_world_containers_refresh
  ON public.world_containers (map_id, refresh_at);

-- 4. Bật Row Level Security (Client Auth)
ALTER TABLE public.player_live_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_containers ENABLE ROW LEVEL SECURITY;

-- Chính chủ mới được đọc/ghi dữ liệu cá nhân của mình
DROP POLICY IF EXISTS "live_state_owner_all" ON public.player_live_state;
CREATE POLICY "live_state_owner_all"
  ON public.player_live_state
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "player_saves_owner_all" ON public.player_saves;
CREATE POLICY "player_saves_owner_all"
  ON public.player_saves
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Rương chung: tất cả người chơi (kể cả khách) được đọc; mọi thay đổi item đi qua RPC SECURITY DEFINER
DROP POLICY IF EXISTS "world_containers_read_auth" ON public.world_containers;
CREATE POLICY "world_containers_read_auth"
  ON public.world_containers
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 5. Đồng bộ giờ server cho Cảnh sát tuần tra tất định (0 tốn message)
CREATE OR REPLACE FUNCTION public.get_server_time_ms()
RETURNS bigint
LANGUAGE sql
STABLE
AS $$
  SELECT floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint;
$$;

-- 5b. Thời gian reset điểm loot chuẩn quản lý tập trung trên DB (đã giảm thêm 30%)
CREATE OR REPLACE FUNCTION public.get_container_refresh_ms(p_source_type text)
RETURNS bigint
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
BEGIN
  CASE p_source_type
    WHEN 'trash_bin' THEN RETURN 432180; -- ~7p 12s
    WHEN 'chest_wooden' THEN RETURN 648270; -- ~10p 48s
    WHEN 'chest_royal' THEN RETURN 648270; -- ~10p 48s
    WHEN 'house_standard' THEN RETURN floor(864360 + random() * (1368570 - 864360))::bigint; -- ~14p 24s - 22p 49s
    WHEN 'house_landmark' THEN RETURN floor(1296540 + random() * (1728720 - 1296540))::bigint; -- ~21p 37s - 28p 49s
    WHEN 'house_vault' THEN RETURN floor(1296540 + random() * (1728720 - 1296540))::bigint; -- ~21p 37s - 28p 49s
    ELSE RETURN 648270;
  END CASE;
END;
$$;

-- 6. RPC mở hoặc lấy trạng thái rương chung (khóa dòng FOR UPDATE chống trùng sinh loot)
CREATE OR REPLACE FUNCTION public.claim_or_open_world_container(
  p_map_id text,
  p_container_id text,
  p_title text,
  p_source_type text,
  p_biome text,
  p_zone text,
  p_initial_items jsonb,
  p_refresh_ms bigint
)
RETURNS public.world_containers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.world_containers;
  v_now timestamptz := clock_timestamp();
  v_refresh_ms bigint := public.get_container_refresh_ms(p_source_type);
BEGIN
  IF auth.uid() IS NULL THEN
    -- Guest players share the same world containers seamlessly
    NULL;
  END IF;

  INSERT INTO public.world_containers (
    map_id, container_id, title, source_type, biome, zone,
    items, opened_at, refresh_at, state_version, updated_by, updated_at
  )
  VALUES (
    p_map_id, p_container_id, p_title, p_source_type, p_biome, p_zone,
    COALESCE(p_initial_items, '[]'::jsonb), v_now,
    v_now + (GREATEST(1000, COALESCE(v_refresh_ms, p_refresh_ms)) * interval '1 millisecond'),
    1, auth.uid(), v_now
  )
  ON CONFLICT (map_id, container_id) DO NOTHING;

  SELECT * INTO v_row
  FROM public.world_containers
  WHERE map_id = p_map_id AND container_id = p_container_id
  FOR UPDATE;

  IF v_row.refresh_at <= v_now THEN
    v_refresh_ms := public.get_container_refresh_ms(p_source_type);
    UPDATE public.world_containers
    SET
      title = p_title,
      source_type = p_source_type,
      biome = p_biome,
      zone = p_zone,
      items = COALESCE(p_initial_items, '[]'::jsonb),
      opened_at = v_now,
      refresh_at = v_now + (GREATEST(1000, COALESCE(v_refresh_ms, p_refresh_ms)) * interval '1 millisecond'),
      state_version = v_row.state_version + 1,
      updated_by = auth.uid(),
      updated_at = v_now
    WHERE map_id = p_map_id AND container_id = p_container_id
    RETURNING * INTO v_row;
  END IF;

  RETURN v_row;
END;
$$;

-- 7. RPC nhặt 1 món đồ từ rương chung (Atomic chống dupe khi 2 người bấm cùng lúc)
DROP FUNCTION IF EXISTS public.take_world_container_item(text, text, text, bigint);
CREATE OR REPLACE FUNCTION public.take_world_container_item(
  p_map_id text,
  p_container_id text,
  p_item_uid text,
  p_expected_version bigint
)
RETURNS TABLE(ok boolean, new_version bigint, taken_item jsonb, items jsonb, opened_at timestamptz, refresh_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.world_containers;
  v_taken jsonb;
  v_next_items jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    -- Guest players share the same world containers seamlessly
    NULL;
  END IF;

  SELECT * INTO v_row
  FROM public.world_containers
  WHERE map_id = p_map_id AND container_id = p_container_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0::bigint, NULL::jsonb, '[]'::jsonb, clock_timestamp(), clock_timestamp();
    RETURN;
  END IF;

  IF p_expected_version > 0 AND v_row.state_version <> p_expected_version THEN
    RETURN QUERY SELECT false, v_row.state_version, NULL::jsonb, v_row.items, v_row.opened_at, v_row.refresh_at;
    RETURN;
  END IF;

  SELECT elem INTO v_taken
  FROM jsonb_array_elements(v_row.items) AS elem
  WHERE elem->>'uid' = p_item_uid
  LIMIT 1;

  IF v_taken IS NULL THEN
    RETURN QUERY SELECT false, v_row.state_version, NULL::jsonb, v_row.items, v_row.opened_at, v_row.refresh_at;
    RETURN;
  END IF;

  SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) INTO v_next_items
  FROM jsonb_array_elements(v_row.items) AS elem
  WHERE elem->>'uid' <> p_item_uid;

  UPDATE public.world_containers
  SET
    items = v_next_items,
    state_version = v_row.state_version + 1,
    updated_by = auth.uid(),
    updated_at = clock_timestamp()
  WHERE map_id = p_map_id AND container_id = p_container_id
  RETURNING * INTO v_row;

  RETURN QUERY SELECT true, v_row.state_version, v_taken, v_row.items, v_row.opened_at, v_row.refresh_at;
END;
$$;

-- 8. RPC cất/thả 1 món đồ vào lại rương chung
DROP FUNCTION IF EXISTS public.deposit_world_container_item(text, text, jsonb, bigint);
CREATE OR REPLACE FUNCTION public.deposit_world_container_item(
  p_map_id text,
  p_container_id text,
  p_item jsonb,
  p_expected_version bigint
)
RETURNS TABLE(ok boolean, new_version bigint, items jsonb, opened_at timestamptz, refresh_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.world_containers;
  v_next_items jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    -- Guest players share the same world containers seamlessly
    NULL;
  END IF;

  SELECT * INTO v_row
  FROM public.world_containers
  WHERE map_id = p_map_id AND container_id = p_container_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0::bigint, '[]'::jsonb, clock_timestamp(), clock_timestamp();
    RETURN;
  END IF;

  IF p_expected_version > 0 AND v_row.state_version <> p_expected_version THEN
    RETURN QUERY SELECT false, v_row.state_version, v_row.items, v_row.opened_at, v_row.refresh_at;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_row.items) AS elem
    WHERE elem->>'uid' = p_item->>'uid'
  ) THEN
    RETURN QUERY SELECT false, v_row.state_version, v_row.items, v_row.opened_at, v_row.refresh_at;
    RETURN;
  END IF;

  v_next_items := v_row.items || jsonb_build_array(p_item);

  UPDATE public.world_containers
  SET
    items = v_next_items,
    state_version = v_row.state_version + 1,
    updated_by = auth.uid(),
    updated_at = clock_timestamp()
  WHERE map_id = p_map_id AND container_id = p_container_id
  RETURNING * INTO v_row;

  RETURN QUERY SELECT true, v_row.state_version, v_row.items, v_row.opened_at, v_row.refresh_at;
END;
$$;

-- 8b. RPC di chuyển / xoay vị trí 1 món đồ bên trong rương chung
DROP FUNCTION IF EXISTS public.move_world_container_item(text, text, text, integer, integer, boolean, bigint);
CREATE OR REPLACE FUNCTION public.move_world_container_item(
  p_map_id text,
  p_container_id text,
  p_item_uid text,
  p_x integer,
  p_y integer,
  p_rotated boolean,
  p_expected_version bigint
)
RETURNS TABLE(ok boolean, new_version bigint, items jsonb, opened_at timestamptz, refresh_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.world_containers;
  v_next_items jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    -- Guest players share the same world containers seamlessly
    NULL;
  END IF;

  SELECT * INTO v_row
  FROM public.world_containers
  WHERE map_id = p_map_id AND container_id = p_container_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0::bigint, '[]'::jsonb, clock_timestamp(), clock_timestamp();
    RETURN;
  END IF;

  IF p_expected_version > 0 AND v_row.state_version <> p_expected_version THEN
    RETURN QUERY SELECT false, v_row.state_version, v_row.items, v_row.opened_at, v_row.refresh_at;
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_row.items) AS elem
    WHERE elem->>'uid' = p_item_uid
  ) THEN
    RETURN QUERY SELECT false, v_row.state_version, v_row.items, v_row.opened_at, v_row.refresh_at;
    RETURN;
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      CASE
        WHEN elem->>'uid' = p_item_uid THEN
          elem || jsonb_build_object('x', p_x, 'y', p_y, 'rotated', p_rotated, 'revealed', true)
        ELSE elem
      END
    ),
    '[]'::jsonb
  ) INTO v_next_items
  FROM jsonb_array_elements(v_row.items) AS elem;

  UPDATE public.world_containers
  SET
    items = v_next_items,
    state_version = v_row.state_version + 1,
    updated_by = auth.uid(),
    updated_at = clock_timestamp()
  WHERE map_id = p_map_id AND container_id = p_container_id
  RETURNING * INTO v_row;

  RETURN QUERY SELECT true, v_row.state_version, v_row.items, v_row.opened_at, v_row.refresh_at;
END;
$$;

-- 8c. RPC đồng bộ toàn bộ điểm loot còn hạn reset theo bản đồ
CREATE OR REPLACE FUNCTION public.sync_active_world_containers(p_map_id text)
RETURNS SETOF public.world_containers
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.world_containers
  WHERE map_id = p_map_id
    AND refresh_at > clock_timestamp();
$$;

GRANT EXECUTE ON FUNCTION public.get_container_refresh_ms(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_server_time_ms() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_or_open_world_container(text, text, text, text, text, text, jsonb, bigint) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.take_world_container_item(text, text, text, bigint) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.deposit_world_container_item(text, text, jsonb, bigint) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.move_world_container_item(text, text, text, integer, integer, boolean, bigint) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_active_world_containers(text) TO anon, authenticated;

-- 9. Bật Supabase Realtime cho đồng bộ đa thiết bị & thế giới chung
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_live_state;
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_saves;
ALTER PUBLICATION supabase_realtime ADD TABLE public.world_containers;

-- ============================================================================
-- 10. Nhà Đấu Giá (Treo bán 24h, mặc định 7 slot, mở rộng qua nhiệm vụ)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.auction_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_name text NOT NULL,
  item_id text NOT NULL,
  item_data jsonb NOT NULL,
  price_gold bigint NOT NULL CHECK (price_gold > 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'cancelled', 'claimed')),
  buyer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  buyer_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  sold_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_auction_active_item
  ON public.auction_listings (status, item_id, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_auction_seller
  ON public.auction_listings (seller_id, status, created_at DESC);

ALTER TABLE public.auction_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auction_read_active_or_own" ON public.auction_listings;
CREATE POLICY "auction_read_active_or_own"
  ON public.auction_listings
  FOR SELECT
  TO authenticated
  USING (
    (status = 'active' AND expires_at > clock_timestamp())
    OR seller_id = auth.uid()
    OR buyer_id = auth.uid()
  );

-- RPC treo vật phẩm lên Nhà Đấu Giá trong 24h
CREATE OR REPLACE FUNCTION public.create_auction_listing(
  p_seller_name text,
  p_item_id text,
  p_item_data jsonb,
  p_price_gold bigint,
  p_max_slots integer DEFAULT 7
)
RETURNS TABLE(ok boolean, message text, listing public.auction_listings)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_active_count integer;
  v_row public.auction_listings;
BEGIN
  IF v_uid IS NULL THEN
    RETURN QUERY SELECT false, 'Cần đăng nhập tài khoản Cloud để treo bán ở Nhà Đấu Giá.'::text, NULL::public.auction_listings;
    RETURN;
  END IF;

  IF p_price_gold IS NULL OR p_price_gold <= 0 THEN
    RETURN QUERY SELECT false, 'Giá bán phải lớn hơn 0 Vàng.'::text, NULL::public.auction_listings;
    RETURN;
  END IF;

  SELECT count(*)::integer INTO v_active_count
  FROM public.auction_listings
  WHERE seller_id = v_uid
    AND status = 'active'
    AND expires_at > clock_timestamp();

  IF v_active_count >= GREATEST(1, COALESCE(p_max_slots, 7)) THEN
    RETURN QUERY SELECT false, 'Đã hết slot treo bán! Hãy làm nhiệm vụ mở rộng thêm slot.'::text, NULL::public.auction_listings;
    RETURN;
  END IF;

  INSERT INTO public.auction_listings (
    seller_id, seller_name, item_id, item_data, price_gold, status, created_at, expires_at
  )
  VALUES (
    v_uid, COALESCE(NULLIF(trim(p_seller_name), ''), 'Người chơi'), p_item_id, p_item_data, p_price_gold,
    'active', clock_timestamp(), clock_timestamp() + interval '24 hours'
  )
  RETURNING * INTO v_row;

  RETURN QUERY SELECT true, 'Đã treo bán vật phẩm trong 24 giờ!'::text, v_row;
END;
$$;

-- RPC mua vật phẩm trên Nhà Đấu Giá (Atomic chống mua trùng)
CREATE OR REPLACE FUNCTION public.buy_auction_listing(
  p_listing_id uuid,
  p_buyer_name text
)
RETURNS TABLE(ok boolean, message text, price_gold bigint, item_data jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.auction_listings;
BEGIN
  IF v_uid IS NULL THEN
    RETURN QUERY SELECT false, 'Cần đăng nhập để mua đồ.'::text, 0::bigint, NULL::jsonb;
    RETURN;
  END IF;

  SELECT * INTO v_row
  FROM public.auction_listings
  WHERE id = p_listing_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Vật phẩm không tồn tại.'::text, 0::bigint, NULL::jsonb;
    RETURN;
  END IF;

  IF v_row.seller_id = v_uid THEN
    RETURN QUERY SELECT false, 'Không thể tự mua đồ của chính mình — hãy bấm Thu hồi.'::text, 0::bigint, NULL::jsonb;
    RETURN;
  END IF;

  IF v_row.status <> 'active' OR v_row.expires_at <= clock_timestamp() THEN
    RETURN QUERY SELECT false, 'Vật phẩm đã có người mua hoặc hết hạn 24h.'::text, 0::bigint, NULL::jsonb;
    RETURN;
  END IF;

  UPDATE public.auction_listings
  SET
    status = 'sold',
    buyer_id = v_uid,
    buyer_name = COALESCE(NULLIF(trim(p_buyer_name), ''), 'Người mua'),
    sold_at = clock_timestamp()
  WHERE id = p_listing_id;

  RETURN QUERY SELECT true, 'Mua thành công!'::text, v_row.price_gold, v_row.item_data;
END;
$$;

-- RPC thu hồi vật phẩm đang treo hoặc đã hết hạn 24h
CREATE OR REPLACE FUNCTION public.cancel_auction_listing(
  p_listing_id uuid
)
RETURNS TABLE(ok boolean, message text, item_data jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.auction_listings;
BEGIN
  IF v_uid IS NULL THEN
    RETURN QUERY SELECT false, 'Cần đăng nhập.'::text, NULL::jsonb;
    RETURN;
  END IF;

  SELECT * INTO v_row
  FROM public.auction_listings
  WHERE id = p_listing_id
  FOR UPDATE;

  IF NOT FOUND OR v_row.seller_id <> v_uid THEN
    RETURN QUERY SELECT false, 'Không tìm thấy tin treo bán của bạn.'::text, NULL::jsonb;
    RETURN;
  END IF;

  IF v_row.status <> 'active' THEN
    RETURN QUERY SELECT false, 'Vật phẩm đã được bán hoặc đã thu hồi trước đó.'::text, NULL::jsonb;
    RETURN;
  END IF;

  UPDATE public.auction_listings
  SET status = 'cancelled'
  WHERE id = p_listing_id;

  RETURN QUERY SELECT true, 'Đã thu hồi vật phẩm về Balo!'::text, v_row.item_data;
END;
$$;

-- RPC nhận tiền bán hàng sau khi có người mua
CREATE OR REPLACE FUNCTION public.claim_auction_proceeds(
  p_listing_id uuid
)
RETURNS TABLE(ok boolean, message text, price_gold bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.auction_listings;
BEGIN
  IF v_uid IS NULL THEN
    RETURN QUERY SELECT false, 'Cần đăng nhập.'::text, 0::bigint;
    RETURN;
  END IF;

  SELECT * INTO v_row
  FROM public.auction_listings
  WHERE id = p_listing_id
  FOR UPDATE;

  IF NOT FOUND OR v_row.seller_id <> v_uid THEN
    RETURN QUERY SELECT false, 'Không tìm thấy giao dịch.'::text, 0::bigint;
    RETURN;
  END IF;

  IF v_row.status <> 'sold' THEN
    RETURN QUERY SELECT false, 'Giao dịch chưa bán hoặc đã nhận tiền rồi.'::text, 0::bigint;
    RETURN;
  END IF;

  UPDATE public.auction_listings
  SET status = 'claimed'
  WHERE id = p_listing_id;

  RETURN QUERY SELECT true, 'Đã nhận tiền bán đấu giá!'::text, v_row.price_gold;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_auction_listing(text, text, jsonb, bigint, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.buy_auction_listing(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_auction_listing(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_auction_proceeds(uuid) TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_listings;

-- ============================================================================
-- 11. Khu Biệt Thự & Dinh Thự Vĩnh Viễn (Tách biệt theo từng map vietnam/japan + chống tranh chấp đất)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.world_estates (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  map_id text NOT NULL DEFAULT 'vietnam',
  owner_name text NOT NULL DEFAULT 'Người Chơi',
  house_id text,
  origin_c integer NOT NULL DEFAULT 13,
  origin_r integer NOT NULL DEFAULT 13,
  owned_world_tiles jsonb NOT NULL DEFAULT '[]'::jsonb,
  displayed_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, map_id)
);

CREATE INDEX IF NOT EXISTS idx_world_estates_map
  ON public.world_estates (map_id);

ALTER TABLE public.world_estates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "world_estates_read_all" ON public.world_estates;
CREATE POLICY "world_estates_read_all"
  ON public.world_estates
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "world_estates_owner_write" ON public.world_estates;
CREATE POLICY "world_estates_owner_write"
  ON public.world_estates
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.world_estates;

-- ═════════════════════════════════════════════════════════════════════════════
-- THIÊN TAI TOÀN MAP NHẬT BẢN (Động đất + Tuyết lở đồng bộ Server)
-- ═════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.world_disasters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id text NOT NULL DEFAULT 'japan',
  kind text NOT NULL DEFAULT 'earthquake_avalanche',
  hp_loss integer NOT NULL CHECK (hp_loss BETWEEN 15 AND 40),
  stamina_loss integer NOT NULL CHECK (stamina_loss BETWEEN 25 AND 60),
  triggered_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_world_disasters_map_time
  ON public.world_disasters (map_id, triggered_at DESC);

ALTER TABLE public.world_disasters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "world_disasters_read_all" ON public.world_disasters;
CREATE POLICY "world_disasters_read_all"
  ON public.world_disasters
  FOR SELECT
  TO anon, authenticated
  USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.world_disasters;

CREATE OR REPLACE FUNCTION public.poll_or_trigger_japan_disaster()
RETURNS TABLE(
  id uuid,
  map_id text,
  kind text,
  hp_loss integer,
  stamina_loss integer,
  triggered_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent public.world_disasters%ROWTYPE;
  v_kind text;
  v_hp integer;
  v_stamina integer;
BEGIN
  PERFORM pg_advisory_xact_lock(772026);

  SELECT *
  INTO v_recent
  FROM public.world_disasters wd
  WHERE wd.map_id = 'japan'
    AND wd.triggered_at > (clock_timestamp() - interval '4 minutes')
  ORDER BY wd.triggered_at DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY
    SELECT v_recent.id, v_recent.map_id, v_recent.kind, v_recent.hp_loss, v_recent.stamina_loss, v_recent.triggered_at;
    RETURN;
  END IF;

  -- Xác suất ngẫu nhiên xảy ra thiên tai Nhật Bản trên server (~18% mỗi nhịp kiểm tra)
  IF random() < 0.18 THEN
    IF random() < 0.45 THEN
      v_kind := 'island_tsunami';
      v_hp := 20 + floor(random() * 16)::integer;      -- 20..35 máu trên đảo
      v_stamina := 35 + floor(random() * 21)::integer; -- 35..55 mệt mỏi
    ELSE
      v_kind := 'earthquake_avalanche';
      v_hp := 15 + floor(random() * 16)::integer;      -- 15..30 máu
      v_stamina := 30 + floor(random() * 21)::integer; -- 30..50 mệt mỏi
    END IF;
    INSERT INTO public.world_disasters (map_id, kind, hp_loss, stamina_loss)
    VALUES ('japan', v_kind, v_hp, v_stamina)
    RETURNING * INTO v_recent;

    RETURN QUERY
    SELECT v_recent.id, v_recent.map_id, v_recent.kind, v_recent.hp_loss, v_recent.stamina_loss, v_recent.triggered_at;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.poll_or_trigger_japan_disaster() TO anon, authenticated;

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- Äá»’NG Bá»˜ Vá»Š TRÃ & TRUY ÄUá»”I Cáº¢NH SÃT SERVER-AUTHORITATIVE (WORLD POLICE SYNC)
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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
