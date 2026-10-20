#!/bin/bash
nohup pnpm exec tsx server.ts > /tmp/heartbeat_server.log 2>&1 &
echo $! > /tmp/heartbeat_server.pid
echo "Server started with PID $(cat /tmp/heartbeat_server.pid)"
