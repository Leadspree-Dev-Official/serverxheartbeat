import os
import sys
import subprocess
import time

def daemonize():
    # First fork
    try:
        pid = os.fork()
        if pid > 0:
            sys.exit(0)
    except OSError as e:
        sys.stderr.write(f"Fork #1 failed: {e}\n")
        sys.exit(1)

    # Decouple from parent environment
    os.chdir("/")
    os.setsid()
    os.umask(0)

    # Second fork
    try:
        pid = os.fork()
        if pid > 0:
            sys.exit(0)
    except OSError as e:
        sys.stderr.write(f"Fork #2 failed: {e}\n")
        sys.exit(1)

    # Redirect standard file descriptors
    sys.stdout.flush()
    sys.stderr.flush()

    log_path = "/tmp/heartbeat_daemon.log"
    pid_path = "/tmp/heartbeat_daemon.pid"

    with open(pid_path, "w") as f:
        f.write(str(os.getpid()))

    si = open(os.devnull, "r")
    so = open(log_path, "a+")
    se = open(log_path, "a+")

    os.dup2(si.fileno(), sys.stdin.fileno())
    os.dup2(so.fileno(), sys.stdout.fileno())
    os.dup2(se.fileno(), sys.stderr.fileno())

    # Execute Node server.mjs
    node_bin = "/Users/aniruddhadas/.local/bin/node"
    server_path = "/Volumes/ANI(1TB)/Coding Projects/ServerXHeartBeat /server.mjs"

    os.execv(node_bin, [node_bin, server_path])

if __name__ == "__main__":
    daemonize()
