# Fabric 5-stage, mixed vendors, SR Linux super-spine

The [fabric-5stage-mixed](../fabric-5stage-mixed/README.md) lab with the
super-spine on Nokia SR Linux instead of Arista cEOS, and a second, parallel
link between leaf1 and spine1, so that a link can fail without cutting leaf1
off. It is the lab the failure tests below were run on.

| Switch | Vendor | Role | Pod | Plane |
|---|---|---|---|---|
| leaf1 | Arista cEOS-lab 4.36.3.2M | leaf | pod-1 | |
| leaf2 | Nokia SR Linux 25.3.2 | leaf | pod-2 | |
| spine1 | Nokia SR Linux 25.3.2 | spine | pod-1 | plane-1 |
| spine2 | Arista cEOS-lab 4.36.3.2M | spine | pod-2 | plane-1 |
| superspine1 | Nokia SR Linux 25.3.2 | super-spine | | plane-1 |

The management addresses are in `172.31.38.0/24`, with the same host numbers
as in fabric-5stage-mixed.

## Links

| Lower switch | Port | Upper switch | Port |
|---|---|---|---|
| leaf1 | `Ethernet49` | spine1 | `ethernet-1/1` |
| leaf1 | `Ethernet50` | spine1 | `ethernet-1/2` |
| leaf2 | `ethernet-1/49` | spine2 | `Ethernet1` |
| spine1 | `ethernet-1/31` | superspine1 | `ethernet-1/1` |
| spine2 | `Ethernet31` | superspine1 | `ethernet-1/2` |

The servers are those of fabric-5stage-mixed.

## Status

Deployed with `ip-fabric.xml`: all five eBGP sessions come up, the super-spine
on SR Linux among them, all 20 loopback pairs ping, and leaf1 reaches leaf2
over both links to spine1 (ECMP).

### Failure tests

A link fails when one end goes down in the switch's network namespace, from
the SR Linux end: cEOS brings its own end back up within seconds.

| Test | Result |
|---|---|
| One of the two leaf1–spine1 links fails | Traffic from leaf1 to leaf2 moves to the other link without loss (0 of 400 pings lost). dorsi reports the BGP session down within 5 s and the link down within 20 s, and both up again 9 s after the link returns |
| spine2–superspine1, the only path between the pods, fails | The pods lose each other, and dorsi reports the link and its session down. Traffic returns 18.5 s after the link, and dorsi reports both up about 7 s after the session is established |
| spine2 hangs (`docker pause`) | After 20 s dorsi reports its links `unknown`; after the 90 s BGP hold time the neighbors' sessions are down and the LLDP neighbor is gone. 3 s after it resumes every link is up again |

The second test found that cEOS sent fabric traffic out of Management0 once the
fabric had no route for it, through the default route of the management
network in the default VRF. Management0 is now in the VRF `MGMT`, see
[fabric-3stage-mixed](../fabric-3stage-mixed/README.md#management-addresses);
with it, the traffic is dropped.

## Running it

As fabric-5stage-mixed, from this directory:

```sh
WEBUI_PORT=3200 CI=true make start
make -C ../.. build-linux-aarch64   # or build-linux-x86_64
docker cp ../../out/bin/dorsi dorsi-fabric-5stage-mixed-srlss-sweave:/dorsi
docker cp ip-fabric.xml dorsi-fabric-5stage-mixed-srlss-sweave:/ip-fabric.xml
docker exec -d dorsi-fabric-5stage-mixed-srlss-sweave sh -c '/dorsi ip-fabric.xml > /dorsi.log 2>&1'
```

To fail a link, take down the SR Linux end of it, for example spine1
`ethernet-1/1`, and bring it up again with `up`:

```sh
PID=$(docker inspect -f '{{.State.Pid}}' dorsi-fabric-5stage-mixed-srlss-spine1)
docker run --rm --privileged --pid=host --network none debian \
    nsenter -t 1 -m -- nsenter -t $PID -n ip link set e1-1 down
```
