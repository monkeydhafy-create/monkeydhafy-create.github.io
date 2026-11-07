<script lang="ts">
  import { Compass, Sparkles, Database, Terminal, Shield, Cpu, Code2 } from '@lucide/svelte';

  const specs = [
    { label: 'Dataset Corpus', val: '8.77 Triệu Đoạn', detail: 'Cover 100% 674.976 lá số (1950-2026)' },
    { label: 'Hệ thống Khẩu quyết', val: '1848 Khẩu quyết', detail: 'Chính tông Thiên Kỷ danh sư Nghê Hải Hà' },
    { label: 'Quy tắc Cách cục', val: '1100+ Cát/Hung Cách', detail: 'Tử Phủ đồng cung, Thất Sát triều đẩu...' },
    { label: 'Mô hình Suy luận', val: 'Gemini 3.8 Flash High', detail: 'Tư duy thuật số sâu, 100% âm Hán-Việt' }
  ];
</script>

<section id="tianji" class="py-20 border-t border-slate-800/80 relative">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
      
      <!-- Left Info -->
      <div class="lg:col-span-6 space-y-6">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono font-medium">
          <Compass class="w-3.5 h-3.5" />
          <span>High-Performance Computational Divination</span>
        </div>

        <h2 class="text-3xl sm:text-4xl font-bold text-white tracking-tight">
          Tử Vi Đẩu Số Chính Tông (Tianji AI)
        </h2>

        <p class="text-slate-300 text-sm sm:text-base leading-relaxed">
          Hệ thống giải đoán Tử Vi Đẩu Số cao cấp kế thừa trực tiếp hệ thống bài giảng chính tông <em class="text-white font-medium">Thiên Kỷ</em> của danh sư Nghê Hải Hà, kết hợp cùng kho tri thức khổng lồ <strong class="text-white font-medium">8,77 triệu đoạn luận giải v4.0 (56.6 GB)</strong> và các cổ tịch kinh điển (*Tử Vi Đẩu Số Toàn Thư*, *Cốt Tủy Phú*).
        </p>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {#each specs as s}
            <div class="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
              <span class="text-[11px] font-mono text-slate-400">{s.label}</span>
              <div class="text-base font-bold text-white font-mono">{s.val}</div>
              <p class="text-[10px] text-slate-500 font-mono">{s.detail}</p>
            </div>
          {/each}
        </div>

        <div class="flex flex-wrap gap-2 pt-2">
          <span class="px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-mono text-xs">TypeScript</span>
          <span class="px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-mono text-xs">AST Parser</span>
          <span class="px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-mono text-xs">Astronomical Ephemeris</span>
          <span class="px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-mono text-xs">High-Speed Binary Index</span>
        </div>
      </div>

      <!-- Right Visual: Simulated Tinh Bàn Board Matrix -->
      <div class="lg:col-span-6 p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900/80 to-[#080C14] border border-slate-800 space-y-4">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <span class="text-xs font-mono font-bold text-amber-400 flex items-center gap-2">
            <Compass class="w-4 h-4" />
            <span>Tinh Bàn Thiên Kỷ Lưu Chú (Live Simulation)</span>
          </span>
          <span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">14 Chính Tinh</span>
        </div>

        <!-- 4 Cung Tam Hợp Preview Grid -->
        <div class="grid grid-cols-2 gap-3 font-mono text-xs">
          <div class="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2">
            <div class="flex items-center justify-between text-slate-400 text-[11px]">
              <span>CUNG MỆNH (Tý)</span>
              <span class="text-emerald-400 font-bold">Thủy Nhị Cục</span>
            </div>
            <div class="text-sm font-bold text-white">Tử Vi · Thiên Phủ (Miếu)</div>
            <div class="text-[10px] text-slate-500">Tứ Hóa: Hóa Khoa · Tả Phù Hữu Bật</div>
          </div>

          <div class="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2">
            <div class="flex items-center justify-between text-slate-400 text-[11px]">
              <span>CUNG TÀI BẠCH (Thân)</span>
              <span class="text-sky-400 font-bold">Tam Hợp</span>
            </div>
            <div class="text-sm font-bold text-white">Vũ Khúc · Thiên Tướng</div>
            <div class="text-[10px] text-slate-500">Tứ Hóa: Hóa Lộc · Lộc Tồn Triều Viên</div>
          </div>

          <div class="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2">
            <div class="flex items-center justify-between text-slate-400 text-[11px]">
              <span>CUNG QUAN LỘC (Thìn)</span>
              <span class="text-purple-400 font-bold">Tam Hợp</span>
            </div>
            <div class="text-sm font-bold text-white">Liêm Trinh (Vượng)</div>
            <div class="text-[10px] text-slate-500">Tứ Hóa: Hóa Quyền · Văn Xương Văn Khúc</div>
          </div>

          <div class="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2">
            <div class="flex items-center justify-between text-slate-400 text-[11px]">
              <span>CUNG THIÊN DI (Ngọ)</span>
              <span class="text-amber-400 font-bold">Xung Chiếu</span>
            </div>
            <div class="text-sm font-bold text-white">Thất Sát (Triều Đẩu)</div>
            <div class="text-[10px] text-slate-500">Phụ Tinh: Thiên Khôi · Thiên Việt</div>
          </div>
        </div>

        <p class="text-[11px] text-slate-400 font-mono text-center pt-2">
          "Định định khí số càn khôn — Luận đoán chuẩn mực từ gốc rễ thuật số chính tông."
        </p>
      </div>

    </div>

  </div>
</section>
