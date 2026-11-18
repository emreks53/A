# Sourced by r.sh / slot.sh: machine-wide render gate (lead's tool).
#   gate_run <command…>  — waits for one of $RENDER_SLOTS slots (default 2), then for enough free memory
#   (MemAvailable >= $RENDER_MIN_FREE_MB, default 5000) then runs the command; the next start is held back for 8 s.
# The machine has 16 GB without swap and was once restarted by memory exhaustion: never bypass this gate.
gate_run() {
  local SLOTS=${RENDER_SLOTS:-2} MINFREE=${RENDER_MIN_FREE_MB:-5000} said=0 i fd sfd avail waited
  while true; do
    for i in $(seq 1 "$SLOTS"); do
      exec {fd}>"/tmp/render_slot_$i.lock"
      if flock -n "$fd"; then
        # start stagger: two renders never begin to grow at the same moment
        exec {sfd}>"/tmp/render_start.lock"; flock "$sfd"
        waited=0
        while true; do
          avail=$(awk '/MemAvailable/{print int($2/1024)}' /proc/meminfo)
          if [ "$avail" -ge "$MINFREE" ] || [ "$waited" -ge 900 ]; then break; fi
          if [ $((waited % 60)) = 0 ]; then echo "[gate] only ${avail} MB free (< ${MINFREE}) - waiting for memory…" >&2; fi
          sleep 3; waited=$((waited + 3))
        done
        "$@" {sfd}>&- &
        local cp=$!
        trap 'kill $cp 2>/dev/null' TERM INT HUP
        sleep 8                      # the new render grows to its size while the start lock is still held
        exec {sfd}>&-
        wait $cp; local rc=$?
        trap - TERM INT HUP
        exec {fd}>&-
        return $rc
      fi
      exec {fd}>&-
    done
    if [ "$said" = 0 ]; then echo "[gate] all $SLOTS render slots busy - waiting…" >&2; said=1; fi
    sleep 1
  done
}
