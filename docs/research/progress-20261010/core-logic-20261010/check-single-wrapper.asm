/ fcn.18000fdb0();
|           ; var unknown_t var_78h @ stack - 0x78
|           ; var unknown_t var_70h @ stack - 0x70
|           ; var unknown_t var_68h @ stack - 0x68
|           ; var unknown_t var_60h @ stack - 0x60
|           ; var unknown_t var_48h @ stack - 0x48
|           ; var unknown_t var_40h @ stack - 0x40
|           ; var unknown_t var_38h @ stack - 0x38
|           ; var unknown_t var_30h @ stack - 0x30
|           ; var unknown_t var_28h @ stack - 0x28
|           ; var unknown_t var_20h @ stack - 0x20
|           0x18000fdb0      push  rbx
|           0x18000fdb2      push  rsi
|           0x18000fdb3      push  rdi
|           0x18000fdb4      sub   rsp, 0x80
|           0x18000fdbb      mov   rax, qword [section..data]          ; [0x18002f000:8]=0x2b992ddfa232 ; "2\xa2\xdf-\x99+"
|           0x18000fdc2      xor   rax, rsp
|           0x18000fdc5      mov   qword [var_20h], rax
|           0x18000fdca      mov   qword [var_28h], 0x00
|           0x18000fdd3      lea   rax, qword [0x180031068]
|           0x18000fdda      mov   qword [var_38h], rax
|           0x18000fddf      lea   rax, qword [0x180031110]
|           0x18000fde6      mov   qword [var_30h], rax
|           0x18000fdeb      xorps xmm0, xmm0
|           0x18000fdee      lea   r10, qword [rdx+r8*8]
|           0x18000fdf2      mov   rbx, r8
|           0x18000fdf5      mov   rsi, rcx
|           0x18000fdf8      movdqu xmmword [var_48h], xmm0
|           0x18000fdfe      test  r9, r9
|       ,=< 0x18000fe01      jz    0x18000feb5
|       |   0x18000fe07      mov   r8, qword [r9+0x10]
|       |   0x18000fe0b      test  r8, r8
|      ,==< 0x18000fe0e      js    0x18000fefe
|     ,===< 0x18000fe14      jle   0x18000feb5
|     |||   0x18000fe1a      mov   rax, rbx
|     |||   0x18000fe1d      test  rbx, rbx
|    ,====< 0x18000fe20      jz    0x18000fe55
|    ||||   0x18000fe22      sub   rax, 0x01
|   ,=====< 0x18000fe26      jz    0x18000fe44
|   |||||   0x18000fe28      cmp   rax, 0x01                           ; 1
|  ,======< 0x18000fe2c      jnz   0x18000febf
|  ||||||   0x18000fe32      mov   rax, qword [rdx+0x08]
|  ||||||   0x18000fe36      mov   ecx, dword [rax]
|  ||||||   0x18000fe38      add   ecx, 0x01
| ,=======< 0x18000fe3b      jz    0x18000fe3f
| |||||||   0x18000fe3d      mov   dword [rax], ecx
| `-------> 0x18000fe3f      mov   qword [var_40h], rax
|  |`-----> 0x18000fe44      mov   rax, qword [rdx]
|  | ||||   0x18000fe47      mov   ecx, dword [rax]
|  | ||||   0x18000fe49      add   ecx, 0x01
|  |,=====< 0x18000fe4c      jz    0x18000fe50
|  ||||||   0x18000fe4e      mov   dword [rax], ecx
|  |`-----> 0x18000fe50      mov   qword [var_48h], rax
|  | `----> 0x18000fe55      lea   rax, qword [var_48h]
|  |  |||   0x18000fe5a      mov   rdx, r10
|  |  |||   0x18000fe5d      lea   rdi, qword str.check_single_item    ; 0x180028c10 ; "_check_single_item"
|  |  |||   0x18000fe64      mov   rcx, r9
|  |  |||   0x18000fe67      mov   qword [var_60h], rdi
|  |  |||   0x18000fe6c      mov   qword [var_68h], r8
|  |  |||   0x18000fe71      lea   r8, qword [var_38h]
|  |  |||   0x18000fe76      mov   qword [var_70h], rbx
|  |  |||   0x18000fe7b      mov   qword [var_78h], rax
|  |  |||   0x18000fe80      call  0x180020820
|  |  |||   0x18000fe85      test  eax, eax
|  | ,====< 0x18000fe87      js    0x18000fefe
|  | ||||   0x18000fe89      cmp   rbx, 0x02                           ; 2
|  |,=====< 0x18000fe8d      jnl   0x18000fea1
|  ||||||   0x18000fe8f      nop
| .-------> 0x18000fe90      cmp   qword [rsp+rbx*8+0x50], 0x00
| ========< 0x18000fe96      jz    0x18000feb0
| :||||||   0x18000fe98      inc   rbx
| :||||||   0x18000fe9b      cmp   rbx, 0x02                           ; 2
| `=======< 0x18000fe9f      jl    0x18000fe90
|  |`-----> 0x18000fea1      mov   rbx, qword [var_40h]
|  | ||||   0x18000fea6      mov   rdi, qword [var_48h]
|  |,=====< 0x18000feab      jmp   0x18000ff6d
| --------> 0x18000feb0      mov   r8, rdi
| ,=======< 0x18000feb3      jmp   0x18000fec6
| ||||`-`-> 0x18000feb5      cmp   rbx, 0x02                           ; 2
| |||| |,=< 0x18000feb9      jz    0x18000ff54
| |`------> 0x18000febf      lea   r8, qword str.check_single_item     ; 0x180028c10 ; "_check_single_item"
| | || ||   ; CODE XREF from fcn.18000fdb0 @ 0x18000feb3
| `-------> 0x18000fec6      mov   rcx, qword [sym.imp.python312.dll_PyExc_TypeError] ; [0x180028490:8]=0x2e0c0
|   || ||   0x18000fecd      lea   rax, qword [0x18002a280]            ; "s"
|   || ||   0x18000fed4      mov   qword [var_68h], rbx
|   || ||   0x18000fed9      lea   r9, qword str.exactly               ; 0x18002a278 ; "exactly"
|   || ||   0x18000fee0      mov   qword [var_70h], rax
|   || ||   0x18000fee5      lea   rdx, qword str..200s___takes__.8s__zd_positional_argument_.1s___zd_given ; 0x18002a288 ; "%.200s() takes %.8s %zd positional argument%.1s (%zd given)"
|   || ||   0x18000feec      mov   qword [var_78h], 0x02
|   || ||   0x18000fef5      mov   rcx, qword [rcx]
|   || ||   0x18000fef8      call  qword [sym.imp.python312.dll_PyErr_Format] ; [0x180028240:8]=0x2dabc
|   |`-`--> 0x18000fefe      mov   rbx, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
|   |   |   0x18000ff05      mov   rcx, qword [var_48h]
|   |   |   0x18000ff0a      test  rcx, rcx
|   |  ,==< 0x18000ff0d      jz    0x18000ff20
|   |  ||   0x18000ff0f      cmp   dword [rcx], 0x00
|   | ,===< 0x18000ff12      jl    0x18000ff20
|   | |||   0x18000ff14      sub   qword [rcx], 0x01
|   |,====< 0x18000ff18      jnz   0x18000ff20
|   |||||   0x18000ff1a      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
|   |```--> 0x18000ff20      mov   rcx, qword [var_40h]
|   |   |   0x18000ff25      test  rcx, rcx
|   |  ,==< 0x18000ff28      jz    0x18000ff3b
|   |  ||   0x18000ff2a      cmp   dword [rcx], 0x00
|   | ,===< 0x18000ff2d      jl    0x18000ff3b
|   | |||   0x18000ff2f      sub   qword [rcx], 0x01
|   |,====< 0x18000ff33      jnz   0x18000ff3b
|   |||||   0x18000ff35      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
|   |```--> 0x18000ff3b      mov   r9, rbx
|   |   |   0x18000ff3e      lea   rcx, qword str.modules.jet_test._core._check_single_item ; 0x180028c28 ; "modules.jet_test._core._check_single_item"
|   |   |   0x18000ff45      mov   r8d, 0x107                          ; 263
|   |   |   0x18000ff4b      call  0x1800242d0
|   |   |   0x18000ff50      xor   eax, eax
|   |  ,==< 0x18000ff52      jmp   0x18000ffb3
|   |  |`-> 0x18000ff54      mov   rdi, qword [rdx]
|   |  |    0x18000ff57      mov   eax, dword [rdi]
|   |  |    0x18000ff59      add   eax, 0x01
|   |  |,=< 0x18000ff5c      jz    0x18000ff60
|   |  ||   0x18000ff5e      mov   dword [rdi], eax
|   |  |`-> 0x18000ff60      mov   rbx, qword [rdx+0x08]
|   |  |    0x18000ff64      mov   eax, dword [rbx]
|   |  |    0x18000ff66      add   eax, 0x01
|   |  |,=< 0x18000ff69      jz    0x18000ff6d
|   |  ||   0x18000ff6b      mov   dword [rbx], eax
|   |  ||   ; CODE XREF from fcn.18000fdb0 @ 0x18000feab
|   `---`-> 0x18000ff6d      mov   r8, rbx
|      |    0x18000ff70      mov   rdx, rdi
|      |    0x18000ff73      mov   rcx, rsi
|      |    0x18000ff76      call  0x18000ffd0
|      |    0x18000ff7b      mov   rsi, rax
|      |    0x18000ff7e      test  rdi, rdi
|      |,=< 0x18000ff81      jz    0x18000ff97
|      ||   0x18000ff83      cmp   dword [rdi], 0x00
|     ,===< 0x18000ff86      jl    0x18000ff97
|     |||   0x18000ff88      sub   qword [rdi], 0x01
|    ,====< 0x18000ff8c      jnz   0x18000ff97
|    ||||   0x18000ff8e      mov   rcx, rdi
|    ||||   0x18000ff91      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
|    ``-`-> 0x18000ff97      test  rbx, rbx
|      |,=< 0x18000ff9a      jz    0x18000ffb0
|      ||   0x18000ff9c      cmp   dword [rbx], 0x00
|     ,===< 0x18000ff9f      jl    0x18000ffb0
|     |||   0x18000ffa1      sub   qword [rbx], 0x01
|    ,====< 0x18000ffa5      jnz   0x18000ffb0
|    ||||   0x18000ffa7      mov   rcx, rbx
|    ||||   0x18000ffaa      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
|    ``-`-> 0x18000ffb0      mov   rax, rsi
|      |    ; CODE XREF from fcn.18000fdb0 @ 0x18000ff52
|      `--> 0x18000ffb3      mov   rcx, qword [var_20h]
|           0x18000ffb8      xor   rcx, rsp
|           0x18000ffbb      call  0x180026430
|           0x18000ffc0      add   rsp, 0x80
|           0x18000ffc7      pop   rdi
|           0x18000ffc8      pop   rsi
|           0x18000ffc9      pop   rbx
\           0x18000ffca      ret
