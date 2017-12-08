#!/usr/bin/env bash

set -e

build() {
    echo "Building..."

    docker-compose pull
    docker-compose build

    _in_docker app npm install
    _in_docker app npm run build

    if [ "$?" -ne 0 ]; then
        echo "Failed build"
    else
        echo "Build OK"
    fi
}

run() {
    docker-compose up -d --remove-orphans $*
}

stop() {
    docker-compose stop $*
}

logs() {
    docker-compose logs -f app
}

_in_docker() {
    service="$1"
    cmd="${@:2}"

    docker-compose run --rm --no-deps $service bash -c "sleep 0.1; $cmd"
}

help() {
    echo -e "build                  Build npm modules"
    echo -e "run                    Run docker containers"
    echo -e "stop                   Stop docker containers"
    echo -e "logs                   App logs"
}

main() {
  declare cmd="$1"

  case "$cmd" in
    run) shift; run "$@";;
    stop) shift; stop "$@";;
    build) shift; build;;
    logs) shift; logs;;
    *) help "$@";;
  esac
}

main "$@"