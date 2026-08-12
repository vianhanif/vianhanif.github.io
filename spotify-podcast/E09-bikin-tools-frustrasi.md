# E09 — Bikin Tools dari Frustrasi
**Estimated duration:** 6–8 min
**Tags:** PM2Bar, multilogs, tooling, observability
**Post(s) referenced:** `2026-08-25-stop-watching-five-tabs-a-terminal-first-approach-to-k8s-logs.md`, `2026-09-05-pm2bar-native-macos-menu-bar-pm2-monitor.md`

---

Hi, everyone. Today, gw mau lanjut bahas soal dua alat kecil yang saya bangun untuk mengatasi frustrasi dalam workflow harian saya: multilogs dan PM2Bar.

---

Yang pertama, namanya multilogs. Masalahnya? "The Five-Tab Problem."

Satu request hit lima microservices. Something breaks. Lo buka lima terminal tab — `kubectl logs` di tiap tab — dan lo scan bolak-balik, nyoba nyusun timeline mental. Itu *painful*.

Stern, Loki, K9s — semuanya bagus. Tapi gue mau yang lebih simpel: ini apps gue, kasih gue semua log-nya. Dari laptop gue. Zero setup.

Awalnya cuma bash script. Spinner, scroll teks. Berantakan.
Terus gue rewrite pake Go. Parallelism, structured types, progress bars.

Setiap fiturnya datang dari incident, bukan roadmap. `-p` buat previous-container logs waktu pod restart. `-e` buat filter error. `-g` buat pattern matching.

Hasilnya? Output file yang bersih, prefix `[pod:container]`, shareable.

Yang gue pelajari? Less friction antara lo dan logs itu kuncinya. Tools yang bikin lo jauh dari goal itu yang bakal lo buang.

---

Yang kedua, PM2Bar. Masalahnya? Visibility.

Gue switched ke PM2. Bagus. Tapi tiba-tiba gue cek `pm2 list` terus-terusan. Bukan karena nggak percaya, tapi karena gue nggak dapet status yang bisa gue liat sekilas. Harus buka terminal. Harus ngetik. Harus nunggu.

Gue butuh status bar.

PM2Bar itu aplikasi native macOS menu bar. Zero Electron. Native AppKit.

Cukup liat ke menu bar, liat ikon terminal. Ijo semua? Bagus. Segitiga kuning? Ada yang error. Klik, lo liat list prosesnya, status dot, CPU, memory.

Butuh 355 baris Swift. Paling ribet? Ngebaca `pm2 list` output secara handal.

Ternyata, column alignment `pm2 list` itu bisa geser tergantung berapa lama prosesnya jalan. Parser gue yang awal rusak karena itu. Sekarang parser-nya pake keyword anchor — nyari `online`/`errored`/`stopped` baru ambil data di sekitar situ.

The result? Menu bar yang ngasih tau kesehatan server gue. Enggak perlu terminal, enggak perlu context switch.

---

Pelajaran dari kedua alat ini?

Seringkali, frustration itu clue buat tool apa yang sebenernya lo butuhin.

Gue nggak perlu dashboard K8s yang mahal buat sekedar ngintip logs. Gue nggak perlu monitoring suite lengkap buat tau server gue crash atau nggak.

Tools yang lo bikin sendiri karena frustrasi itu tools yang paling lo bakal pake. Karena mereka cuma ngelakuin satu hal, tapi ngelakuin itu dengan cara yang persis lo butuhin.

Okay, that's all for now. Have a good day.
