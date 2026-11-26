#include "rts/common.h"
#include "out/types/dorsi_gen/dorsi_gen.h"
void $ROOTINIT () {
    dorsi_genQ_dorsi_genQ___init__();
}
$Actor $ROOT () {
    return ($Actor)$NEWACTOR(dorsi_genQ_dorsi_genQ_main);
}