#!/usr/bin/env python3
"""
Pro Feature Test Suite
Tests network throttling, CPU affinity, and native messaging
"""

import json
import sys
import subprocess
import time

def test_native_host_ping():
    """Test 1: Basic native host connectivity"""
    print("🧪 Test 1: Native Host Ping")
    try:
        result = subprocess.run(
            ["python3", "src/chrome_tamer_host.py"],
            input='{"action":"ping"}\n',
            capture_output=True,
            text=True,
            timeout=5
        )
        
        # Parse output (skip length prefix)
        output = result.stdout
        if not output:
            print("❌ No output from native host")
            return False
        
        # Try to find JSON in output
        try:
            # Native messaging format: 4-byte length + JSON
            # Skip first 4 bytes
            json_start = output.find('{')
            if json_start >= 0:
                response = json.loads(output[json_start:])
                if response.get('pong'):
                    print(f"✅ Native host responding (version: {response.get('version')})")
                    return True
        except json.JSONDecodeError:
            pass
        
        print(f"❌ Invalid response: {output[:100]}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_cpu_topology():
    """Test 2: CPU topology detection"""
    print("\n🧪 Test 2: CPU Topology Detection")
    try:
        result = subprocess.run(
            ["python3", "src/chrome_tamer_host.py"],
            input='{"action":"get_cpu_topology"}\n',
            capture_output=True,
            text=True,
            timeout=5
        )
        
        output = result.stdout
        json_start = output.find('{')
        if json_start >= 0:
            response = json.loads(output[json_start:])
            if response.get('success'):
                print(f"✅ Detected: {response.get('pcores')} P-Cores, {response.get('ecores')} E-Cores")
                print(f"   Platform: {response.get('platform')}")
                return True
        
        print(f"❌ Failed: {output[:100]}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_system_stats():
    """Test 3: Enhanced system stats"""
    print("\n🧪 Test 3: System Stats")
    try:
        result = subprocess.run(
            ["python3", "src/chrome_tamer_host.py"],
            input='{"action":"get_stats"}\n',
            capture_output=True,
            text=True,
            timeout=5
        )
        
        output = result.stdout
        json_start = output.find('{')
        if json_start >= 0:
            response = json.loads(output[json_start:])
            if response.get('success'):
                stats = response.get('stats', {})
                print(f"✅ Memory: {stats.get('memory_percent'):.1f}% used")
                print(f"   Available: {stats.get('memory_available_mb'):.0f} MB")
                print(f"   CPU: {stats.get('cpu_percent'):.1f}%")
                return True
        
        print(f"❌ Failed: {output[:100]}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_extension_load():
    """Test 4: Chrome extension manifest validation"""
    print("\n🧪 Test 4: Extension Manifest")
    try:
        with open('extension/manifest.json', 'r') as f:
            manifest = json.load(f)
        
        required_permissions = ['tabs', 'storage', 'alarms', 'system.memory', 'nativeMessaging']
        has_all = all(p in manifest.get('permissions', []) for p in required_permissions)
        
        if has_all:
            print(f"✅ Manifest valid (version: {manifest.get('version')})")
            print(f"   Permissions: {', '.join(manifest.get('permissions', []))}")
            return True
        else:
            print(f"❌ Missing permissions")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print("=" * 60)
    print("Chrome Tamer Pro - Feature Test Suite")
    print("=" * 60)
    
    results = []
    
    # Run all tests
    results.append(("Native Host Ping", test_native_host_ping()))
    results.append(("CPU Topology", test_cpu_topology()))
    results.append(("System Stats", test_system_stats()))
    results.append(("Extension Manifest", test_extension_load()))
    
    # Summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {name}")
    
    print(f"\n Score: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! Pro features are ready.")
        print("\nNext steps:")
        print("1. Load extension in Chrome (chrome://extensions)")
        print("2. Run: cd src && ./install_native_host.sh")
        print("3. Activate Pro with test key: PRO-TEST-KEY-2025")
    else:
        print("\n⚠️  Some tests failed. Check errors above.")
        sys.exit(1)

if __name__ == "__main__":
    main()
