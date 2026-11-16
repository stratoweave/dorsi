# Fabric 3-stage, mixed vendors

The [fabric-3stage](../fabric-3stage/README.md) lab with two of its switches
replaced by Arista cEOS: three leaves, each connected to both of the two
spines, with every kind of link: Nokia–Arista in both directions (leaf1 and
leaf2 to spine2, leaf3 to spine1) and Arista–Arista (leaf3 to spine2).

| Switch | Vendor | Type |
|---|---|---|
| leaf1, leaf2, spine1 | Nokia SR Linux 25.3.2 | `NokiaSRLinux_25_3_2` |
| leaf3, spine2 | Arista cEOS-lab 4.36.3.2M | `AristaEOS_4_36_3_2M` |

The fabric is described in `ip-fabric.xml`. cEOS names its ports `EthernetN`
(the container interface `ethN`), SR Linux `ethernet-1/N`.

## Management addresses

The lab pins its management addresses in `172.31.36.0/24`, outside the
`172.16.0.0/12` networks containerlab picks for other labs: leaf1 to leaf3 are
`.11` to `.13`, spine1 and spine2 `.21` and `.22`, the servers `.31` to `.33`
and sweave `.10`. cEOS keeps its management address in configuration that dorsi
manages, so the cEOS switches carry theirs as `management-address` in
`ip-fabric.xml`; without it dorsi would remove the address from Management0 and
lose the switch. SR Linux takes its address from DHCP and needs none.

## Links

| Lower switch | Port | Upper switch | Port |
|---|---|---|---|
| leaf1 | `ethernet-1/49` | spine1 | `ethernet-1/1` |
| leaf1 | `ethernet-1/50` | spine2 | `Ethernet1` |
| leaf2 | `ethernet-1/49` | spine1 | `ethernet-1/2` |
| leaf2 | `ethernet-1/50` | spine2 | `Ethernet2` |
| leaf3 | `Ethernet49` | spine1 | `ethernet-1/3` |
| leaf3 | `Ethernet50` | spine2 | `Ethernet3` |

## Servers

| Server | Profile | Leaf | Port | Server port |
|---|---|---|---|---|
| server1 | dual-homed | leaf1 | `ethernet-1/1` | `eth1` |
| server1 | dual-homed | leaf2 | `ethernet-1/1` | `eth2` |
| server2 | dual-homed | leaf2 | `ethernet-1/2` | `eth1` |
| server2 | dual-homed | leaf3 | `Ethernet1` | `eth2` |
| server3 | single-homed | leaf3 | `Ethernet2` | `eth1` |

## Status

The topology and data match the `fabric_three_stage_mixed` transform test
(`src/dorsi/test_fabric.act`). The lab has been deployed with `ip-fabric.xml`:
all eBGP sessions come up, Nokia–Arista and Arista–Arista, ECMP and loopback
reachability work, and dorsi reports every fabric link up with its BGP session
up and its cabling ok, read over LLDP from both vendors. The management
addresses of the cEOS switches stay in place.

## The cEOS image

cEOS-lab is not in a public registry. Download it from
[arista.com](https://www.arista.com/en/support/software-download) (a free
account is enough): EOS → 4.36 → `EOS-4.36.3.2M` → cEOS-lab, the file
`cEOSarm-lab-4.36.3.2M.tar.xz` for ARM64 (Apple Silicon) or
`cEOS64-lab-4.36.3.2M.tar.xz` for x86_64, and check it against its
`.sha512sum`. Then:

```sh
docker import cEOSarm-lab-4.36.3.2M.tar.xz ceos:4.36.3.2M
```

If the Docker daemon has no `xz` (`exec: "xz": executable file not found`),
decompress on the host instead: `xz -dc <file> | docker import - ceos:4.36.3.2M`.

`ceos-startup.partial.cfg` is merged into the default configuration
containerlab generates for cEOS. It adds the `clab` user that the SR Linux
nodes have and turns on NETCONF on port 830.

## Running it

```sh
WEBUI_PORT=3200 CI=true make start
```

and once the switches have booted (cEOS answers `show management api netconf`
with "running", SR Linux takes longer):

```sh
make -C ../.. build-linux-aarch64   # or build-linux-x86_64
docker cp ../../out/bin/dorsi dorsi-fabric-3stage-mixed-sweave:/dorsi
docker cp ip-fabric.xml dorsi-fabric-3stage-mixed-sweave:/ip-fabric.xml
docker exec -d dorsi-fabric-3stage-mixed-sweave sh -c '/dorsi ip-fabric.xml > /dorsi.log 2>&1'
```

Stop other labs first: three SR Linux nodes and two cEOS nodes need most of
the memory the fabric-3stage lab does.
