# Android 1.9.0 Build Evidence

Date: 2026-10-31. Source commit: `62ed6c45cb9d4bcca0c1d5d092f1746e5ca97081`.

- GitHub Actions run: [41223239645](https://github.com/MahdiGU/MQTT-OPTA-Dashboard/actions/runs/41223239645), completed successfully.
- JavaScript/native-bridge simulation: passed at a 390 x 844 phone viewport.
- Install package: `ElMajd-Automation-1.9.0.apk`, 3,360,463 bytes.
- SHA-256: `a40328f7c249ed871056b31160df44989fcfccbdd7a634edc8dee93dfef43736`.
- Packaged `assets/phase5.js` matches the tested source. Manifest and dex payload present.
- Local package: `artifacts/phase5-1.9.0-build/ElMajd-Automation-1.9.0.apk` (build output, not tracked in Git).

This is a pilot debug-signed APK. The build and UI wiring passed; installation and real Supabase workflows on the phone still need acceptance. It does not implement Firebase push or Gmail sending.

Live Phase 4 checks preserved all 11 production records and confirmed client direct INSERT/UPDATE permission is revoked. Derived historical carton consumption is 8,738 with zero recorded receipts, producing an advisory shortage of 8,738 cartons until actual receipts are recorded. This is calculated from preserved production, not a deletion of stock.
