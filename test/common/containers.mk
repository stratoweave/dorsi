.PHONY: $(addprefix platform-wait-,$(ROUTERS_XR) $(ROUTERS_CRPD))

$(addprefix platform-wait-,$(ROUTERS_XR)):
# Wait for "smartlicserver[212]: %LICENSE-SMART_LIC-3-COMM_FAILED : Communications failure with the Cisco Smart License Utility (CSLU) : Unable to resolve server hostname/domain name" to appear in the container logs
	timeout --foreground $(WAIT) bash -c "until docker logs $(TESTENV)-$(@:platform-wait-%=%) 2>&1 | grep -q 'smartlicserver'; do sleep 1; done"
	docker run $(INTERACTIVE) --rm --network container:$(TESTENV)-sweave ghcr.io/stratoweave/ncurl --host $(@:platform-wait-%=%) --port 830 --username clab --password clab@123 hello

$(addprefix platform-wait-,$(ROUTERS_CRPD)):
# Wait for "Server listening on unix:/var/run/japi_na-grpcd" to appear in the container logs
	timeout --foreground $(WAIT) bash -c "until docker logs $(TESTENV)-$(@:platform-wait-%=%) 2>&1 | grep -q 'Server listening on unix:/var/run/japi_na-grpcd'; do sleep 1; done"
	docker run $(INTERACTIVE) --rm --network container:$(TESTENV)-sweave ghcr.io/stratoweave/ncurl --host $(@:platform-wait-%=%) --port 830 --username clab --password clab@123 hello

.PHONY: cli $(addprefix platform-cli-,$(ROUTERS_XR) $(ROUTERS_CRPD))

$(addprefix platform-cli-,$(ROUTERS_XR)):
	docker exec -it $(TESTENV)-$(subst platform-cli-,,$@) /pkg/bin/xr_cli.sh

$(addprefix platform-cli-,$(ROUTERS_CRPD)):
	docker exec -it $(TESTENV)-$(subst platform-cli-,,$@) cli

# Core routers in the order of their netinfra id, so the Nth router has the
# loopback 10.0.0.N (see the CFS layer).
CORE_ROUTERS = $(ROUTERS_XR) $(ROUTERS_CRPD)
CORE_LOOPBACK_PREFIX ?= 10.0.0
ping_cmd = ping $(2) source $(CORE_LOOPBACK_PREFIX).$(1) count 1

$(addprefix test-ping-,$(ROUTERS_XR)): WAIT ?= 120s
$(addprefix test-ping-,$(ROUTERS_XR)):
	timeout --foreground $(WAIT) bash -c "until docker exec $(TESTENV)-$(@:test-ping-%=%) /pkg/bin/xr_cli.sh '$(call ping_cmd,$(ID),$(IP))' | grep -q '!'; do sleep 1; done"

$(addprefix test-ping-,$(ROUTERS_CRPD)): WAIT ?= 120s
$(addprefix test-ping-,$(ROUTERS_CRPD)):
	timeout --foreground $(WAIT) bash -c "until docker exec $(TESTENV)-$(@:test-ping-%=%) cli -c '$(call ping_cmd,$(ID),$(IP)) rapid' | grep -q '1 packets received'; do sleep 1; done"

.PHONY: test-ping
test-ping::
# Do a full mesh of pings between all core router loopbacks
	@set -e; n=$(words $(CORE_ROUTERS)); \
	for i in $$(seq 1 $$n); do \
		for j in $$(seq 1 $$n); do \
			if [ $$i -ne $$j ]; then \
				$(MAKE) test-ping-$$(echo "$(CORE_ROUTERS)" | cut -d' ' -f$$i) ID=$$i IP=$(CORE_LOOPBACK_PREFIX).$$j; \
			fi; \
		done; \
	done
