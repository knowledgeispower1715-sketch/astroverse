# Phase 6 Automated Test Runner
import os, sys, subprocess, time, json

def run_tests():
    start_time = time.time()
    results = {
        'timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'typescript': [],
        'python': [],
        'summary': {}
    }

    test_dir = 'services/wallet-service/tests'
    ts_files = sorted([f for f in os.listdir(test_dir) if f.endswith('.test.ts')])
    
    total_ts_pass = 0
    total_ts_fail = 0
    
    print(f'Starting execution of {len(ts_files)} TypeScript test suites...')
    for idx, f in enumerate(ts_files, 1):
        f_path = os.path.join(test_dir, f)
        t0 = time.time()
        res = subprocess.run(
            ['npx', 'ts-node', '--project', 'services/wallet-service/tsconfig.json', f_path],
            capture_output=True,
            text=True,
            shell=True
        )
        elapsed = round(time.time() - t0, 3)
        status = 'PASSED' if res.returncode == 0 else 'FAILED'
        if status == 'PASSED':
            total_ts_pass += 1
            print(f'[{idx}/{len(ts_files)}] [PASS] {f} ({elapsed}s)')
        else:
            total_ts_fail += 1
            print(f'[{idx}/{len(ts_files)}] [FAIL] {f} ({elapsed}s)')
            print(res.stderr[:500])
        
        results['typescript'].append({
            'suite': f,
            'status': status,
            'exitCode': res.returncode,
            'durationSeconds': elapsed,
            'stdoutSummary': res.stdout[-400:] if res.stdout else '',
            'stderrSummary': res.stderr[-400:] if res.stderr else ''
        })

    print(f'TypeScript suites completed: {total_ts_pass} PASSED, {total_ts_fail} FAILED')

    print('Running Python pytest suite...')
    t0 = time.time()
    py_res = subprocess.run(
        [sys.executable, '-m', 'pytest', 'services/kundli-engine/tests', '-v', '--tb=short'],
        capture_output=True,
        text=True
    )
    py_elapsed = round(time.time() - t0, 3)
    py_status = 'PASSED' if py_res.returncode == 0 else 'FAILED'
    print(f'Python suite finished in {py_elapsed}s with status {py_status}')

    results['python'] = {
        'status': py_status,
        'exitCode': py_res.returncode,
        'durationSeconds': py_elapsed,
        'stdout': py_res.stdout[-1500:],
        'stderr': py_res.stderr[-500:]
    }

    results['summary'] = {
        'totalTsSuites': len(ts_files),
        'passedTsSuites': total_ts_pass,
        'failedTsSuites': total_ts_fail,
        'pythonStatus': py_status,
        'totalElapsedSeconds': round(time.time() - start_time, 2)
    }

    os.makedirs('reports/phase-6-commercial-launch/evidence', exist_ok=True)
    with open('reports/phase-6-commercial-launch/evidence/automated_test_results.json', 'w', encoding='utf-8') as out:
        json.dump(results, out, indent=2)

    print('Test run finished. Evidence written to reports/phase-6-commercial-launch/evidence/automated_test_results.json')

if __name__ == '__main__':
    run_tests()
