# -*- mode: python ; coding: utf-8 -*-
"""
Chrome Tamer PyInstaller Build Spec
===================================
Run with: pyinstaller build.spec
"""

import sys
from pathlib import Path

block_cipher = None

# Paths
src_dir = Path('src')
assets_dir = Path('assets')

# Filter out None entries from datas
datas_list = [
    (str(assets_dir), 'assets') if assets_dir.exists() else None,
]
datas_list = [d for d in datas_list if d is not None]

a = Analysis(
    [str(src_dir / 'tray_app.py')],
    pathex=[str(src_dir)],
    binaries=[],
    datas=datas_list,
    hiddenimports=[
        'PyQt6.sip',
        'psutil',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'matplotlib',
        'numpy',
        'pandas',
        'scipy',
        'PIL',
        'tkinter',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

# Filter out None entries from datas
a.datas = [d for d in a.datas if d is not None]

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='ChromeTamer',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # No console window
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=str(assets_dir / 'icon.ico') if (assets_dir / 'icon.ico').exists() else None,
    version='version_info.txt' if Path('version_info.txt').exists() else None,
)
