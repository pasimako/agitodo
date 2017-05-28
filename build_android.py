#!/usr/bin/env python3

import sys
import os
import shutil
import subprocess
import argparse

COPYRIGHT = "/* Agitodo | Copyright (c) 2013 */"


def join_paths(base, path):
    return os.path.normpath(os.path.join(base, path))


RUN_DIR = os.path.dirname(os.path.realpath(__file__))

SRC_DIR = join_paths(RUN_DIR, "./core")
LIB_DIR = join_paths(RUN_DIR, "./lib")
CUSTOM_DIR = join_paths(RUN_DIR, "./android/custom")
BUILD_DIR = join_paths(RUN_DIR, "./android/src/app/src/main/assets/app")

SOURCES = (
    (join_paths(SRC_DIR, "index.html"), ""),
    (join_paths(SRC_DIR, "css/style.css"), "css/"),
    (join_paths(SRC_DIR, "favicon.ico"), ""),
    (join_paths(SRC_DIR, "img"), ""),
    (join_paths(SRC_DIR, "font"), ""),
)

SOURCES_MERGE = (
    join_paths(SRC_DIR, "js/global.js"),
    join_paths(SRC_DIR, "js/util.js"),
    join_paths(CUSTOM_DIR, "compat.js"),
    join_paths(SRC_DIR, "js/request.js"),
    join_paths(SRC_DIR, "js/oauth.js"),
    join_paths(SRC_DIR, "js/storage.js"),
    join_paths(SRC_DIR, "js/sync.js"),
    join_paths(SRC_DIR, "js/email.js"),
    join_paths(SRC_DIR, "js/tasks.js"),
    join_paths(SRC_DIR, "js/widget.js"),
    join_paths(SRC_DIR, "js/session.js"),
    join_paths(SRC_DIR, "js/pg_day.js"),
    join_paths(SRC_DIR, "js/pg_week.js"),
    join_paths(SRC_DIR, "js/pg_month.js"),
    join_paths(SRC_DIR, "js/pg_taskList.js"),
    join_paths(SRC_DIR, "js/dg_edit.js"),
    join_paths(SRC_DIR, "js/dg_settings.js"),
    join_paths(SRC_DIR, "js/dg_about.js"),
)

LIBS = (
    (join_paths(SRC_DIR, "css/theme.css"), ""),
    (join_paths(LIB_DIR, "jquery.mobile-1.4.5/jquery.mobile.icons-1.4.5.min.css"), ""),
    (
        join_paths(
            LIB_DIR, "jquery.mobile-1.4.5/jquery.mobile.structure-1.4.5.min.css"
        ),
        "",
    ),
    (join_paths(LIB_DIR, "jquery.mobile-1.4.5/images/ajax-loader.gif"), "images/"),
    (join_paths(LIB_DIR, "jquery-2.1.3/jquery-2.1.3.min.js"), ""),
    (join_paths(LIB_DIR, "xdate-0.8/src/xdate.js"), ""),
    (join_paths(LIB_DIR, "CryptoJS v3.1.2/rollups/pbkdf2.js"), ""),
    (join_paths(LIB_DIR, "CryptoJS v3.1.2/rollups/sha1.js"), ""),
    (join_paths(LIB_DIR, "CryptoJS v3.1.2/rollups/sha256.js"), ""),
    (join_paths(LIB_DIR, "CryptoJS v3.1.2/rollups/aes.js"), ""),
)


def create_dir(path, verbose=False):
    if os.path.isdir(path):
        return True

    res = False

    try:
        if verbose:
            print("Creating directory %s..." % path)
        os.makedirs(path)
        res = True
    except:
        if verbose:
            print("Cannot create directory %s" % path)

    return res


def remove_dir(path):
    res = False
    if not os.path.isdir(path):
        res = True
    else:
        try:
            print("Removing directory %s..." % path)
            shutil.rmtree(path)
            res = True
        except:
            print("Cannot remove directory %s" % path)
    return res


def merge_files(*files):
    merged = ""

    for path in files:
        if not isinstance(path, str) or not path:
            continue

        if not os.path.isfile(path):
            print("File %s does not exist..." % path)
            continue

        if not os.access(path, os.R_OK):
            print("Read access denied for file %s..." % path)
            continue

        with open(path, "r") as f:
            if merged != "":
                merged += "\n"
            merged += f.read()

    return merged


