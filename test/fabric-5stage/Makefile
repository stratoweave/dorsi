TESTENV=dorsi-fabric-5stage

ROUTERS_SRL=leaf1 leaf2 leaf3 leaf4 spine1 spine2 spine3 spine4 superspine1 superspine2

include ../common/clab.mk
include ../common/containers.mk
include ../common/quicklab.mk
include ../common/overlay.mk

# The overlay of ip-fabric-overlay.xml (CONFIG=ip-fabric-overlay.xml), layer
# 2, across both pods: network t1/web joins server1 (VLAN 10, ESI-LAG of
# leaf1 and leaf2 in pod 1), server2 (VLAN 20, ESI-LAG of leaf2 in pod 1 and
# leaf3 in pod 2) and server3 (VLAN 30, single-homed to leaf3 in pod 2).
# setup-overlay-servers gives the servers their bonds, VLANs and addresses.
server_bond = docker exec $(TESTENV)-$(1) sh -c 'ip link show bond0 > /dev/null 2>&1 || { \
	ip link add bond0 type bond mode 802.3ad lacp_rate fast xmit_hash_policy layer3+4 && \
	ip link set eth1 down && ip link set eth1 master bond0 && \
	ip link set eth2 down && ip link set eth2 master bond0 && ip link set bond0 up && \
	ip link add link bond0 name bond0.$(2) type vlan id $(2) && ip link set bond0.$(2) up && \
	ip address add $(3) dev bond0.$(2); }'

.PHONY: setup-overlay-servers
setup-overlay-servers:
	$(call server_bond,server1,10,10.10.10.11/24)
	$(call server_bond,server2,20,10.10.10.12/24)
	docker exec $(TESTENV)-server3 sh -c 'ip link show eth1.30 > /dev/null 2>&1 || { \
		ip link add link eth1 name eth1.30 type vlan id 30 && ip link set eth1.30 up && \
		ip address add 10.10.10.13/24 dev eth1.30; }'

.PHONY: check-overlay
check-overlay:
	@$(call overlay_ping,server1,10.10.10.12)
	@$(call overlay_ping,server1,10.10.10.13)
	@$(call overlay_ping,server2,10.10.10.11)
	@$(call overlay_ping,server2,10.10.10.13)
	@$(call overlay_ping,server3,10.10.10.11)
	@$(call overlay_ping,server3,10.10.10.12)
	@$(call overlay_ping_mtu,server1,10.10.10.13)
	@$(call overlay_ping_mtu,server3,10.10.10.12)

# server2's ESI-LAG spans the pods: its pod 2 leg (leaf3) goes down and up
# while server3 pings it, and its pod 1 leg (leaf2) while server1 pings it
.PHONY: check-overlay-failover
check-overlay-failover:
	@$(call overlay_failover,server3,10.10.10.12,leaf3,ethernet-1/1)
	@$(call overlay_failover,server1,10.10.10.12,leaf2,ethernet-1/2)

# The underlay: every leaf reaches the loopback of every switch (10.0.0.<id>,
# id as in ip-fabric.xml) from its own loopback, across both pods and both
# planes, and every BGP session of every switch is established
LEAF_IDS=leaf1:1 leaf2:2 leaf3:3 leaf4:4
LOOPBACKS=10.0.0.1 10.0.0.2 10.0.0.3 10.0.0.4 10.0.0.11 10.0.0.12 10.0.0.13 10.0.0.14 10.0.0.21 10.0.0.22

.PHONY: check-underlay
check-underlay:
	@set -e; for sw in $(LEAF_IDS); do name=$${sw%%:*}; id=$${sw##*:}; \
		for lo in $(LOOPBACKS); do \
			docker exec $(TESTENV)-$$name ip netns exec srbase-default ping -c 3 -i 0.2 -W 1 -I 10.0.0.$$id $$lo > /dev/null \
				|| { echo "FAIL: $$name -> $$lo"; exit 1; }; \
		done; echo "ok: $$name reaches all $(words $(LOOPBACKS)) loopbacks"; \
	done
	@set -e; for sw in $(ROUTERS_SRL); do \
		out=$$(docker exec $(TESTENV)-$$sw sr_cli "show network-instance default protocols bgp neighbor" | grep "configured sessions are established"); \
		echo "$$sw: $$out"; \
		echo "$$out" | grep -qE "^([0-9]+) configured neighbors, \1 configured sessions are established" || { echo "FAIL: $$sw has BGP sessions down"; exit 1; }; \
	done
