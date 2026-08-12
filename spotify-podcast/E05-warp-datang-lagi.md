# E05 — Warp Datang Lagi
**Estimated duration:** 6–8 min
**Tags:** warp, oz, ADE, orchestration
**Post(s) referenced:** `2026-05-20-warp-tried-to-sell-me-ai.md`, `2026-07-01-warp-came-back-around.md`

---

Hi, everyone. Today, gw mau lanjut bahas soal kembalinya Warp ke dalam workflow saya dan bagaimana mereka berevolusi menjadi Agentic Development Environment (ADE).

Gue download. Langsung ke AI assistant. Inline completions sebelum gue selesai ngetik. Natural language buat command `find` sama `awk` yang nggak pernah bisa gue hafalin. Assistant bisa explain errors, rewrite commands, write little scripts. Nice.

Terus gue buka pricing page.

AI features butuh plan berbayar — Build plan, $20 per bulan, di luar subscription lain yang udah gue punya.

Gue close settings panel dan duduk dengan kecewa.

Bukan nominalnya — dua puluh buck itu makan siang. Tapi polanya. Pergi dari AI subscription, nemu AI subscription baru. GitHub trained on user data. Copilot bundled di subscription yang ada. Warp mau subscription lagi buat AI di terminal.

Same model. Different package.

Gue uninstall malam itu juga. Nggak marah — capek. Capek disuruh bayar AI sebagai subscription. Capek setiap alat jadi platform dengan pricing tiers. Capek development environment gue jadi revenue stream orang lain.

Di saat itu, gue cuma lihat subscription lain.

---

Tapi bulan-bulan berikutnya, sesuatu berubah.

Warp announce Warp 2.0 — Agentic Development Environment. Messaging-nya beda. Bukan lagi "terminal yang lebih pintar." Mereka bangun platform di mana agents jadi first-class citizens. Custom OpenAI-compatible providers. Child agent orchestration. MCP integration.

Beberapa bulan kemudian, Oz launch — orchestration platform-nya. `run_agents` primitive. Cloud environments. Audit trails.

Warp lagi-lagi bikin apa yang gue cobain sendiri waktu di OpenCode — native orchestration, bukan bolt-on.

Gue surprised. Sedikit frustrated kenapa nggak ngeh. Tapi mostly — gue curious. Apa yang berubah?

Dua hal yang bikin gue balik.

**Pertama — custom provider support.** Warp nggak locked ke AI mereka sendiri. Lo bisa point ke OpenAI-compatible endpoint manapun — termasuk 9router gue. Custom fork dengan tiered fallback, token compression, seluruh cost architecture gue. Warp handle orchestration. 9router handle routing.

**Kedua — native orchestration.** `run_agents` primitive. Bukan bolt-on protocol di atas tool system — ini runtime first-class di mana lead agent spawn children, message them, collect results, re-delegate. Ini apa yang `/delegate` coba jadi, tanpa batas sequential chain.

Gue migrate agent system yang udah gue bangun di OpenCode. Role definitions. Delegation Gate rules. Session onboarding protocol. Worktree conventions — semua survive. Mereka hidup di satu file yang bisa dishare antar alat. Model-nya tool-agnostic.

Yang pertama kali gue run `run_agents` dengan empat child agents fan out secara parallel, masing-masing nge-hit provider berbeda lewat fallback chain 9router — itu momen di mana seluruh stack finally clicked.

Bukan chatbot yang lebih pintar. Coordinator yang bisa parallelize.

---

Ada satu catch. Oz agents jalan di isolated context — nggak bisa reach localhost. Buat connect Warp ke 9router, gue butuh public HTTPS endpoint. That meant tunnel.

Ceritanya gini — gue udah bangun jalan rahasia dari internet ke laptop gue. Tunnel.

Alurnya: Warp agent hit `https://api.mydomain.com`, Cloudflare route lewat encrypted tunnel ke `cloudflared` di mesin gue, which forward ke 9router server di `localhost:20128`. Agent nggak pernah tau tunnel-nya ada.

Hasilnya? Sebelum tunnel, gue hedging — run prompt dua kali. Sekali di IDE, sekali locally. Burn API credits buat iteration. Setelah tunnel, setiap request nge-hit local server gue. Sub-millisecond latency. Zero per-call cost.

Cost economics-nya yang nge-seal deal.

Warp orchestration itu free — Free plan include BYOK, jadi setiap request nge-hit 9router endpoint gue tanpa charge per-call dari Warp. Cost gue cuma $10 per bulan buat OpenCode Go, ditambah yearly domain invoice. Free providers handle fallback layers lewat 9router.

Gue tinggalin Warp pertama kali karena keliatan kayak AI subscription lain yang locked-in. Gue balik karena mereka udah bangun platform yang selama ini gue hack sendiri.

Okay, that's all for now. Have a good day.
