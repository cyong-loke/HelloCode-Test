#!/usr/bin/env python3
"""
A minimal `zipalign`, because the real one lives in Android build-tools.

Android 11 and newer refuse to install an APK targeting API 30+ whose
resources.arsc is compressed or is not 4-byte aligned within the archive, and
jarsigner does not preserve the alignment aapt2 produced. This rewrites the
archive so every STORED entry begins on a 4-byte boundary, padding the local
header's extra field to get there.

Rewriting is safe after v1 signing: the jar signature covers entry *contents*,
not their byte offsets. It must happen before v2 signing, which covers the
whole file.

    zipalign.py <in.apk> <out.apk>
"""
import struct
import sys
import zipfile
import zlib

ALIGNMENT = 4

LOCAL_SIG = 0x04034B50
CENTRAL_SIG = 0x02014B50
EOCD_SIG = 0x06054B50


def align(src_path: str, dst_path: str) -> None:
    src = zipfile.ZipFile(src_path)
    entries = src.infolist()
    out = bytearray()
    central = []

    for info in entries:
        raw = src.read(info)
        stored = info.compress_type == zipfile.ZIP_STORED
        data = raw if stored else zlib.compress(raw, 9)[2:-4]  # raw deflate
        name = info.filename.encode("utf-8")

        # Pad the extra field so the payload of an uncompressed entry starts on
        # an aligned offset. Compressed entries are read through the inflater
        # and never mapped directly, so they do not need it.
        extra = b""
        if stored:
            header_end = len(out) + 30 + len(name)
            pad = (ALIGNMENT - (header_end % ALIGNMENT)) % ALIGNMENT
            extra = b"\0" * pad

        offset = len(out)
        dos_time = (
            (info.date_time[3] << 11) | (info.date_time[4] << 5) | (info.date_time[5] // 2)
        )
        dos_date = (
            ((info.date_time[0] - 1980) << 9) | (info.date_time[1] << 5) | info.date_time[2]
        )
        crc = zlib.crc32(raw) & 0xFFFFFFFF

        out += struct.pack(
            "<IHHHHHIIIHH",
            LOCAL_SIG,
            20,                       # version needed
            0,                        # flags — sizes are known up front
            info.compress_type,
            dos_time,
            dos_date,
            crc,
            len(data),
            len(raw),
            len(name),
            len(extra),
        )
        out += name + extra + data

        central.append(
            struct.pack(
                "<IHHHHHHIIIHHHHHII",
                CENTRAL_SIG,
                info.create_version,
                20,
                0,
                info.compress_type,
                dos_time,
                dos_date,
                crc,
                len(data),
                len(raw),
                len(name),
                0,                    # no extra in the central record
                0,                    # no comment
                0,                    # disk number
                info.internal_attr,
                info.external_attr,
                offset,
            )
            + name
        )

    cd_offset = len(out)
    for record in central:
        out += record
    cd_size = len(out) - cd_offset

    out += struct.pack(
        "<IHHHHIIH", EOCD_SIG, 0, 0, len(central), len(central), cd_size, cd_offset, 0
    )

    with open(dst_path, "wb") as fh:
        fh.write(out)

    src.close()


def report(path: str) -> int:
    """Prints every misaligned uncompressed entry. Returns how many there were."""
    blob = open(path, "rb").read()
    bad = 0
    for info in zipfile.ZipFile(path).infolist():
        if info.compress_type != zipfile.ZIP_STORED:
            continue
        off = info.header_offset
        name_len, extra_len = struct.unpack("<HH", blob[off + 26 : off + 30])
        data_at = off + 30 + name_len + extra_len
        if data_at % ALIGNMENT:
            print(f"  misaligned: {info.filename} @ {data_at}")
            bad += 1
    return bad


if __name__ == "__main__":
    align(sys.argv[1], sys.argv[2])
    failures = report(sys.argv[2])
    if failures:
        sys.exit(f"zipalign: {failures} entr{'y' if failures == 1 else 'ies'} still misaligned")
    print("aligned")
