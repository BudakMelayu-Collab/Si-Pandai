# Security Specification - Si-PANDAI

## Data Invariants
1. A Recipient must have a valid NIK and KK of exactly 16 characters.
2. A Recipient's status must be one of the predefined states.
3. A PPD Record must link to a valid recipient ID.
4. Timestamps for creation are immutable.
5. All IDs must match a 128-character limit and standard ID regex.

## The "Dirty Dozen" Payloads (Red Team Test Cases)

1. **Identity Spoofing**: Attempt to create a recipient with an arbitrary ID that doesn't match the regex. (Expect: DENIED)
2. **Key Poisoning**: Attempt to update a recipient with a "GHOST" field like `isAdmin: true`. (Expect: DENIED)
3. **Status Skip**: Attempt to update status to "Disalurkan" without having been "Pending" or "Disetujui". (Actually, any status is allowed if role allows, but we use affectedKeys to limit).
4. **Denial of Wallet**: Attempt to inject a 1MB string into the `name` field of a Recipient. (Expect: DENIED via size limit)
5. **PII Blanket Leak**: Attempt to list recipients without being verified. (Expect: DENIED)
6. **Immutable Tampering**: Attempt to change `createdAt` of a recipient. (Expect: DENIED)
7. **PPD Orphan**: Create a PPD record without a valid recipient lookup. (Expect: DENIED)
8. **PDF Size Attack**: Attempt to store a 10MB PDF base64 in `signedPdfUrl`. (Expect: DENIED via Firestore 1MB limit & rule size check)
9. **Unverified Write**: Attempt to create data with `email_verified: false`. (Expect: DENIED)
10. **Shadow Key**: Create a recipient document with extra keys. (Expect: DENIED via keys().size() check)
11. **Malicious ID**: Use `../../users/admin` as a document ID. (Expect: DENIED via regex)
12. **System Field Bypass**: Attempt to update `updatedAt` to a client-controlled past timestamp (instead of `request.time`). (Wait, my previous rules used strings, I should switch to `request.time` for hardening).

## Test Runner
(I'll provide the rules now and verify them)
