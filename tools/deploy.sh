#!/bin/bash

# the folder this script is in (*/bootplate/tools)
TOOLS=$(cd `dirname $0` && pwd)

# enyo location
ENYO="$TOOLS/../enyo"

# deploy script location
DEPLOY="$ENYO/tools/deploy.js"

( cd `dirname $0` && cd ../flash-mini-mp3 && echo "try to build flash-mini-mp3" && make )

# check for node, but quietly
if command -v node >/dev/null 2>&1; then
	# use node to invoke deploy with imported parameters
	echo "enyo/tools/minify.sh args: " $@
	node $DEPLOY $@
else
	echo "No node found in path"
	exit 1
fi
