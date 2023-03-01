.PHONY: build-LayerCommons

build-LayerCommons:
	npm install
	npm run build
	mkdir -p "$(ARTIFACTS_DIR)/nodejs/node_modules"
	cp -r commons "$(ARTIFACTS_DIR)/nodejs/node_modules"