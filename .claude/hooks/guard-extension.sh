#!/bin/bash
# After an edit inside extension/, rerun the package check (no network/eval, manifest, file references).
# Exit code 2 feeds the failure back to Claude so it fixes the edit before moving on.
input=$(cat)
file=$(printf '%s' "$input" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).tool_input?.file_path||"")}catch{console.log("")}})')
case "$file" in
  */extension/*)
    cd "${CLAUDE_PROJECT_DIR:-.}"
    if ! out=$(node test/check.cjs 2>&1); then
      echo "Package check failed after editing $file:" >&2; echo "$out" | head -20 >&2; exit 2
    fi ;;
esac
exit 0
