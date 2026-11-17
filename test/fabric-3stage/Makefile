TESTENV=dorsi-fabric-3stage

ROUTERS_SRL=leaf1 leaf2 leaf3 spine1 spine2

include ../common/clab.mk
include ../common/containers.mk
include ../common/quicklab.mk

# The overlay of ip-fabric.xml: server1 (on an ESI-LAG of leaf1 and leaf2) and
# server3 (on leaf3) share network t1/web, so a ping between them crosses the
# fabric over VXLAN. server2 is in network t1/db, which VRF main routes to
# t1/web. Then the EVPN state the leaves hold for it.
.PHONY: check-overlay
check-overlay:
	docker exec $(TESTENV)-server1 ping -c 3 -W 2 10.10.10.13
	docker exec $(TESTENV)-server3 ping -c 3 -W 2 10.10.10.11
	docker exec $(TESTENV)-server1 ping -c 3 -W 2 10.10.20.12
	docker exec $(TESTENV)-server3 ping -c 3 -W 2 10.10.20.12
	docker exec $(TESTENV)-leaf3 sr_cli "show network-instance t1-main route-table"
	docker exec $(TESTENV)-leaf3 sr_cli "show network-instance default protocols bgp routes evpn route-type summary"
	docker exec $(TESTENV)-leaf3 sr_cli "show network-instance t1-web bridge-table mac-table all"
	docker exec $(TESTENV)-leaf1 sr_cli "show system network-instance ethernet-segments"
