# E03 — 9router: Apa yang Saya Ubah
**Estimated duration:** 6–8 min
**Tags:** 9router, AI router, monorepo
**Post(s) referenced:** `2026-06-10-the-router-my-colleague-showed-me.md`, `2026-06-17-what-i-changed-in-9router.md`

---

Hi, everyone. Today, gw mau lanjut bahas soal 9router dan alasan mengapa saya memutuskan untuk memodifikasinya secara mendalam.

Jadi gini. Semuanya dimulai dari rekan kerja gue. Suatu hari gue liat mereka buka dashboard yang gue nggak kenal. Dropdown dengan banyak provider AI. Lebih banyak dari yang gue pernah lihat. Gue nggak nanya langsung. Cuma gue file-in aja di kepala: "ini apa ya."

Namanya 9router.

Gue klik repo GitHub-nya. Baca README. Screenshot. Dashboard dengan 40+ provider dalam satu dropdown. Fallback chains. Format translation. Token compression.

First thought gue: "Ini kebanyakan."

Gue udah punya OpenCode. It worked. Tapi gue juga udah tiga minggu masuk billing cycle dan nge-hit rate limit. Itu bukan masalah tooling. Itu masalah subscription. Gue bisa hidup dengan itu.

Gue tutup tab. Balik ke auth bug.

---

Seminggu kemudian, itu terjadi lagi. Jam satu malam. Ada deploy nunggu. OpenCode Go nge-hit cap bulanannya. Gue nunggu rate limit error, mikir berapa banyak kerjaan yang masih nunggu.

Dan waktu itu, gue inget: fallback providers itu ada. Mereka ada di account settings. List of free tier options yang gue nggak pernah configure. Gue selama ini anggap mereka lelucon — backup buat emergency.

When lo hit paid subscription limit tiga minggu ke dalam bulan, punya fallback providers itu bukan pilihan. Itu bedanya antara shipping feature atau nunggu tanggal reset.

Malam itu juga gue balik ke repo 9router. Baca lagi. Lebih pelan.

40+ providers nggak lagi keliatan kayak noise. Mereka keliatan kayak redundancy.

Format translation — yang nge-convert antara OpenAI, Anthropic, dan provider baru yang muncul minggu itu — mulai keliatan kayak hal yang selama ini gue manual copy-paste prompt buat work around.

The overload yang gue rasa sebelumnya bukan complexity buat dirinya sendiri. Itu hal yang gue nggak tau gue butuh — sampai gue beneran butuh.

Gue fork repo itu akhir minggu itu juga.

---

Dan gue nggak bisa berhenti.

Yang pertama gue benerin: monorepo split. 9router awalnya monolith Next.js — dashboard, routing engine, CLI, semua dalam satu blob. Setiap perubahan berarti nunggu Next.js recompile. Gue pisahin: API server dapat workspace sendiri, dashboard workspace sendiri, CLI dapat esbuild bundling.

Hasilnya? `npm install` yang biasanya 30 detik jadi 4 detik. Folder `node_modules` yang biasanya 200MB jadi 2.5MB. Server start yang biasanya 15 detik jadi 200 milidetik.

Gue duduk sebentar, surprise gitu — gue udah siap-siap buat heavy dev loop, dapat sesuatu yang hampir empty.

Tapi split itu cuma starting point. Daily use ngajarin gue apa yang router itu beneran butuh.

**Tiered fallback.** Ini bukan nice-to-have. Gue discover ini jam 1 pagi pas production incident — provider utama kena rate limit, dan fallback chain langsung ambil request berikutnya tanpa pause. 9router nge-chain providers dalam tier: subscription accounts dulu, terus cheap APIs, terus free ones. Ketika paid provider bilang nggak, tier berikutnya yang angkat. No retry spinner. No waiting.

**Multiple accounts per provider.** Satu akun itu single point of failure. 9router support round-robin dengan sticky sessions — requests nempel ke satu akun sampai configurable limit, terus rotate. Kalau akun kena rate limit di level model, di-skip otomatis.

**Token compression.** Ini kayak nemu duit. RTK saver nge-compress konten `tool_result` di server-side — 20 sampai 40 persen lebih sedikit token per request. Transparent. Agent-nya nggak pernah tau. Bill-nya cuma ngecil.

**OAuth tokens expire mid-session.** 9router handle proactive refresh — sebelum tiap request, dia cek credentials yang mau expired dan refresh. Ini bunuh failure mode yang selama ini diam-diam buang waktu gue.

Terus ada combo system. Routing config hidup di satu file JSON. Named model tiers dengan fallback strategy spesifik. Lo nambah model alias ke combo, dia ikut rotation. No code changes.

Gue nggak plan semua ini. Tiap perubahan datang dari kegagalan spesifik — rate limit tengah malam, startup lambat tiap edit, token expired pas request, akun terkunci pas deploy Jumat sore. Router-nya jadi apa yang kegagalan-kegagalan itu minta.

---

Ada satu hal yang gue belum cerita: semua infrastruktur ini harus bisa diakses dari luar.

9router jalan di mesin gue. Tapi ada alat lain — Warp, Oz agents — yang nggak bisa liat localhost. Mereka butuh public endpoint. Butuh tunnel.

Lo tau apa itu tunnel? Bayangin jalan rahasia dari internet ke laptop lo. It's one of the best stories in this whole journey.

Okay, that's all for now. Have a good day.
