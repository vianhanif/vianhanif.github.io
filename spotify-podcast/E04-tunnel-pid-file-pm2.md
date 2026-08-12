# E04 — Tunnel, PID File, dan PM2
**Estimated duration:** 5–7 min
**Tags:** cloudflare, tunnel, pm2, process supervision
**Post(s) referenced:** `2026-06-24-the-tunnel.md`, `2026-08-15-your-pid-file-is-a-lie-what-cloudflare-tunnel-taught-me-about-process-supervision.md`

---

Hi, everyone. Today, gw mau lanjut bahas soal pentingnya infrastruktur tunnel dan proses supervision menggunakan PM2 dalam development environment saya.

---

Awalnya, gue pake cara gampang. Cloudflare Quick Tunnel. Tinggal ketik `cloudflared tunnel --url http://localhost:20128`. URL dapet. Paste. Beres.

Ternyata? URL-nya berubah setiap kali restart. Gue reboot, URL baru lagi. Gue harus update manual. Capek banget.

Solusinya, gue bikin permanen tunnel pake config file dan Cloudflare Tunnel proper. Caddy buat terminasi TLS, cloudflared buat outbound connection. No inbound ports, no NAT traversal.

Tapi tunnel ini harus tahan banting. Harus idup setelah sleep, wake, reboot, pindah WiFi. Gue pake `launchd` buat jaga tunnel tetap hidup. Satu config plist, satu command load. Permanent.

Eh, tapi ternyata, tunnel itu cuma setengah dari masalah.

---

Di saat yang sama, gue punya masalah lain. Server 9router gue, sering banget mati sendiri, dan gue nggak tau kenapa.

Gue pake cara klasik: `nohup`. Background process, PID file, shell scripts. Cara lama.

Ada dua alias yang gue pake: satu buat production, satu buat debug. Yang production pakai `nohup`. Yang debug pakai `--watch` (restart otomatis kalau ada perubahan).

Anehnya, yang debug lebih stabil. Kenapa? Ternyata karena dia restart otomatis kalau crash. Yang production? Crash diam-diam. Log-nya cuma stop di tengah-tengah. Enggak ada error, enggak ada stack trace. PID file-nya masih ada, jadi gue pikir server-nya masih jalan. Padahal port 20128 itu udah dipegang sama proses lain.

Itu momen "your PID file is a lie." Prosesnya jalan, tapi bukan server yang gue mau.

Gue buang `nohup` dan ganti ke PM2.

PM2 jaga proses gue, restart kalau crash, dan yang paling penting: log-nya jelas. Gue bisa liat crash loop terjadi — server start, crash, restart, crash lagi. Ternyata server gue selalu crash, gue cuma nggak pernah liat crash-nya.

Tunnel buat ngasih jalan masuk, PM2 buat mastiin rumahnya nggak roboh sendiri.

Itu infrastruktur yang boring. Tapi boring itu bagus. Boring itu stabil.

Okay, that's all for now. Have a good day.
