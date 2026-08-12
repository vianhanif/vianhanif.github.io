# E08 — Buka PR Open Source
**Estimated duration:** 6–8 min
**Tags:** open-source, 9router, workflow
**Post(s) referenced:** `2026-08-13-my-first-open-source-prs.md`

---

Hi, everyone. Today, gw mau lanjut bahas soal pengalaman pertama saya berkontribusi dalam pull request di proyek open source.

Jadi gini. Gue udah nulis software profesional bertahun-tahun. Tapi kontribusi ke open source yang beneran? Belum pernah.

Kenapa? Bukan karena nggak mau. Karena nggak pernah nemu jalan yang pas.

---

Awalnya bukan fitur gue sendiri yang gue contribute. Ini yang menarik.

Seseorang — bloodf — udah bangun MCP Gateway dashboard buat 9router. UI buat ngatur MCP server instances dan gateway keys. Dia mau merge upstream. Gue tawarin bantuan buat bikin itu happen.

Gue nggak bangun fiturnya. Gue bantuin karya orang lain biar bisa di-merge.

Dan disitu gue belajar apa kontribusi sebenernya butuh.

It's not "find issue, write code, profit." It's integration.

Fiturnya jalan bagus sendiri. Tapi reconciling sama state upstream — itu tempat hal-hal pecah dengan cara yang nggak keliatan sampai lo coba fit.

Contoh konkret: grant normalization fix. Gateway keys punya grants — MCP instances mana yang bisa diakses sebuah key. Persistence layer-nya sometimes nyimpen grants sebagai full objects, sometimes sebagai string IDs, tergantung code path mana yang nulis. Everything worked until a key saved by one path got loaded by the other. Fix-nya small — normalize grants to string IDs on both load and save. Small diff. Days of tracing buat nemu.

Waktu bantuin itu, gue terus nemu seams yang lebih kecil di upstream sendiri — hal-hal yang nyenggol cara gue pake sehari-hari.

Tiap seam jadi PR masing-masing. Semua bukan fitur yang gue plan buat dibangun. Mereka gaps antara yang ada dan yang jalan.

---

Nah, soal realitas antrian.

Sekarang gue punya empat PR terbuka di upstream queue. Ditambah dua di bloodf's fork.

Nol di-merge.

Gue pengen bilang ini fine dan gue peace dengan itu. Honestly? Campuran. Maybe maintainer-nya sibuk. Maybe sebagian PR nggak match arah project dan bakal nongkrong di sana atau di-close. Itu kemungkinan nyata yang harus gue terima.

Tapi gue belajar lebih banyak dari proses ngasi PR siap — nge-trace compatibility gaps, re-evaluate patch gue lawan upstream progress, nulis deskripsi yang bisa di-review sama maintainer — dari pada kalau satu langsung di-merge.

---

Mungkin waktu lo baca ini, satu udah di-merge. Kalau nggak, mungkin ada pelajaran lagi di review queue.

Dulu gue pikir kontribusi itu soal nulis kode. Sekarang gue tau itu mulai dari pemahaman — project-nya, arah maintainer, kerjaan yang udah ada — dan baru ngasi perubahan yang fit.

Itu bagian yang nggak gue pahami sebelum gue coba.

Okay, that's all for now. Have a good day.
