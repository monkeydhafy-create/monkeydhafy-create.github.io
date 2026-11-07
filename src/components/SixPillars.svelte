<script lang="ts">
  import { Layers, Zap, RefreshCw, Shield, PiggyBank, Eye } from '@lucide/svelte';

  const pillars = [
    {
      id: '01',
      name: 'Scalability',
      icon: Layers,
      color: 'emerald',
      desc: 'Khả năng mở rộng ngang/dọc, xử lý hàng triệu user thông qua kiến trúc phân tán, lock-free concurrency và DBOS partitioned steps.'
    },
    {
      id: '02',
      name: 'Low Latency Performance',
      icon: Zap,
      color: 'sky',
      desc: 'Tối ưu độ trễ P99 < 15ms. Giảm thiểu cấp phát bộ nhớ (allocation reduction), zero-copy buffer pooling và pprof profiling liên tục.'
    },
    {
      id: '03',
      name: 'Durable Reliability',
      icon: RefreshCw,
      color: 'purple',
      desc: 'Đảm bảo tự phục hồi (Self-healing). Workflow bền vững tự động khôi phục đúng bước đang chạy dở khi server gặp sự cố hoặc restart.'
    },
    {
      id: '04',
      name: 'Zero-Trust Security',
      icon: Shield,
      color: 'rose',
      desc: 'Bảo mật đa lớp Cloudflare 6-phase pipeline, phân tách ranh giới tin cậy (trust boundary), SAST audit và quản lý bí mật zero-leak.'
    },
    {
      id: '05',
      name: 'Cost-Efficiency (TCO)',
      icon: PiggyBank,
      color: 'amber',
      desc: 'Tối ưu tổng chi phí sở hữu. Khai thác static edge hosting, on-demand media rendering và serverless queries để triệt tiêu lãng phí cloud.'
    },
    {
      id: '06',
      name: 'Deep Observability',
      icon: Eye,
      color: 'teal',
      desc: 'Giám sát toàn diện với structured logging (slog), OpenTelemetry distributed tracing và Prometheus metrics theo dõi sức khỏe hệ thống thời gian thực.'
    }
  ];
</script>

<section id="architecture" class="py-20 bg-slate-900/30 border-t border-slate-800/80 relative">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    
    <div class="text-center max-w-2xl mx-auto mb-16">
      <span class="text-emerald-400 text-xs font-mono font-semibold uppercase tracking-wider">Engineering Principles</span>
      <h2 class="text-3xl sm:text-4xl font-bold text-white mt-1">6 Pillars of Architectural Quality</h2>
      <p class="text-slate-400 text-sm mt-3 font-normal">
        Mọi hệ thống đều được thiết kế từ Nguyên lý Cơ bản (First Principles), triệt tiêu các lớp trừu tượng thừa mứa.
      </p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each pillars as p}
        <div class="p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-[#080C14] border border-slate-800 hover:border-slate-700 transition-all duration-300 hover:-translate-y-1 group shadow-lg">
          <div class="flex items-center justify-between mb-4">
            <div class="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <p.icon class="w-5 h-5" />
            </div>
            <span class="text-xs font-mono text-slate-500 font-bold">{p.id}</span>
          </div>
          
          <h3 class="text-lg font-bold text-white mb-2 tracking-tight group-hover:text-emerald-400 transition-colors">
            {p.name}
          </h3>
          
          <p class="text-slate-400 text-xs sm:text-sm leading-relaxed">
            {p.desc}
          </p>
        </div>
      {/each}
    </div>

  </div>
</section>
