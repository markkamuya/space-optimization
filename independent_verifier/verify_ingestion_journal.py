#!/usr/bin/env python3
import hashlib
import json
import sys
from pathlib import Path

def compact(value):
    return json.dumps(value, separators=(',', ':'), ensure_ascii=False).encode()

def digest(value):
    return hashlib.sha256(compact(value)).hexdigest()

def ranked(results):
    ordered = sorted(results, key=lambda item: (item['taskId'], -item['utilization'],
        item['fingerprint'], item['workerId']))
    winners = []
    tasks = set()
    fingerprints = set()
    for result in ordered:
        if result['taskId'] in tasks or result['fingerprint'] in fingerprints:
            continue
        winners.append(result)
        tasks.add(result['taskId'])
        fingerprints.add(result['fingerprint'])
    return winners

def verify_evidence(evidence, queue_digest):
    if evidence.get('format') != 'tpa-worker-ingestion/v1' or evidence.get('queueDigest') != queue_digest:
        return False
    statement = {key: value for key, value in evidence.items() if key != 'sha256'}
    return digest(statement) == evidence.get('sha256') and ranked(evidence.get('accepted', [])) == evidence.get('winners')

def verify(journal):
    errors = []
    if journal.get('format') != 'tpa-worker-ingestion-journal/v1' or not isinstance(journal.get('receipts'), list):
        return {'valid': False, 'errors': ['ingestion_journal_shape_invalid']}
    previous = None
    last_time = float('-inf')
    batches = set()
    accepted = 0
    rejected = 0
    for receipt in journal['receipts']:
        statement = {key: value for key, value in receipt.items() if key != 'sha256'}
        if receipt.get('previousSha256') != previous or digest(statement) != receipt.get('sha256'):
            errors.append('ingestion_receipt_chain_invalid')
        if not isinstance(receipt.get('occurredAt'), (int, float)) or receipt['occurredAt'] < last_time:
            errors.append('ingestion_receipt_time_regression')
        batch = receipt.get('batchSha256')
        if batch in batches:
            errors.append(f'ingestion_batch_replayed:{batch}')
        batches.add(batch)
        if receipt.get('queueDigest') != journal.get('queueDigest') or not verify_evidence(receipt.get('evidence', {}), journal.get('queueDigest')):
            errors.append('ingestion_evidence_invalid')
        if not isinstance(receipt.get('leaseLedgerSha256'), str) or len(receipt['leaseLedgerSha256']) != 64:
            errors.append('ingestion_lease_binding_invalid')
        accepted += len(receipt.get('evidence', {}).get('accepted', []))
        rejected += len(receipt.get('evidence', {}).get('rejected', []))
        previous = receipt.get('sha256')
        last_time = receipt.get('occurredAt', last_time)
    statement = {key: value for key, value in journal.items() if key != 'sha256'}
    if digest(statement) != journal.get('sha256'):
        errors.append('ingestion_journal_digest_invalid')
    return {'valid': not errors, 'errors': errors, 'receipts': len(journal['receipts']),
        'accepted': accepted, 'rejected': rejected}

if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit('Usage: verify_ingestion_journal.py JOURNAL')
    report = verify(json.loads(Path(sys.argv[1]).read_text()))
    print(json.dumps(report, indent=2))
    raise SystemExit(0 if report['valid'] else 1)
