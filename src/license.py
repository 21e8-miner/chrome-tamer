"""
Chrome Tamer License System
===========================
Simple offline license validation for freemium model.

License Format: CT-XXXX-XXXX-XXXX-XXXX
- CT = Chrome Tamer prefix
- 16 alphanumeric characters in 4 groups
- Last group is a checksum

Free Tier: No license required
Premium Tier: Valid license unlocks aggressive mode

NOTE: This is a simple hash-based system for indie distribution.
For enterprise, consider integrating with Gumroad/LemonSqueezy APIs.
"""

import hashlib
import re
import os
from pathlib import Path
from dataclasses import dataclass
from typing import Optional

# ============================================================================
# Configuration
# ============================================================================

# Secret salt for checksum (change this for your distribution!)
_LICENSE_SALT = "ChromeTamer2024AdvancedOptimization"

# License storage location
_LICENSE_FILE = Path.home() / ".chrome_tamer" / "license.key"

# ============================================================================
# Data Structures
# ============================================================================

@dataclass
class LicenseInfo:
    """License validation result."""
    is_valid: bool = False
    is_premium: bool = False
    license_key: str = ""
    error_message: str = ""

# ============================================================================
# License Generation (For Admin Use)
# ============================================================================

def generate_license_key(email: str) -> str:
    """
    Generate a valid license key for a customer email.
    
    This should only be used by you (the seller) to generate keys
    after a purchase. You can automate this with Gumroad webhooks.
    
    Args:
        email: Customer email (used as seed)
        
    Returns:
        License key in format CT-XXXX-XXXX-XXXX-XXXX
    """
    # Create deterministic but unpredictable hash from email + salt
    seed = f"{email.lower().strip()}{_LICENSE_SALT}"
    hash_bytes = hashlib.sha256(seed.encode()).hexdigest()
    
    # Take first 12 characters for the main key
    main_key = hash_bytes[:12].upper()
    
    # Generate checksum from main key
    checksum_seed = f"{main_key}{_LICENSE_SALT}"
    checksum = hashlib.md5(checksum_seed.encode()).hexdigest()[:4].upper()
    
    # Format as CT-XXXX-XXXX-XXXX-XXXX
    formatted = f"CT-{main_key[:4]}-{main_key[4:8]}-{main_key[8:12]}-{checksum}"
    return formatted

# ============================================================================
# License Validation
# ============================================================================

def validate_license_key(key: str) -> LicenseInfo:
    """
    Validate a license key.
    
    Args:
        key: License key to validate
        
    Returns:
        LicenseInfo with validation result
    """
    result = LicenseInfo(license_key=key)
    
    # Clean up input
    key = key.strip().upper()
    
    # Check format: CT-XXXX-XXXX-XXXX-XXXX
    pattern = r'^CT-([A-Z0-9]{4})-([A-Z0-9]{4})-([A-Z0-9]{4})-([A-Z0-9]{4})$'
    match = re.match(pattern, key)
    
    if not match:
        result.error_message = "Invalid format. Expected: CT-XXXX-XXXX-XXXX-XXXX"
        return result
    
    # Extract parts
    groups = match.groups()
    main_key = groups[0] + groups[1] + groups[2]
    provided_checksum = groups[3]
    
    # Verify checksum
    checksum_seed = f"{main_key}{_LICENSE_SALT}"
    expected_checksum = hashlib.md5(checksum_seed.encode()).hexdigest()[:4].upper()
    
    if provided_checksum != expected_checksum:
        result.error_message = "Invalid license key (checksum failed)"
        return result
    
    # Valid!
    result.is_valid = True
    result.is_premium = True
    result.license_key = key
    return result

# ============================================================================
# License Storage
# ============================================================================

def save_license(key: str) -> bool:
    """Save license key to disk."""
    try:
        _LICENSE_FILE.parent.mkdir(parents=True, exist_ok=True)
        _LICENSE_FILE.write_text(key.strip())
        return True
    except Exception:
        return False

def load_license() -> Optional[str]:
    """Load license key from disk."""
    try:
        if _LICENSE_FILE.exists():
            return _LICENSE_FILE.read_text().strip()
    except Exception:
        pass
    return None

def clear_license() -> bool:
    """Remove saved license."""
    try:
        if _LICENSE_FILE.exists():
            _LICENSE_FILE.unlink()
        return True
    except Exception:
        return False

def get_current_license_status() -> LicenseInfo:
    """Check if user has a valid saved license."""
    saved_key = load_license()
    if saved_key:
        return validate_license_key(saved_key)
    return LicenseInfo(error_message="No license found (Free tier)")

# ============================================================================
# CLI Test Mode
# ============================================================================

if __name__ == "__main__":
    import sys
    
    print("=" * 50)
    print("  Chrome Tamer License Manager")
    print("=" * 50)
    
    if len(sys.argv) > 1:
        if sys.argv[1] == "generate" and len(sys.argv) > 2:
            email = sys.argv[2]
            key = generate_license_key(email)
            print(f"\nGenerated license for: {email}")
            print(f"License Key: {key}")
            
        elif sys.argv[1] == "validate" and len(sys.argv) > 2:
            key = sys.argv[2]
            result = validate_license_key(key)
            print(f"\nValidating: {key}")
            print(f"Valid: {result.is_valid}")
            print(f"Premium: {result.is_premium}")
            if result.error_message:
                print(f"Error: {result.error_message}")
                
        elif sys.argv[1] == "activate" and len(sys.argv) > 2:
            key = sys.argv[2]
            result = validate_license_key(key)
            if result.is_valid:
                save_license(key)
                print(f"\n✓ License activated successfully!")
                print(f"  Premium features unlocked.")
            else:
                print(f"\n✗ Invalid license: {result.error_message}")
                
        elif sys.argv[1] == "status":
            result = get_current_license_status()
            print(f"\nCurrent Status:")
            print(f"  Premium: {'Yes' if result.is_premium else 'No (Free tier)'}")
            if result.license_key:
                print(f"  Key: {result.license_key[:10]}...")
        else:
            print("\nUsage:")
            print("  python license.py generate <email>  - Generate key for email")
            print("  python license.py validate <key>    - Check if key is valid")
            print("  python license.py activate <key>    - Activate premium")
            print("  python license.py status            - Show current status")
    else:
        # Demo mode
        print("\nDemo: Generating test license...")
        test_email = "demo@example.com"
        test_key = generate_license_key(test_email)
        print(f"  Email: {test_email}")
        print(f"  Key:   {test_key}")
        
        print("\nValidating generated key...")
        result = validate_license_key(test_key)
        print(f"  Valid: {result.is_valid}")
        print(f"  Premium: {result.is_premium}")
