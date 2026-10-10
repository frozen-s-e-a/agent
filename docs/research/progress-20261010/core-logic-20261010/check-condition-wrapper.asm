/ fcn.180011e60();
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
|           0x180011e60      push  rbx
|           0x180011e62      push  rsi
|           0x180011e63      push  rdi
|           0x180011e64      sub   rsp, 0x80
|           0x180011e6b      mov   rax, qword [section..data]          ; [0x18002f000:8]=0x2b992ddfa232 ; "2\xa2\xdf-\x99+"
|           0x180011e72      xor   rax, rsp
|           0x180011e75      mov   qword [var_20h], rax
|           0x180011e7a      mov   qword [var_28h], 0x00
|           0x180011e83      lea   rax, qword [0x180031068]
|           0x180011e8a      mov   qword [var_38h], rax
|           0x180011e8f      lea   rax, qword [0x180031028]
|           0x180011e96      mov   qword [var_30h], rax
|           0x180011e9b      xorps xmm0, xmm0
|           0x180011e9e      lea   r10, qword [rdx+r8*8]
|           0x180011ea2      mov   rbx, r8
|           0x180011ea5      mov   rsi, rcx
|           0x180011ea8      movdqu xmmword [var_48h], xmm0
|           0x180011eae      test  r9, r9
|       ,=< 0x180011eb1      jz    0x180011f65
|       |   0x180011eb7      mov   r8, qword [r9+0x10]
|       |   0x180011ebb      test  r8, r8
|      ,==< 0x180011ebe      js    0x180011fae
|     ,===< 0x180011ec4      jle   0x180011f65
|     |||   0x180011eca      mov   rax, rbx
|     |||   0x180011ecd      test  rbx, rbx
|    ,====< 0x180011ed0      jz    0x180011f05
|    ||||   0x180011ed2      sub   rax, 0x01
|   ,=====< 0x180011ed6      jz    0x180011ef4
|   |||||   0x180011ed8      cmp   rax, 0x01                           ; 1
|  ,======< 0x180011edc      jnz   0x180011f6f
|  ||||||   0x180011ee2      mov   rax, qword [rdx+0x08]
|  ||||||   0x180011ee6      mov   ecx, dword [rax]
|  ||||||   0x180011ee8      add   ecx, 0x01
| ,=======< 0x180011eeb      jz    0x180011eef
| |||||||   0x180011eed      mov   dword [rax], ecx
| `-------> 0x180011eef      mov   qword [var_40h], rax
|  |`-----> 0x180011ef4      mov   rax, qword [rdx]
|  | ||||   0x180011ef7      mov   ecx, dword [rax]
|  | ||||   0x180011ef9      add   ecx, 0x01
|  |,=====< 0x180011efc      jz    0x180011f00
|  ||||||   0x180011efe      mov   dword [rax], ecx
|  |`-----> 0x180011f00      mov   qword [var_48h], rax
|  | `----> 0x180011f05      lea   rax, qword [var_48h]
|  |  |||   0x180011f0a      mov   rdx, r10
|  |  |||   0x180011f0d      lea   rdi, qword str.check_condition      ; 0x180028c58 ; "_check_condition"
|  |  |||   0x180011f14      mov   rcx, r9
|  |  |||   0x180011f17      mov   qword [var_60h], rdi
|  |  |||   0x180011f1c      mov   qword [var_68h], r8
|  |  |||   0x180011f21      lea   r8, qword [var_38h]
|  |  |||   0x180011f26      mov   qword [var_70h], rbx
|  |  |||   0x180011f2b      mov   qword [var_78h], rax
|  |  |||   0x180011f30      call  0x180020820
|  |  |||   0x180011f35      test  eax, eax
|  | ,====< 0x180011f37      js    0x180011fae
|  | ||||   0x180011f39      cmp   rbx, 0x02                           ; 2
|  |,=====< 0x180011f3d      jnl   0x180011f51
|  ||||||   0x180011f3f      nop
| .-------> 0x180011f40      cmp   qword [rsp+rbx*8+0x50], 0x00
| ========< 0x180011f46      jz    0x180011f60
| :||||||   0x180011f48      inc   rbx
| :||||||   0x180011f4b      cmp   rbx, 0x02                           ; 2
| `=======< 0x180011f4f      jl    0x180011f40
|  |`-----> 0x180011f51      mov   rbx, qword [var_40h]
|  | ||||   0x180011f56      mov   rdi, qword [var_48h]
|  |,=====< 0x180011f5b      jmp   0x18001201d
| --------> 0x180011f60      mov   r8, rdi
| ,=======< 0x180011f63      jmp   0x180011f76
| ||||`-`-> 0x180011f65      cmp   rbx, 0x02                           ; 2
| |||| |,=< 0x180011f69      jz    0x180012004
| |`------> 0x180011f6f      lea   r8, qword str.check_condition       ; 0x180028c58 ; "_check_condition"
| | || ||   ; CODE XREF from fcn.180011e60 @ 0x180011f63
| `-------> 0x180011f76      mov   rcx, qword [sym.imp.python312.dll_PyExc_TypeError] ; [0x180028490:8]=0x2e0c0
|   || ||   0x180011f7d      lea   rax, qword [0x18002a280]            ; "s"
|   || ||   0x180011f84      mov   qword [var_68h], rbx
|   || ||   0x180011f89      lea   r9, qword str.exactly               ; 0x18002a278 ; "exactly"
|   || ||   0x180011f90      mov   qword [var_70h], rax
|   || ||   0x180011f95      lea   rdx, qword str..200s___takes__.8s__zd_positional_argument_.1s___zd_given ; 0x18002a288 ; "%.200s() takes %.8s %zd positional argument%.1s (%zd given)"
|   || ||   0x180011f9c      mov   qword [var_78h], 0x02
|   || ||   0x180011fa5      mov   rcx, qword [rcx]
|   || ||   0x180011fa8      call  qword [sym.imp.python312.dll_PyErr_Format] ; [0x180028240:8]=0x2dabc
|   |`-`--> 0x180011fae      mov   rbx, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
|   |   |   0x180011fb5      mov   rcx, qword [var_48h]
|   |   |   0x180011fba      test  rcx, rcx
|   |  ,==< 0x180011fbd      jz    0x180011fd0
|   |  ||   0x180011fbf      cmp   dword [rcx], 0x00
|   | ,===< 0x180011fc2      jl    0x180011fd0
|   | |||   0x180011fc4      sub   qword [rcx], 0x01
|   |,====< 0x180011fc8      jnz   0x180011fd0
|   |||||   0x180011fca      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
|   |```--> 0x180011fd0      mov   rcx, qword [var_40h]
|   |   |   0x180011fd5      test  rcx, rcx
|   |  ,==< 0x180011fd8      jz    0x180011feb
|   |  ||   0x180011fda      cmp   dword [rcx], 0x00
|   | ,===< 0x180011fdd      jl    0x180011feb
|   | |||   0x180011fdf      sub   qword [rcx], 0x01
|   |,====< 0x180011fe3      jnz   0x180011feb
|   |||||   0x180011fe5      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
|   |```--> 0x180011feb      mov   r9, rbx
|   |   |   0x180011fee      lea   rcx, qword str.modules.jet_test._core._check_condition ; 0x180028c70 ; "modules.jet_test._core._check_condition"
|   |   |   0x180011ff5      mov   r8d, 0x125                          ; 293
|   |   |   0x180011ffb      call  0x1800242d0
|   |   |   0x180012000      xor   eax, eax
|   |  ,==< 0x180012002      jmp   0x180012063
|   |  |`-> 0x180012004      mov   rdi, qword [rdx]
|   |  |    0x180012007      mov   eax, dword [rdi]
|   |  |    0x180012009      add   eax, 0x01
|   |  |,=< 0x18001200c      jz    0x180012010
|   |  ||   0x18001200e      mov   dword [rdi], eax
|   |  |`-> 0x180012010      mov   rbx, qword [rdx+0x08]
|   |  |    0x180012014      mov   eax, dword [rbx]
|   |  |    0x180012016      add   eax, 0x01
|   |  |,=< 0x180012019      jz    0x18001201d
|   |  ||   0x18001201b      mov   dword [rbx], eax
|   |  ||   ; CODE XREF from fcn.180011e60 @ 0x180011f5b
|   `---`-> 0x18001201d      mov   r8, rbx
|      |    0x180012020      mov   rdx, rdi
|      |    0x180012023      mov   rcx, rsi
|      |    0x180012026      call  0x180012080
|      |    0x18001202b      mov   rsi, rax
|      |    0x18001202e      test  rdi, rdi
|      |,=< 0x180012031      jz    0x180012047
|      ||   0x180012033      cmp   dword [rdi], 0x00
|     ,===< 0x180012036      jl    0x180012047
|     |||   0x180012038      sub   qword [rdi], 0x01
|    ,====< 0x18001203c      jnz   0x180012047
|    ||||   0x18001203e      mov   rcx, rdi
|    ||||   0x180012041      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
|    ``-`-> 0x180012047      test  rbx, rbx
|      |,=< 0x18001204a      jz    0x180012060
|      ||   0x18001204c      cmp   dword [rbx], 0x00
|     ,===< 0x18001204f      jl    0x180012060
|     |||   0x180012051      sub   qword [rbx], 0x01
|    ,====< 0x180012055      jnz   0x180012060
|    ||||   0x180012057      mov   rcx, rbx
|    ||||   0x18001205a      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
|    ``-`-> 0x180012060      mov   rax, rsi
|      |    ; CODE XREF from fcn.180011e60 @ 0x180012002
|      `--> 0x180012063      mov   rcx, qword [var_20h]
|           0x180012068      xor   rcx, rsp
|           0x18001206b      call  0x180026430
|           0x180012070      add   rsp, 0x80
|           0x180012077      pop   rdi
|           0x180012078      pop   rsi
|           0x180012079      pop   rbx
\           0x18001207a      ret
