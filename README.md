# 🛡️ VeriFlow — Cryptographic Offline-First QR Verification & Audit Platform

VeriFlow is an end-to-end **Asymmetric (RS256) Cryptographic Key Authority, Offline-First Warehouse QR Verification, and Work Shift Session Management Platform**.

## 📦 Repository Structure

| Component | Path | Description |
| :--- | :--- | :--- |
| **Backend API (`jwt_api`)** | [`./jwt_api`](./jwt_api/README.md) | FastAPI + Async SQLAlchemy (PostgreSQL) + Redis backend providing RSA-2048/4096 key lifecycle, AES-256-GCM encrypted key storage, RS256 token & product QR issuance (with custom duration in `seconds` → `years`), work shift management, dynamic inventory rules, MFA (TOTP/Email), and idempotent offline scan sync. |
| **React Web Console (`Frontend/veriflow`)** | [`./Frontend/veriflow`](./Frontend/veriflow/README.md) | React 18 + TypeScript + Vite 7 + MUI v5 management console for cryptographic keys, product tag QR generation/verification, inventory validation rules, work shift tokens, scan analytics, and granular RBAC permissions. |
| **Android Offline Scanner (`app/veriflow`)** | `./app/veriflow` | Capacitor + React + SQLite offline-first mobile scanner app supporting sub-5ms offline RS256 signature verification, shift QR login, rule evaluation, batch scan synchronization, and permission-gated SQLite data wipe (`user.delete_all_data`). |

---

## 🚀 Quick Start

1. **Backend API (`jwt_api`)**: See [`jwt_api/README.md`](./jwt_api/README.md)
2. **React Web Console (`Frontend/veriflow`)**: See [`Frontend/veriflow/README.md`](./Frontend/veriflow/README.md)
