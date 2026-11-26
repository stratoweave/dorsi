/* Acton impl hash: 098395d0dd92c4df5b971b2ab1245c694276216909db38a7782d2f3cc99e8830 */
#pragma once
#include "builtin/builtin.h"
#include "rts/rts.h"
#include "out/types/file.h"
#include "out/types/stratoweave/build.h"
#include "out/types/stratoweave/device_schema.h"
#include "out/types/stratoweave/swyang.h"
#include "out/types/tmf/tmf_yang.h"
struct dorsi_genQ_dorsi_genQ_main;
typedef struct $Cont_R2 *dorsi_genQ_dorsi_genQ_L_8Cont;
typedef struct $Cont_R7 *dorsi_genQ_dorsi_genQ_L_9Cont;
typedef struct $Cont_R6 *dorsi_genQ_dorsi_genQ_L_10Cont;
typedef struct $Cont_R5 *dorsi_genQ_dorsi_genQ_L_11Cont;
typedef struct $Cont_R4 *dorsi_genQ_dorsi_genQ_L_12Cont;
typedef struct $Cont_R3 *dorsi_genQ_dorsi_genQ_L_13Cont;
typedef struct $Cont_R3 *dorsi_genQ_dorsi_genQ_L_14Cont;
typedef struct $Proc0_R2 *dorsi_genQ_dorsi_genQ_L_16proc;
typedef struct dorsi_genQ_dorsi_genQ_main *dorsi_genQ_dorsi_genQ_main;
$R dorsi_genQ_dorsi_genQ_L_7C_16cont (B_Env, $Cont, B_NoneType);
$R dorsi_genQ_dorsi_genQ_L_6C_14cont (stratoweaveQ_buildQ_Layer, stratoweaveQ_buildQ_Layer, stratoweaveQ_buildQ_DeviceType, stratoweaveQ_buildQ_DeviceType, dorsi_genQ_dorsi_genQ_main, B_Env, $Cont, stratoweaveQ_buildQ_DeviceType);
$R dorsi_genQ_dorsi_genQ_L_5C_12cont (stratoweaveQ_buildQ_Layer, stratoweaveQ_buildQ_Layer, stratoweaveQ_buildQ_DeviceType, dorsi_genQ_dorsi_genQ_main, B_Env, $Cont, stratoweaveQ_buildQ_DeviceType);
$R dorsi_genQ_dorsi_genQ_L_4C_10cont (stratoweaveQ_buildQ_Layer, stratoweaveQ_buildQ_Layer, dorsi_genQ_dorsi_genQ_main, B_Env, $Cont, stratoweaveQ_buildQ_DeviceType);
$R dorsi_genQ_dorsi_genQ_L_3C_8cont (stratoweaveQ_buildQ_Layer, dorsi_genQ_dorsi_genQ_main, B_Env, $Cont, stratoweaveQ_buildQ_Layer);
$R dorsi_genQ_dorsi_genQ_L_2C_6cont (dorsi_genQ_dorsi_genQ_main, B_Env, $Cont, stratoweaveQ_buildQ_Layer);
$R dorsi_genQ_dorsi_genQ_L_1C_4try (dorsi_genQ_dorsi_genQ_main, B_Env, $Cont, bool);
$R dorsi_genQ_dorsi_genQ_L_15C_18cont ($Cont, dorsi_genQ_dorsi_genQ_main, B_NoneType);
struct dorsi_genQ_dorsi_genQ_mainG_class {
    char *$GCINFO;
    int $class_id;
    $SuperG_class $superclass;
    $R (*__init__) (dorsi_genQ_dorsi_genQ_main, $Cont, B_Env);
    void (*__serialize__) (dorsi_genQ_dorsi_genQ_main, $Serial$state);
    dorsi_genQ_dorsi_genQ_main (*__deserialize__) (dorsi_genQ_dorsi_genQ_main, $Serial$state);
    bool (*__bool__) (dorsi_genQ_dorsi_genQ_main);
    B_str (*__str__) (dorsi_genQ_dorsi_genQ_main);
    B_str (*__repr__) (dorsi_genQ_dorsi_genQ_main);
    B_NoneType (*__resume__) (dorsi_genQ_dorsi_genQ_main);
    B_NoneType (*__cleanup__) (dorsi_genQ_dorsi_genQ_main);
};
struct dorsi_genQ_dorsi_genQ_main {
    struct dorsi_genQ_dorsi_genQ_mainG_class *$class;
    $Actor $next;
    B_Msg $msg;
    B_Msg $msg_tail;
    $Lock $msg_lock;
    $int64 $affinity;
    B_Msg $outgoing;
    B_Msg $waitsfor;
    $int64 $consume_hd;
    $Catcher $catcher;
    $int64 $globkey;
    fileQ_FileCap fc;
    B_list crpd_order_paths;
    B_list xr_paths;
    B_list crpd_paths;
    B_list srl_paths;
    B_list broken_leafrefs;
};
$R dorsi_genQ_dorsi_genQ_mainG_newact ($Cont, B_Env);
extern struct $ContClass dorsi_genQ_dorsi_genQ_L_8ContG_methods;
$R dorsi_genQ_dorsi_genQ_L_8ContD___call__($Cont $closure, $WORD $result);
$Cont dorsi_genQ_dorsi_genQ_L_8ContD___deserialize__($Cont self, $Serial$state state);
extern struct $ContClass dorsi_genQ_dorsi_genQ_L_9ContG_methods;
$R dorsi_genQ_dorsi_genQ_L_9ContD___call__($Cont $closure, $WORD $result);
$Cont dorsi_genQ_dorsi_genQ_L_9ContD___deserialize__($Cont self, $Serial$state state);
extern struct $ContClass dorsi_genQ_dorsi_genQ_L_10ContG_methods;
$R dorsi_genQ_dorsi_genQ_L_10ContD___call__($Cont $closure, $WORD $result);
$Cont dorsi_genQ_dorsi_genQ_L_10ContD___deserialize__($Cont self, $Serial$state state);
extern struct $ContClass dorsi_genQ_dorsi_genQ_L_11ContG_methods;
$R dorsi_genQ_dorsi_genQ_L_11ContD___call__($Cont $closure, $WORD $result);
$Cont dorsi_genQ_dorsi_genQ_L_11ContD___deserialize__($Cont self, $Serial$state state);
extern struct $ContClass dorsi_genQ_dorsi_genQ_L_12ContG_methods;
$R dorsi_genQ_dorsi_genQ_L_12ContD___call__($Cont $closure, $WORD $result);
$Cont dorsi_genQ_dorsi_genQ_L_12ContD___deserialize__($Cont self, $Serial$state state);
extern struct $ContClass dorsi_genQ_dorsi_genQ_L_13ContG_methods;
$R dorsi_genQ_dorsi_genQ_L_13ContD___call__($Cont $closure, $WORD $result);
$Cont dorsi_genQ_dorsi_genQ_L_13ContD___deserialize__($Cont self, $Serial$state state);
extern struct $ContClass dorsi_genQ_dorsi_genQ_L_14ContG_methods;
$R dorsi_genQ_dorsi_genQ_L_14ContD___call__($Cont $closure, $WORD $result);
$Cont dorsi_genQ_dorsi_genQ_L_14ContD___deserialize__($Cont self, $Serial$state state);
extern struct $Proc0Class dorsi_genQ_dorsi_genQ_L_16procG_methods;
$R dorsi_genQ_dorsi_genQ_L_16procD___call__($proc $closure, $Cont $continuation);
$proc dorsi_genQ_dorsi_genQ_L_16procD___deserialize__($proc self, $Serial$state state);
extern struct dorsi_genQ_dorsi_genQ_mainG_class dorsi_genQ_dorsi_genQ_mainG_methods;
$R dorsi_genQ_dorsi_genQ_mainG_new($Cont, B_Env);
$R dorsi_genQ_dorsi_genQ_mainD___init__(dorsi_genQ_dorsi_genQ_main self, $Cont C_cont, B_Env env);
void dorsi_genQ_dorsi_genQ___init__ ();