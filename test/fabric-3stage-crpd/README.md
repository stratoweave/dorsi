# Fabric 3-stage, Juniper cRPD

The [fabric-3stage](../fabric-3stage/README.md) lab with every switch running
Juniper cRPD 24.4R1.9 (`JuniperCRPD_24_4R1_9`): three leaves, each connected to
both of the two spines. It is the underlay only: cRPD routes for the Linux of
its container and dorsi does not yet bridge server traffic on it, so the
servers are single-homed and only their ports are configured.

cRPD routes for the interfaces of its container, `ethN`, and its configuration
becomes Linux configuration: the addresses, the MTU of the fabric ports and
the routes, with every equal-cost path of a route in the kernel. Its
management address on `eth0` comes from the container and is not in its
configuration, so the switches need no `management-address`.

The fabric is described in `ip-fabric.xml`.

## Management addresses

`172.31.39.0/24`: leaf1 to leaf3 are `.11` to `.13`, spine1 and spine2 `.21`
and `.22`, the servers `.31` to `.33` and sweave `.10`.

## Links

| Lower switch | Port | Upper switch | Port |
|---|---|---|---|
| leaf1 | `eth49` | spine1 | `eth1` |
| leaf1 | `eth50` | spine2 | `eth1` |
| leaf2 | `eth49` | spine1 | `eth2` |
| leaf2 | `eth50` | spine2 | `eth2` |
| leaf3 | `eth49` | spine1 | `eth3` |
| leaf3 | `eth50` | spine2 | `eth3` |

## Servers

| Server | Profile | Leaf | Port | Server port |
|---|---|---|---|---|
| server1 | single-homed | leaf1 | `eth1` | `eth1` |
| server2 | single-homed | leaf2 | `eth1` | `eth1` |
| server3 | single-homed | leaf3 | `eth1` | `eth1` |

## State

cRPD serves no OpenConfig and no state over NETCONF `<get>`, only the replies
of Junos RPCs, so dorsi polls them every 5 s instead of subscribing:

* the port from `get-interfaces-routing` (`show interfaces routing`), Up or
  Down as rpd sees it, which follows the carrier. `get-interface-information`
  would answer with the text of `ip address show`, whose `<BROADCAST,...>`
  cRPD does not escape, so the reply is not XML;
* the LLDP neighbor from `get-lldp-interface-neighbors`; LLDP names the port
  (`port-id-subtype interface-name`), as SR Linux and EOS do;
* the eBGP session from `get-bgp-neighbor-information`.

## Status

The lab has been deployed with `ip-fabric.xml`: all twelve eBGP sessions come
up, every loopback reaches the loopback of every switch of another AS, the
leaves have both spines as paths to each other, a 9000 byte packet crosses
every fabric link unfragmented, and dorsi reports every fabric link up with
its BGP session up and its cabling ok, and every server port up. cRPD runs
and commits this without a license.

A link cut from the other end (`ip link set eth1 down` on spine1) reads down
with its session down, a paused switch (`docker pause`) unknown after 20 s,
and both come back. A fabric link removed over RESTCONF leaves the
configuration of both ends and the state of the fabric; added back, it comes
up again. cRPD keeps the MTU of a removed fabric port at 9000 in Linux.

## Running it

The image is in the private registry `ghcr.io/stratoweave/crpd:24.4r1.9`; it
has an arm64 variant, which `docker pull` may skip on an Apple Silicon Mac:
`docker pull --platform linux/arm64 ghcr.io/stratoweave/crpd:24.4r1.9`.

```sh
WEBUI_PORT=3000 CI=true make start
make -C ../.. build-linux-aarch64   # or build-linux-x86_64
make copy CONFIG=ip-fabric.xml
docker exec -d dorsi-fabric-3stage-crpd-sweave sh -c '/dorsi ip-fabric.xml > /dorsi.log 2>&1'
```

Each cRPD takes about 300 MiB, far less than an SR Linux or cEOS switch.
