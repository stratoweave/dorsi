TESTENV=dorsi-fabric-5stage-srl

ROUTERS_SRL=leaf1 leaf2 spine1 spine2 superspine1

include ../common/clab.mk
include ../common/containers.mk
include ../common/quicklab.mk

# The overlay of ip-fabric.xml: all three servers are in network t1/web, on
# leaves in different pods, so their traffic crosses the super-spine over
# VXLAN. server1 is on an ESI-LAG of leaf1 (pod-1) and leaf2 (pod-2).
.PHONY: check-overlay
check-overlay:
	docker exec $(TESTENV)-server3 ping -c 3 -W 2 10.10.10.12
	docker exec $(TESTENV)-server2 ping -c 3 -W 2 10.10.10.13
	docker exec $(TESTENV)-server1 ping -c 3 -W 2 10.10.10.12
	docker exec $(TESTENV)-server1 ping -c 3 -W 2 10.10.10.13
	docker exec $(TESTENV)-leaf1 sr_cli "show network-instance default protocols bgp routes evpn route-type summary"
	docker exec $(TESTENV)-leaf1 sr_cli "show network-instance t1-web bridge-table mac-table all"
	docker exec $(TESTENV)-leaf1 sr_cli "show system network-instance ethernet-segments"
