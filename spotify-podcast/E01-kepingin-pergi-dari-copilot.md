# E01 — Kepingin Pergi dari Copilot
**Estimated duration:** 6–8 min
**Tags:** copilot, privacy, AI tooling
**Post(s) referenced:** `2026-05-13-why-i-left-github-copilot.md`

---

Hi, everyone. Today, gw mau lanjut bahas soal GitHub Copilot dan kenapa gue memutuskan untuk berhenti menggunakannya.

Jadi gini kronologinya.

Suatu hari gue scroll-scroll notifikasi GitHub. Sore Selasa yang biasa. Terus gue lihat announcement yang dikubur di changelog. GitHub bilang — mulai April 2026, Copilot bakal pakai prompt lo buat training model mereka.

Not opt-in. Bukan checkbox yang lo pilih sendiri. Default-nya ON. Unless lo notice dan matikin sendiri.

Lo bayangin nggak? Lo udah pake alat itu berbulan-bulan. Lo nulis code. Lo minta tolong Copilot generate sesuatu. Dan tiba-tiba mereka bilang — "Oh iya, semua yang lo ketik itu sekarang jadi bahan latihan model kita."

Lo nggak dikasih tau duluan. Lo nggak diminta izin.

Lima menit. Dalam lima menit, trust itu pecah.

Dan once broken, lo nggak bisa balikin.

---

Copilot sendiri bukan alat yang jelek. Suggestions-nya oke. Latency-nya fine. Gue udah toleransi telemetry dari awal — every AI tool collects something, kan? Tapi ini beda. Ini bukan telemetry. Ini training data. Dan pas announcement itu turun, nggak ada jawaban jelas — apa yang terjadi sama prompt history? Apa yang dimaksud "non-public code"? Gimana cara verify?

Trust deficit-nya udah ada sebelum announcement. Sesudah announcement? Gue nggak bisa justify lagi.

Ada beberapa hal yang bikin gue ngerasa trapped sama Copilot.

**First — locked to one provider.** Copilot ngarah ke satu model aja. Prompt lo ke Microsoft. Lo dapat completions. Lo nggak bisa swap ke model lain. Mau coba yang lebih fast, lebih cheap, lebih cocok buat task tertentu? Nggak bisa. Model lagi bad day? Lo punya bad day juga. Itu deal-nya.

**Second — opaque about data use.** Privacy policy-nya kayak maze. Before the announcement, gue udah nggak trust. After, gue nggak bisa justify sama diri sendiri.

**Third — expensive for what it offered.** Subscription cost-nya nggak gede-gede banget, tapi bundled sama service yang rate-limit gue, nggak bisa pake own API keys, dan sekarang mau data lo juga. Lo bayar buat jadi product.

Yang paling nyesek? Lo helpless. Black box. Lo nggak bisa lihat daleman. Lo nggak bisa modify. Lo nggak bisa fork. If the provider changes the terms — and they will — satu-satunya langkah lo ya accept or walk. That's not ownership. It's tenancy.

---

Ada satu moment yang bikin gue beneran decide buat pergi.

Late-night debugging session. Copilot keep suggesting approach yang sama — pattern yang outdated, baked into training-nya. Lo nggak bisa swap model. Lo nggak bisa see apa yang ngaruh ke suggestions. Lo nggak bisa turn off completion dan inject different one tanpa keluar dari editor.

That was the moment gue sadar — problem-nya bukan quality of suggestions. Problem-nya adalah whole workflow gue tergantung sama keputusan orang lain.

Gue sempet mau stay. Convenience-nya real. Copilot insert itself ke VS Code seamlessly. No config files. No routing decisions. No API keys to manage. Leaving means give that up dan build something sendiri.

Tapi the privacy change wasn't going to revert. Dan gue tau polanya — once a provider trains on user data, they don't un-train. Decision itu locked in before gue ever see the announcement.

Gue mulai cari alternatif. Banyak option, tapi semuanya punya DNA yang sama: proprietary, opaque, subscription-based. Better or worse di suggesting code, sure — but still a black box where lo pay dan they decide.

The moment gue realize alternatif nggak ada dalam bentuk yang gue mau, that's also the moment gue realize gue harus build it sendiri.

---

Jadi ya — gue nggak tinggalin Copilot karena dia berhenti bekerja. Gue tinggalin karena gue berhenti trust dia.

Dan dari situ, semuanya mulai.

Lo mau tau apa yang terjadi setelah ini? Apa yang gue temuin sebagai penggantinya? That's a story for another time.

Okay, that's all for now. Have a good day.
