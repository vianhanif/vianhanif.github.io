# E06 — Ini ADE Saya
**Estimated duration:** 6–8 min
**Tags:** ADE, 9router, orchestration, personal
**Post(s) referenced:** `2026-07-08-this-is-my-ade.md`, `2026-08-20-the-server-split-that-almost-didnt-happen.md`

---

Hi, everyone. Today, gw mau lanjut bahas soal bagaimana infrastruktur yang saya bangun akhirnya menjadi sistem yang invisible dan stabil untuk kebutuhan harian saya.

Jadi gini ceritanya. Suatu hari gue nge-hit send di prompt. Spinner jalan. Dan gue mulai ngitung — udah lewat cap belum? Tiga minggu masuk billing cycle, OpenCode Go kena limit. Gue udah ke-condition buat expect error.

Spinner berhenti. Code muncul. No error.

Request-nya nge-rute lewat fallback chain 9router — dari paid subscription gue, lewat cheap API, sampai free provider. Di-compress sama proxy. Delivered dalam waktu kurang dari satu detik. Gue nggak notice provider swap. Router-nya handle silently.

Dan di saat itu, gue realize — stack gue udah jadi invisible.

Gue nggak pernah plan momen ini. Enam bulan sebelumnya gue nungguin rate limit error, frustrasi karena subscription model nge-control kapan gue bisa kerja. Gue nggak mulai dengan tujuan "bikin ADE." Gue cuma terus nge-tabrak tembok dan nge-bangun tangga.

Lama-lama, tangga-tangga itu jadi infrastruktur.

---

Butuh enam bulan buat sampai sini.

Server start dalam 200 milidetik. Config routing hidup di satu file JSON — model tiers dengan fallback strategy, token compression, multiple accounts per provider. Tunnel nge-rute lewat Cloudflare ke mesin gue. Semuanya jalan dari satu direktori, satu SQLite database. No external databases. No cloud services.

Seluruh runtime footprint muat dalam satu direktori.

Gue rebuild router dari monolith Next.js 200MB jadi CLI 2.5MB. Gue bangun tunnel pas tau Oz agents nggak bisa reach localhost. Gue migrate agent system dari bolt-on OpenCode ke native orchestration Warp. Tiap layer dibangun karena layer sebelumnya punya dinding yang nggak bisa gue tembus.

Hal-hal yang rusak? OAuth tokens expired mid-request. cloudflared crash setelah macOS sleep. Rate limits kena shared accounts. Tiap failure ngajarin gue di mana harus reinforce.

Hal-hal yang hold? Hono server nggak pernah crash. Format translation jalan diam-diam. Tunnel tahan berminggu-minggu. Orchestration dengan parallel child agents stabil. Risiko terbesar gue lupa kasih tiap child git worktree sendiri.

The reliability of the whole stack is determined by the weakest recovery path. Gue belajar itu jam 1 pagi, lebih dari sekali.

---

Tapi kemenangan sebenarnya bukan reliability. Itu interchangeability.

Gue bisa swap 9router ke Ollama besok. Ganti Warp ke Cursor minggu depan. Jalanin tunnel yang beda. Nggak ada layer lain yang peduli. Itu properti yang bikin biaya setup worth paying.

Gue estimasi udah habis 80 jam di stack ini. Dua minggu kerja, tersebar di enam bulan malam dan weekend.

Ada orang yang milih bayar $20 per bulan buat ChatGPT Plus dan nggak mikir lagi. Itu valid — subscription itu lebih murah daripada waktu mereka. Tapi setiap jam yang gue habisin di infrastruktur ngebuka capability yang subscription nggak bisa kasih: zero-cost fallback, transparent token compression, parallel agent orchestration, complete provider interchangeability.

Gue pernah denger analogi bagus: OpenCode itu appliance — works out of the box, tapi lo nggak punya apa-apa di dalemnya. Ini chassis — lo bisa swap setiap komponen.

---

Gue start dari rate limit error dan refusal buat nerima bahwa subscription harus nge-control kapan gue bisa coding. Sekarang gue ada di sini: enam posts, empat infra layers, dua tool migrations, zero subscription yang nge-lock gue.

Setiap layer milik gue. Buat di-own, di-swap, di-replace.

Dan kalau gue decide besok Warp bukan shell yang pas, atau 9router bukan router yang pas, atau gue mau pindah dari OpenAI-compatible ke Anthropic-native — nothing else breaks.

Itu ceiling yang custom ADE beliin buat lo. Bukan subscription yang lebih baik. Ceiling yang lebih baik.

Gue bakal terus ngembangin stack ini, dan ada banyak cerita setelah episode ini — error yang nggak keliatan, integrasi yang gagal diam-diam, dan pelajaran-pelajaran dari semua itu.

Tapi untuk sekarang, ini dulu. Terima kasih udah dengerin sampai sini.

Okay, that's all for now. Have a good day.
