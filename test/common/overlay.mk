# Checks of the EVPN-VXLAN overlay in a lab. A check fails on any lost or
# duplicated reply: ping itself only fails when no reply comes at all.

# $(call overlay_ping,<server>,<address>): ping <address> from <server>
overlay_ping = out=$$(docker exec $(TESTENV)-$(1) ping -c 5 -i 0.3 -W 2 $(2)); echo "$$out"; \
	echo "$$out" | grep -q " 0% packet loss" || { echo "FAIL: $(1) -> $(2) lost replies"; exit 1; }; \
	! echo "$$out" | grep -q DUP || { echo "FAIL: $(1) -> $(2) duplicated replies"; exit 1; }

# $(call overlay_ping_mtu,<server>,<address>): the same with full 1500 byte
# frames that may not be fragmented: VXLAN adds 50 bytes on the fabric links,
# which need an IP MTU above 1550 for them
overlay_ping_mtu = out=$$(docker exec $(TESTENV)-$(1) ping -M do -s 1472 -c 3 -W 2 $(2)); echo "$$out"; \
	echo "$$out" | grep -q " 0% packet loss" || { echo "FAIL: $(1) -> $(2) lost 1500 byte frames"; exit 1; }

# $(call overlay_failover,<server>,<address>,<leaf>,<port>): ping <address>
# from <server> every 0.2 s while <port> of <leaf>, a port of an ESI-LAG, goes
# down and then up again. Each change must lose and duplicate no reply.
overlay_failover = for state in disable enable; do \
	docker exec -d $(TESTENV)-$(1) sh -c 'ping -i 0.2 -c 100 $(2) > /tmp/failover.log 2>&1'; \
	sleep 4; \
	docker exec $(TESTENV)-$(3) sr_cli -ec "interface $(4) admin-state $$state" > /dev/null; \
	sleep 18; \
	out=$$(docker exec $(TESTENV)-$(1) cat /tmp/failover.log); \
	echo "$(3) $(4) $$state: $$(echo "$$out" | grep 'packet loss')"; \
	echo "$$out" | grep -q " 0% packet loss" || { echo "FAIL: $(1) -> $(2) lost replies when $(3) $(4) went $$state"; exit 1; }; \
	! echo "$$out" | grep -q DUP || { echo "FAIL: $(1) -> $(2) duplicated replies when $(3) $(4) went $$state"; exit 1; }; \
	done
