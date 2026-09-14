#!/bin/sh

set -eu

REPOSITORY="piyushyadav1617/jig"
RELEASE_BASE_URL="https://github.com/${REPOSITORY}/releases/latest/download"

fail() {
	printf 'jig: %s\n' "$1" >&2
	exit 1
}

command -v curl >/dev/null 2>&1 || fail "curl is required"
command -v uname >/dev/null 2>&1 || fail "uname is required"
command -v awk >/dev/null 2>&1 || fail "awk is required"

OS=$(uname -s)
ARCH=$(uname -m)

case "${OS}:${ARCH}" in
	Darwin:arm64|Darwin:aarch64)
		ASSET='jig-darwin-arm64'
		;;
	Darwin:x86_64|Darwin:amd64)
		ASSET='jig-darwin-x64'
		;;
	Linux:arm64|Linux:aarch64)
		ASSET='jig-linux-arm64'
		;;
	Linux:x86_64|Linux:amd64)
		ASSET='jig-linux-x64'
		;;
	*)
		fail "unsupported platform: ${OS} ${ARCH}"
		;;
esac

INSTALL_DIR=${JIG_INSTALL_DIR:-"${HOME:-}/.local/bin"}
[ -n "$INSTALL_DIR" ] || fail 'HOME is not set; set JIG_INSTALL_DIR'

TEMP_DIR=$(mktemp -d "${TMPDIR:-/tmp}/jig-install.XXXXXX") || \
	fail 'could not create a temporary directory'
INSTALL_TEMP=''

cleanup() {
	rm -rf "$TEMP_DIR"
	if [ -n "$INSTALL_TEMP" ]; then
		rm -f "$INSTALL_TEMP"
	fi
}

trap cleanup 0 HUP INT TERM

printf 'Downloading %s...\n' "$ASSET"
curl --fail --location --silent --show-error --retry 3 \
	"${RELEASE_BASE_URL}/${ASSET}" \
	-o "$TEMP_DIR/jig"

curl --fail --location --silent --show-error --retry 3 \
	"${RELEASE_BASE_URL}/checksums.txt" \
	-o "$TEMP_DIR/checksums.txt"

EXPECTED=$(awk -v asset="$ASSET" '
	$2 == asset || $2 == "*" asset || $2 ~ ("/" asset "$") {
		print $1
		exit
	}
' "$TEMP_DIR/checksums.txt")
[ -n "$EXPECTED" ] || fail "no checksum found for ${ASSET}"

case "$EXPECTED" in
	*[!0123456789abcdefABCDEF]*)
		fail "invalid checksum for ${ASSET}"
		;;
esac

if command -v sha256sum >/dev/null 2>&1; then
	ACTUAL=$(sha256sum "$TEMP_DIR/jig" | awk '{print $1}')
elif command -v shasum >/dev/null 2>&1; then
	ACTUAL=$(shasum -a 256 "$TEMP_DIR/jig" | awk '{print $1}')
else
	fail 'sha256sum or shasum is required to verify the download'
fi

[ "$ACTUAL" = "$EXPECTED" ] || fail "checksum verification failed for ${ASSET}"

mkdir -p "$INSTALL_DIR" || fail "could not create ${INSTALL_DIR}"
if [ -d "${INSTALL_DIR}/jig" ]; then
	fail "${INSTALL_DIR}/jig is a directory; remove or rename it before installing"
fi
INSTALL_TEMP="${INSTALL_DIR}/.jig.tmp.$$"
cp "$TEMP_DIR/jig" "$INSTALL_TEMP" || fail "could not write ${INSTALL_DIR}"
chmod 755 "$INSTALL_TEMP" || fail "could not make jig executable"
mv -f "$INSTALL_TEMP" "${INSTALL_DIR}/jig" || fail "could not install jig"
INSTALL_TEMP=''

printf 'Installed jig to %s/jig\n' "$INSTALL_DIR"

case ":${PATH:-}:" in
	*":${INSTALL_DIR}:"*)
		;;
	*)
		printf 'Add this directory to your PATH:\n'
		printf '  export PATH="%s:$PATH"\n' "$INSTALL_DIR"
		;;
esac

printf 'Run jig from a project directory with: jig\n'
