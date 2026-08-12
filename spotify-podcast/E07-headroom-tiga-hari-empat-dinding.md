# E07 — Headroom: Tiga Hari, Empat Dinding
**Estimated duration:** 7–9 min
**Tags:** 9router, debugging, postmortem
**Post(s) referenced:** `2026-08-07-headroom-integration-autopsy.md`, `2026-08-09-checking-upstream-what-v0-5-50-gained-for-9router.md`, `2026-08-10-headroom-round-two.md`

---

Hi, everyone. Today, gw mau lanjut bahas soal perjuangan saya mengintegrasikan Headroom untuk optimasi token AI, dan berbagai tantangan yang saya hadapi di sepanjang prosesnya.

Headroom itu alat buat nge-compress request AI — biar token-nya irit, biaya turun. Konsepnya menarik. Gue mau banget.

Masalahnya? Butuh tiga hari buat bikin dia beneran jalan. Dan di tengah-tengahnya, gue hampir nyerah.

---

Ceritanya mulai gini.

Waktu itu gue lagi nge-maintain 9router fork gue. Gue denger upstream 9router udah ship versi baru dengan Headroom integration built in. Gue pull versi baru itu. Merge conflicts. Banyak. Fork gue udah diverged, dan reconciling upstream punya integration dengan perubahan gue itu kerjaan paling berat dari semuanya.

Gue resolve semuanya. Test. Kelihatannya jalan. Dashboard nunjukin toggle Headroom. Logs nunjukin compression events. Gue pikir gue udah kelar.

Gue nggak kelar.

Ada satu bug yang namanya silent 404. Setiap request ke endpoint compression nge-return 404. Dan 404 itu ditelan — nge-return null, di-format sebagai null, di-log sebagai null. Nggak ada error. Nggak ada warning. Just... nothing.

Gue udah build fitur yang gagal diam-diam, setiap kali, selama berminggu-minggu.

Kenapa bisa gitu? Karena satu pola yang risky tapi umum banget di kode — kalau response nggak OK, langsung return null. Anggep aja nggak pernah salah. Gitu aja.

Rupanya, endpoint yang gue panggil itu nggak exist di versi Headroom yang gue jalankan. Gue jalankan versi lama — v0.5.4 — sedangkan endpoint compression cuma ada di versi baru — v0.20.8 ke atas.

Version mismatch. Nggak ada validasi. Silent failure.

Dan pelajaran pertama dari cerita ini: read the docs before integrating. Don't assume API shapes. Dan kalau sesuatu yang harusnya ngirit duit tapi nggak ngirit — mungkin cek dulu, dia beneran jalan nggak.

---

Tapi ceritanya nggak berhenti di situ.

Tiga hari kemudian, gue nyoba lagi. Kali ini dari branch upstream yang proper. Gue harap bug-nya version mismatch lagi. Ternyata nggak. Bukan sekali pun.

Ada empat dinding.

**Dinding satu — install yang invisible.** Gue install Headroom pake pipx. Dashboard bilang nggak keinstall. Padahal install-nya real. Masalahnya, pipx install di environment terisolasi sendiri, dan dashboard cek ke interpreter Python yang beda-beda. Instalasi gue invisible buat semuanya.

**Dinding dua — PEP 668.** Dashboard punya tombol install. Dia jalanin `pip install` buat lo. Di macOS dengan Python Homebrew, itu langsung gagal: `externally-managed-environment`. Ini proteksi OS — pip nolak install ke environment sistem. Bahkan pake `--user`. Solusinya? Flag yang namanya `--break-system-packages`. Iya. "Break system packages." Gue pake itu, dengan mata terbuka, karena satu-satunya cara bikin dashboard nemu package-nya.

**Dinding tiga — binary yang nggak ada yang bisa nemuin.** Setelah keinstall dan kedetect, binary-nya nempel di folder yang nggak ada di PATH dashboard. Symlink satu baris nge-close loop-nya.

**Dinding empat — dashboard yang broken.** Headroom punya dashboard sendiri, dan 9router proxy dia di path tertentu. Rendered-nya jadi text soup — nggak ada styling. Ternyata URL aset di HTML-nya nggak ke-rewrite. Satu regex fix, semuanya beres.

Setelah tiga hari dan empat dinding? Token saver nyala. Dashboard render. Ada angka beneran yang nge-buktiin kerja: 992 requests compressed, 2.1 juta tokens saved.

Nggak life-changing money. Tapi real. Measured. Terlihat per-request.

---

Yang gue pelajari dari Headroom: bagian tersulit dari shipping sidecar bukan sidecar-nya — tapi environment detection di sekitarnya.

Semua dinding hidup di jahitan: package manager isolation, OS-level packaging policy, PATH assumptions, root-relative URLs. Masing-masing pemain ngerjain tugasnya dengan bener. Failure-nya ada di mana mereka ketemu.

Dan ada satu pelajaran yang lebih dalam: integrasi yang gagal diam-diam itu bahaya. Error 404 yang ditelan, null yang ke-passing, log yang nggak pernah dibuat — semua itu bikin fitur mati tanpa bunyi.

Kadang fix terbaik itu delete. Tapi kadang, kalau lo sabar, empat dinding itu bisa ditembus.

Okay, that's all for now. Have a good day.
