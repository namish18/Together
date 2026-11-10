# Together — Bluetooth-Powered Social Time Tracker
## Technical Architecture & Implementation Blueprint

---

### 1. System Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT DEVICE A                                    |
|                                                                                   |
|  +-----------------------+     +---------------------+     +--------------------+ |
|  |     Flutter UI        | <-> |  Riverpod State     | <-> |   Drift Local DB   | |
|  |  (Material 3 Design)  |     |  Notifiers / Logic  |     | (Encounters/Cache) | |
|  +-----------------------+     +---------------------+     +--------------------+ |
|             ^                             ^                                       |
|             |                             |                                       |
|  +-----------------------+     +---------------------+                            |
|  | Android Foreground    | <-> | Bluetooth Proximity |                            |
|  | Service (Connected   |     | Engine              |                            |
|  | Device type)          |     | - State Machine     |                            |
|  +-----------------------+     | - Rotating RPI      |                            |
|                                | - RSSI Filter       |                            |
|                                +---------------------+                            |
|                                           ^                                       |
+-------------------------------------------|---------------------------------------+
                                            |
                         Direct BLE Proximity Beacon & GATT
                         (Zero-Knowledge Advertising & Handshake)
                                            |
+-------------------------------------------v---------------------------------------+
|                                 CLIENT DEVICE B                                    |
|                                                                                   |
|  +-----------------------+     +---------------------+     +--------------------+ |
|  | Bluetooth Proximity   | <-> | Android Foreground  | <-> | Riverpod & Drift   | |
|  | Engine                |     | Service             |     | Encrypted Vault    | |
|  +-----------------------+     +---------------------+     +--------------------+ |
+-----------------------------------------------------------------------------------+
                                            ^
                                            |  HTTPS / WSS (Supabase Client SDK)
                                            v
+-----------------------------------------------------------------------------------+
|                            SUPABASE / POSTGRESQL BACKEND                          |
|                                                                                   |
|   +-----------------------+    +----------------------+    +--------------------+ |
|   | Supabase Auth         |    | PostgreSQL Database  |    | Row Level Security | |
|   | (OAuth & Magic Link)  |    | (Profiles, Friends,  |    | (Mutual Consent,   | |
|   |                       |    |  Encounters, Vault)  |    |  Zero-Knowledge)   | |
|   +-----------------------+    +----------------------+    +--------------------+ |
+-----------------------------------------------------------------------------------+
```

---

### 2. Local Database Selection: Drift vs. Isar

**Selected: Drift (formerly Moor)**

**Justification:**
1. **Long-Term Stability & Active Maintenance**: Isar went through extended dormancy and abandoned core maintenance cycles across Flutter major releases. Drift is actively maintained by Simon Binder and the community with weekly releases.
2. **Type-Safe SQL Compilation**: Drift compiles SQL queries at build time into type-safe Dart classes, preventing runtime query bugs.
3. **Robust Migration Engine**: Drift provides declarative schema versioning and schema verifier tests, crucial for schema evolution in mobile apps.
4. **Encryption Support**: Works seamlessly with `sqlcipher_flutter_libs` to encrypt the local database at rest on Android/iOS.

---

### 3. Android Permission & Background Strategy

Android has progressively tightened background BLE execution and service lifecycles:

| Android Version | Requirement | Implementation Strategy |
|---|---|---|
| **Android 12+ (API 31+)** | `BLUETOOTH_SCAN`<br>`BLUETOOTH_ADVERTISE`<br>`BLUETOOTH_CONNECT` | Declared in `AndroidManifest.xml` with `android:usesPermissionFlags="neverForLocation"` to assure users no GPS coordinates are captured. |
| **Android 13+ (API 33+)** | `POST_NOTIFICATIONS` | Explicit runtime permission dialog requested during onboarding before starting the foreground service. |
| **Android 14+ (API 34+)** | `FOREGROUND_SERVICE_CONNECTED_DEVICE` | `android:foregroundServiceType="connectedDevice"` declared on the service. Requires persistent notification explaining tracking status. |
| **Manufacturer Battery Savers** | Doze mode & OEM task killers (MIUI, Samsung) | Custom onboarding screen routing to `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` with transparent educational copy. |

```xml
<!-- AndroidManifest.xml Excerpt -->
<uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation" />
<uses-permission android:name="android.permission.BLUETOOTH_ADVERTISE" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_CONNECTED_DEVICE" />
<uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />
```

---

### 4. Privacy-First Bluetooth Protocol Design

1. **Rotating Pseudonymous Identifier (RPI)**:
   - Devices NEVER broadcast public usernames or static IDs.
   - Every 15 minutes, an RPI is computed via `HMAC-SHA256(User_Secret, Epoch_Window)`.
   - Only mutually approved friends can map the RPI back to the friend's profile.
2. **RSSI Filter & Debounce**:
   - RSSI threshold set to `-78 dBm` (~2-3m realistic physical proximity indoors).
   - Grace period: 30-60 second window absorbs momentary signal multipath interference or phone-in-pocket dips.
3. **Canonical Pairing & Deduplication**:
   - Both devices detect the encounter. When syncing to the backend, `user_a` is sorted lexicographically smaller than `user_b` (`user_a < user_b`), preventing duplicate counter records.

---

### 5. Secret Time Capsules (End-to-End Encryption)

- Message is encrypted client-side using `AES-GCM-256` before it ever leaves the sender device.
- Direct delivery via BLE GATT characteristic when devices are in range, with encrypted Supabase fallback.
- Recipient device holds the ciphertext locally until the unlock condition triggers:
  1. `ON_DISCONNECT`: Triggers as soon as the mutual encounter concludes.
  2. `DELAY (5m / 30m / 1h / 24h)`: Starts a countdown upon disconnection.
  3. `SPECIFIC_DATETIME`: Unlocks at a scheduled future time.
- Unlocking triggers a celebratory time capsule modal and local notification.
