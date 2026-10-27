NPM ?= npm

.PHONY: all ci test build

all: build

# Compare contents so installs also rerun after checking out an older lockfile.
# Save the marker only after npm ci succeeds.
ci:
	@if [ ! -d node_modules ] || ! cmp -s package-lock.json .npm-ci-lock; then \
		rm -f .npm-ci-lock; \
		$(NPM) ci --ignore-scripts && cp package-lock.json .npm-ci-lock; \
	fi

test: ci
	$(NPM) test

build: test
	$(NPM) run build
