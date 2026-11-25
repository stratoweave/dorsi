TESTENV=dorsi-fabric-3stage-mixed-vjunos

ROUTERS_SRL=leaf1 spine2
ROUTERS_VJUNOS=leaf2 leaf3 spine1

include ../common/clab.mk
include ../common/containers.mk
include ../common/quicklab.mk
include ../common/overlay.mk

# The underlay: every vJunos-switch reaches the loopback of every switch from
# its own loopback (10.0.0.<id>, id as in ip-fabric.xml). The spines share an
# AS, so a spine does not reach the other spine's loopback.
LOOPBACKS=10.0.0.1 10.0.0.2 10.0.0.3 10.0.0.11 10.0.0.12
VJUNOS_IDS=leaf2:2 leaf3:3 spine1:11

.PHONY: check-underlay
check-underlay:
	@set -e; for sw in $(VJUNOS_IDS); do name=$${sw%%:*}; id=$${sw##*:}; \
		for lo in $(LOOPBACKS); do \
			case $$name:$$lo in spine*:10.0.0.1?) continue;; esac; \
			out=$$($(call vjunos_cli,$$name,ping $$lo source 10.0.0.$$id count 3 rapid)); \
			echo "$$out" | grep -q "3 packets received" || { echo "FAIL: $$name -> $$lo"; echo "$$out"; exit 1; }; \
			echo "ok: $$name -> $$lo"; \
		done; \
	done