def write_file(contents, dst, base=None, create_dir=True):
    if not isinstance(dst, str) or not dst:
        return

    if base is not None:
        dst = os.path.join(base, dst)

    if not os.path.isdir(os.path.dirname(dst)):
        if create_dir:
            try:
                os.makedirs(os.path.dirname(dst))
            except:
                print("Cannot create directory %s" % os.path.dirname(dst))
                return
        else:
            print("Directory %s does not exist" % os.path.dirname(dst))
            return

    print("Writing to %s..." % dst, end="")

    content_length = 0
    with open(dst, "w") as f:
        content_length = f.write(contents)

    print(" %d bytes" % content_length)


def uglifyjs(src, dst, verbose=False):
    if not os.path.isfile(src):
        if verbose:
            print("File %s does not exist..." % (src))
        return

    create_dir(os.path.dirname(dst), verbose=verbose)

    if verbose:
        print("Copying (uglifyjs) %s to %s..." % (src, dst))

    reserved = [
        "session",
        "pg_day",
        "pg_week",
        "pg_month",
        "pg_taskList",
        "dg_edit",
        "dg_settings",
        "dg_about",
        "compat",
    ]

    return subprocess.call(
        [
            "uglifyjs",
            src,
            "-o",
            dst,
            "-c",
            "-m",
            "toplevel",
            "-r",
            ",".join(reserved),
            "--screw-ie8",
            "--preamble",
            COPYRIGHT,
        ]
    )


def copy_path(src_path, dst_dir):
    if not os.path.exists(src_path):
        raise Exception("Path %s does not exist" % (src_path))

    if not create_dir(dst_dir, verbose=True):
        raise Exception("Cannot create %s" % (dst_dir))

    basename = os.path.basename(src_path)

    if not basename:
        raise Exception("Cannot derive basename from %s" % (src_path))

    dst_path = join_paths(dst_dir, basename)

    if os.path.isdir(src_path):
        if not create_dir(dst_path, verbose=True):
            raise Exception("Cannot create %s" % (dst_path))

        for i in os.listdir(src_path):
            s = join_paths(src_path, i)
            d = join_paths(dst_path, i)
            if os.path.isdir(s):
                shutil.copytree(s, d)
            else:
                shutil.copy(s, d)
    else:
        shutil.copy(src_path, dst_path)

    return dst_path


def build(src_dir, build_dir, UGLIFY=False):

    # Clean-up previous build
    if not remove_dir(build_dir):
        raise Exception("Cannot remove %s" % (build_dir))

    # Create build directory
    if not create_dir(build_dir, verbose=True):
        raise Exception("Cannot create %s" % (build_dir))

    # Copy sources to build directory
    print("Copying source files to %s..." % build_dir)

    n = 0
    for i in SOURCES:
        dst_path = copy_path(i[0], join_paths(build_dir, i[1]))
        n += 1
        print("%d: %s..." % (n, os.path.relpath(dst_path, start=build_dir)))

    # Merge JavaScript sources, uglify & copy to build directory
    print("Merging JavaScript sources...")

    write_file(
        merge_files(*SOURCES_MERGE), "script.js", base=join_paths(build_dir, "js/")
    )

    if UGLIFY:
        uglifyjs(
            join_paths(build_dir, "js/script.js"),
            join_paths(build_dir, "js/script.js"),
            verbose=True,
        )

    # Copy libraries
    lib_dir = join_paths(build_dir, "lib")

    print("Copying libraries to %s..." % lib_dir)

    n = 0
    for i in LIBS:
        dst_path = copy_path(i[0], join_paths(lib_dir, i[1]))
        n += 1
        print("%d: %s..." % (n, os.path.relpath(dst_path, start=lib_dir)))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Builds Agitodo from source")
    parser.add_argument(
        "-u", "--uglify", help="Uglify source code", action="store_true"
    )

    args = parser.parse_args()

    uglify = False

    if args.uglify:
        uglify = args.uglify

    build(SRC_DIR, BUILD_DIR, UGLIFY=uglify)
