# E02 — Nyasar ke Terminal
**Estimated duration:** 6–8 min
**Tags:** opencode, tooling, TUI
**Post(s) referenced:** `2026-05-27-opencode-ten-bucks.md`, `2026-06-03-tools-i-built-around-opencode.md`

---

Hi, everyone. Today, gw mau lanjut bahas soal pengalaman gue menggunakan OpenCode sebagai AI assistant dan mengapa saya akhirnya mencari alternatif lain.

Jadi gini. Setelah tinggalin Copilot, gue langsung ke yang lain. Ada satu alat yang harganya $10 per bulan — namanya OpenCode. Mereka punya tier gratis dan tier berbayar; yang berbayar namanya OpenCode Go.

Ketika Go-nya jalan, it's great. Fast models. Responsive CLI. Solid output. Lo lupa lo lagi bayar per bulan.

Then — tiga minggu ke dalam billing cycle — spinner berhenti. Rate limit exceeded.

Setiap bulan. Kayak jam. Tiga minggu ke dalam bulan, rate limit nge-hit. Lo stuck antara squeeze lewat free tier atau debat upgrade yang lo nggak butuh.

---

OpenCode itu bentuknya TUI — Terminal User Interface. Full-screen. Kayak aplikasi desktop tapi jalan di terminal. Menu. Panel. Focus modes. Editor integrations. Semua dirender dalam layer immersive itu.

Keren di demo. Tapi ada masalah.

Setiap kali lo tab ke OpenCode, lo ninggalin shell environment lo. Tmux sessions — gone. Running servers — gone. Terminal history — gone. Lo butuh model bantu cek log file, dan tiba-tiba lo context-switch antara dua UI paradigm. The TUI wrapped the AI but walled off everything else.

Ada moment spesifik yang bikin gue realize ini problem.

Gue debugging production issue. Empat pane tmux terbuka — logs, metrics, codebase. Lo butuh bantuan model buat trace sebuah code path. Lo tab ke OpenCode, dan semuanya ilang. Logs. Metrics. Context yang lo udah bangun. Lo harus describe apa yang lo bisa lihat di pane yang baru aja lo close. Modelnya nggak bisa liat running processes yang ada di sebelahnya.

I felt trapped. The best coding AI gue pernah pake butuh gue untuk step out dari environment buat reach dia.

---

Nah, karena OpenCode punya batas ini, gue mulai bangun alat sendiri di sekitarnya.

**Yang pertama — opencode-tree.** Bikin isolated git worktrees dengan dedicated tmux sessions. Tiap project dapet workspace sendiri, dependencies sendiri, terminal layout sendiri. Theory-nya clean. Practice-nya? Naming tmux sessions, remember window layouts, manage panes. Isolation-nya work. Cognitive overhead-nya nggak. Gue abandon setelah dua minggu.

**Yang kedua — opencode-environment-bootstrap.** Ini solve problem yang sebaliknya. Ini automate workstation provisioning. Setiap kali teammate baru join atau gue add alat baru, gue harus jalanin setup yang sama. Install ini, clone itu, configure credentials. Bootstrap script ini automate semuanya. A single `curl | bash` provision complete workstation. Lo bisa kirim satu link di Slack dan mereka ready dalam lima menit. Ini survived. Still in use today.

**Yang ketiga — ini yang utama — `/delegate`.**

Lo bisa specify agent types — planner, coder, reviewer, tester, analyzer, brain. Lo bisa chain mereka dengan dependency. Lo bisa fan out independent tasks. Lo bisa collect results dan inject ke downstream agents. Ada empat confirmations sebelum subagent launch. Gue paranoid soal runaway agents, dan gue beneran harus paranoid.

First time gue run four-agent chain dan watch it complete without intervention — gue ngerasa relief yang nggak gue expect. The system worked. It was janky. Bolt-on. Held together by annotation parsing. But it worked.

---

Tapi — ada batas keras.

**TUI wall.** Every time lo mau delegate, lo harus leave shell lo. Terminal. OpenCode. Terminal. Context switch setiap kali.

**Sequential chain.** `/delegate` bisa fan out work, tapi once subagent finished, parent punya exactly one shot buat process result. No re-iteration. No asking for clarification. The flow was emit, receive, continue. Linearity baked into the architecture.

**No native orchestration.** DAG execution itu di-emulate — graph yang gue build dan traverse inside custom command handler. No lifecycle management. No inter-agent messaging. No shared state that survived the transaction.

Gue hidup dengan dinding-dinding ini selama berbulan-bulan. Ecosystem-nya prove sesuatu yang penting: multi-agent orchestration was possible and it was powerful. Tapi juga prove bahwa tool yang gue bangun di atas butuh fundamental changes yang gue nggak bisa buat dari luar.

Gue terus mau alat yang beda. Yang nggak bikin gue step out dari environment. Yang bisa operate alongside everything else, nggak take over the screen.

Gue nggak tau bahwa jawaban itu udah ada — dan datang dari arah yang gue nggak expect. That's a story for another time.

Okay, that's all for now. Have a good day.
