#!/usr/bin/env python3
import base64
import hashlib
import json
import sys
from datetime import datetime
from pathlib import Path

FORMAT = 'triangle-packing-review-authority/v1'
DOMAIN = 'triangle-packing-review-event/v1'
CUTOFF = '2026-08-15T08:00:00.000Z'

def compact(value):
    return json.dumps(value, separators=(',', ':'), ensure_ascii=False).encode()

def digest(value):
    return hashlib.sha256(compact(value)).hexdigest()

def timestamp(value):
    return datetime.fromisoformat(value.replace('Z', '+00:00'))

Q = 2**255 - 19
L = 2**252 + 27742317777372353535851937790883648493
D = (-121665 * pow(121666, Q - 2, Q)) % Q
I = pow(2, (Q - 1) // 4, Q)
B_Y = (4 * pow(5, Q - 2, Q)) % Q

def recover_x(y, sign):
    x = pow((y * y - 1) * pow(D * y * y + 1, Q - 2, Q) % Q, (Q + 3) // 8, Q)
    if (x * x - (y * y - 1) * pow(D * y * y + 1, Q - 2, Q)) % Q:
        x = x * I % Q
    if x & 1 != sign:
        x = Q - x
    return x

def decode_point(encoded):
    if len(encoded) != 32:
        raise ValueError('point_length')
    value = int.from_bytes(encoded, 'little')
    y = value & ((1 << 255) - 1)
    if y >= Q:
        raise ValueError('point_range')
    point = (recover_x(y, value >> 255), y)
    x, y = point
    if (-x * x + y * y - 1 - D * x * x * y * y) % Q:
        raise ValueError('point_curve')
    return point

def add(left, right):
    x1, y1 = left
    x2, y2 = right
    product = D * x1 * x2 * y1 * y2
    return ((x1 * y2 + x2 * y1) * pow(1 + product, Q - 2, Q) % Q,
        (y1 * y2 + x1 * x2) * pow(1 - product, Q - 2, Q) % Q)

def multiply(point, scalar):
    result = (0, 1)
    while scalar:
        if scalar & 1:
            result = add(result, point)
        point = add(point, point)
        scalar >>= 1
    return result

BASE = (recover_x(B_Y, 0), B_Y)

def public_key_bytes(public_key):
    body = ''.join(line for line in public_key.splitlines() if not line.startswith('---'))
    der = base64.b64decode(body, validate=True)
    if len(der) != 44 or der[:12].hex() != '302a300506032b6570032100':
        raise ValueError('public_key_spki')
    return der[-32:]

def verify_signature(public_key, statement, signature):
    key_bytes = public_key_bytes(public_key)
    signature_bytes = base64.b64decode(signature, validate=True)
    if len(signature_bytes) != 64:
        return False
    encoded_r, encoded_s = signature_bytes[:32], signature_bytes[32:]
    scalar = int.from_bytes(encoded_s, 'little')
    if scalar >= L:
        return False
    public_point = decode_point(key_bytes)
    r_point = decode_point(encoded_r)
    challenge = int.from_bytes(hashlib.sha512(encoded_r + key_bytes + compact(statement)).digest(), 'little') % L
    return multiply(BASE, scalar) == add(r_point, multiply(public_point, challenge))

def verify(registry, ledger):
    errors = []
    statement = {key: value for key, value in registry.items() if key != 'sha256'}
    if registry.get('format') != FORMAT or digest(statement) != registry.get('sha256'):
        errors.append('authority_invalid')
    keys = {key.get('keyId'): key for key in registry.get('keys', [])}
    if len(keys) != len(registry.get('keys', [])):
        errors.append('authority_key_ids_invalid')
    for entry in ledger.get('entries', []):
        approvers = set()
        previous = None
        for event in entry.get('events', []):
            auth = event.get('authorization', {})
            if auth.get('mode') == 'unsigned_migration':
                if entry.get('scientificReviewRequired') or auth.get('cutoff') != CUTOFF or \
                    timestamp(ledger['issuedAt']) >= timestamp(CUTOFF):
                    errors.append(f'unsigned_migration_invalid:{entry.get("candidateId")}')
            elif auth.get('mode') == 'ed25519':
                key = keys.get(auth.get('keyId'))
                decided = timestamp(event['decidedAt'])
                required = 'proof_reviewer' if entry.get('scientificReviewRequired') else 'reviewer'
                if not key or key.get('reviewer') != event.get('reviewer'):
                    errors.append(f'review_key_identity_mismatch:{entry.get("candidateId")}')
                elif decided < timestamp(key['activeFrom']) or decided >= timestamp(key['expiresAt']):
                    errors.append(f'review_key_inactive:{entry.get("candidateId")}')
                elif key.get('revokedAt') and decided >= timestamp(key['revokedAt']):
                    errors.append(f'review_key_revoked:{entry.get("candidateId")}')
                elif required not in key.get('roles', []) and 'maintainer' not in key.get('roles', []):
                    errors.append(f'review_key_scope_invalid:{entry.get("candidateId")}')
                elif entry.get('scientificReviewRequired') and str(entry.get('contributor', '')).lower() == str(event.get('reviewer')).lower():
                    errors.append(f'scientific_self_review_forbidden:{entry.get("candidateId")}')
                else:
                    signed = {'domain': DOMAIN, 'ledgerSha256': auth.get('ledgerSha256'),
                        'candidateId': entry.get('candidateId'), 'candidateSha256': entry.get('candidateSha256'),
                        'previousEventSha256': previous, 'reviewer': event.get('reviewer'),
                        'keyId': auth.get('keyId'), 'decidedAt': event.get('decidedAt'),
                        'decision': event.get('decision'), 'reason': event.get('reason', ''),
                        'scientificReview': event.get('scientificReview') is True,
                        'canonicalMetadata': event.get('canonicalMetadata') if event.get('decision') == 'approve' else None}
                    try:
                        valid = verify_signature(key['publicKeyPem'], signed, auth.get('signature', ''))
                    except Exception:
                        valid = False
                    if not valid:
                        errors.append(f'review_signature_invalid:{entry.get("candidateId")}')
            else:
                errors.append(f'review_authorization_missing:{entry.get("candidateId")}')
            if event.get('decision') == 'approve':
                approvers.add(str(event.get('reviewer')).lower())
            previous = event.get('sha256')
        quorum = 2 if entry.get('scientificReviewRequired') else 1
        if entry.get('state') == 'approved_for_promotion' and len(approvers) < quorum:
            errors.append(f'review_quorum_invalid:{entry.get("candidateId")}')
    return {'valid': not errors, 'errors': errors, 'entries': len(ledger.get('entries', [])),
        'authoritySha256': registry.get('sha256')}

if __name__ == '__main__':
    if len(sys.argv) != 3:
        raise SystemExit('Usage: verify_review_authority.py REGISTRY LEDGER')
    report = verify(json.loads(Path(sys.argv[1]).read_text()), json.loads(Path(sys.argv[2]).read_text()))
    print(json.dumps(report, indent=2))
    raise SystemExit(0 if report['valid'] else 1)
