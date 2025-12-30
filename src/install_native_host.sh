#!/bin/bash
# Chrome Tamer Pro - Native Host Installer
# Installs the native messaging host for system-level features

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
HOST_SCRIPT="$SCRIPT_DIR/chrome_tamer_host.py"
MANIFEST_TEMPLATE="$SCRIPT_DIR/../extension/native_host.json"

echo "🦁 Chrome Tamer Pro - Native Host Installer"
echo "============================================"
echo ""

# Check platform
if [[ "$OSTYPE" == "darwin"* ]]; then
    PLATFORM="macOS"
    MANIFEST_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
    HOST_INSTALL_DIR="/usr/local/bin"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    PLATFORM="Linux"
    MANIFEST_DIR="$HOME/.config/google-chrome/NativeMessagingHosts"
    HOST_INSTALL_DIR="/usr/local/bin"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    PLATFORM="Windows"
    echo "❌ Windows installation not yet automated. Please install manually."
    exit 1
else
    echo "❌ Unsupported platform: $OSTYPE"
    exit 1
fi

echo "Platform: $PLATFORM"
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not found. Please install Python 3."
    exit 1
fi

echo "✅ Python 3 found: $(python3 --version)"
echo ""

# Check psutil
if ! python3 -c "import psutil" &> /dev/null; then
    echo "⚠️  psutil not found. Installing..."
    pip3 install psutil
fi

echo "✅ psutil available"
echo ""

# Create manifest directory
mkdir -p "$MANIFEST_DIR"
echo "✅ Created manifest directory: $MANIFEST_DIR"
echo ""

# Install host script
echo "📦 Installing native host script..."
sudo cp "$HOST_SCRIPT" "$HOST_INSTALL_DIR/chrome_tamer_host.py"
sudo chmod +x "$HOST_INSTALL_DIR/chrome_tamer_host.py"
echo "✅ Installed to: $HOST_INSTALL_DIR/chrome_tamer_host.py"
echo ""

# Get Chrome extension ID (user must provide this after loading unpacked extension)
echo "⚠️  IMPORTANT: You need your Chrome extension ID!"
echo "   1. Load the extension in Chrome (chrome://extensions)"
echo "   2. Enable 'Developer mode'"
echo "   3. Copy the extension ID (e.g., 'abcdefghijklmnopqrstuvwxyz123456')"
echo ""
read -p "Enter your extension ID: " EXTENSION_ID

if [ -z "$EXTENSION_ID" ]; then
    echo "❌ Extension ID required. Installation aborted."
    exit 1
fi

# Create manifest with correct extension ID
MANIFEST_FILE="$MANIFEST_DIR/com.chrometamer.native.json"
cat > "$MANIFEST_FILE" << EOF
{
  "name": "com.chrometamer.native",
  "description": "Chrome Tamer Native Messaging Host",
  "path": "$HOST_INSTALL_DIR/chrome_tamer_host.py",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://$EXTENSION_ID/"
  ]
}
EOF

echo "✅ Created manifest: $MANIFEST_FILE"
echo ""

# Test the installation
echo "🧪 Testing native host connection..."
echo '{"action":"ping"}' | python3 "$HOST_INSTALL_DIR/chrome_tamer_host.py" &
sleep 1
kill $! 2>/dev/null || true

echo ""
echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo "1. Reload your Chrome extension (chrome://extensions)"
echo "2. Activate Pro in the extension popup"
echo "3. Network throttling and CPU affinity features are now available!"
echo ""
echo "Note: Some features require sudo/admin privileges to work."
