#!/usr/bin/env bash
function bitcar_cli {
    local workspace_dir target cmd
    workspace_dir="${BITCAR_WORKSPACE_DIR:-"$HOME/bitcar-repos"}"

    if [ -z "$1" ]; then
       cd "$workspace_dir";
       return
    fi

    target="$HOME/.bitcar/.bitcar_target"

    cmd=("bitcar" "$@")

    if "${cmd[@]}"; then

        [ -f "$target" ] && cd "$(cat "$target")" > /dev/null 2>&1

        if [ "$1" = "--edit" ] || [ "$2" = "--edit" ] || [ "$1" = "-e" ] || [ "$2" = "-e" ]; then
            if [ -n "$BITCAR_EDITOR_CMD" ]; then
                "$BITCAR_EDITOR_CMD" "$(cat "$target")/"
            fi
        fi

        [ -f "$target" ] && rm -f "$target"
    else
        return 0
    fi

}

alias <%= alias %>=bitcar_cli
