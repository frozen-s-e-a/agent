/ fcn.180012080(unknown_t arg_8h);
|           ; var unknown_t var_228h @ stack - 0x228
|           ; var unknown_t var_220h @ stack - 0x220
|           ; var unknown_t var_218h @ stack - 0x218
|           ; var unknown_t var_210h @ stack - 0x210
|           ; var unknown_t var_208h @ stack - 0x208
|           ; var unknown_t var_200h @ stack - 0x200
|           ; var unknown_t var_1f8h @ stack - 0x1f8
|           ; var unknown_t var_1f0h @ stack - 0x1f0
|           ; var unknown_t var_1e8h @ stack - 0x1e8
|           ; var unknown_t var_1e0h @ stack - 0x1e0
|           ; var unknown_t var_1d8h @ stack - 0x1d8
|           ; var unknown_t var_1d0h @ stack - 0x1d0
|           ; var unknown_t var_1c8h @ stack - 0x1c8
|           ; var unknown_t var_1c0h @ stack - 0x1c0
|           ; var unknown_t var_1b8h @ stack - 0x1b8
|           ; var unknown_t var_1b0h @ stack - 0x1b0
|           ; var unknown_t var_1a8h @ stack - 0x1a8
|           ; var unknown_t var_1a0h @ stack - 0x1a0
|           ; var unknown_t var_198h @ stack - 0x198
|           ; var unknown_t var_190h @ stack - 0x190
|           ; var unknown_t var_188h @ stack - 0x188
|           ; var unknown_t var_180h @ stack - 0x180
|           ; var unknown_t var_178h @ stack - 0x178
|           ; var unknown_t var_170h @ stack - 0x170
|           ; var unknown_t var_168h @ stack - 0x168
|           ; var unknown_t var_160h @ stack - 0x160
|           ; var unknown_t var_150h @ stack - 0x150
|           ; var unknown_t var_148h @ stack - 0x148
|           ; var unknown_t var_140h @ stack - 0x140
|           ; var unknown_t var_138h @ stack - 0x138
|           ; var unknown_t var_130h @ stack - 0x130
|           ; var unknown_t var_128h @ stack - 0x128
|           ; var unknown_t var_120h @ stack - 0x120
|           ; var unknown_t var_118h @ stack - 0x118
|           ; var unknown_t var_110h @ stack - 0x110
|           ; var unknown_t var_108h @ stack - 0x108
|           ; var unknown_t var_100h @ stack - 0x100
|           ; var unknown_t var_f8h @ stack - 0xf8
|           ; var unknown_t var_f0h @ stack - 0xf0
|           ; var unknown_t var_e8h @ stack - 0xe8
|           ; var unknown_t var_e0h @ stack - 0xe0
|           ; var unknown_t var_d8h @ stack - 0xd8
|           ; var unknown_t var_d0h @ stack - 0xd0
|           ; var unknown_t var_c8h @ stack - 0xc8
|           ; var unknown_t var_c0h @ stack - 0xc0
|           ; var unknown_t var_b8h @ stack - 0xb8
|           ; var unknown_t var_b0h @ stack - 0xb0
|           ; var unknown_t var_a8h @ stack - 0xa8
|           ; var unknown_t var_a0h @ stack - 0xa0
|           ; var unknown_t var_98h @ stack - 0x98
|           ; var unknown_t var_90h @ stack - 0x90
|           ; var unknown_t var_88h @ stack - 0x88
|           ; var unknown_t var_80h @ stack - 0x80
|           ; var unknown_t var_78h @ stack - 0x78
|           ; var unknown_t var_70h @ stack - 0x70
|           ; var unknown_t var_68h @ stack - 0x68
|           ; var unknown_t var_60h @ stack - 0x60
|           ; var unknown_t var_58h @ stack - 0x58
|           ; var unknown_t var_50h @ stack - 0x50
|           ; var unknown_t var_48h @ stack - 0x48
|           ; var unknown_t var_40h @ stack - 0x40
|           ; arg unknown_t arg_8h @ stack + 0x8
|           0x180012080      mov   qword [arg_8h], rbx
|           0x180012085      push  rbp
|           0x180012086      push  rsi
|           0x180012087      push  rdi
|           0x180012088      push  r12
|           0x18001208a      push  r13
|           0x18001208c      push  r14
|           0x18001208e      push  r15
|           0x180012090      lea   rbp, qword [var_160h + 0x8]
|           0x180012098      sub   rsp, 0x220
|           0x18001209f      mov   rax, qword [section..data]          ; [0x18002f000:8]=0x2b992ddfa232 ; "2\xa2\xdf-\x99+"
|           0x1800120a6      xor   rax, rsp
|           0x1800120a9      mov   qword [var_40h], rax
|           0x1800120b0      mov   rcx, qword [0x180030f20]            ; [0x180030f20:8]=0
|           0x1800120b7      xor   r14d, r14d
|           0x1800120ba      mov   qword [var_1d8h], r14
|           0x1800120be      mov   r12d, r14d
|           0x1800120c1      mov   qword [var_1e8h], r14
|           0x1800120c6      mov   r13d, r14d
|           0x1800120c9      mov   qword [var_1e0h], r14
|           0x1800120ce      mov   r15d, r14d
|           0x1800120d1      mov   qword [var_218h], r14
|           0x1800120d6      mov   rsi, r8
|           0x1800120d9      mov   qword [var_210h], r14
|           0x1800120de      mov   qword [var_208h], r14
|           0x1800120e3      mov   qword [var_1d0h], r14
|           0x1800120e7      mov   qword [var_1a0h], r14
|           0x1800120eb      mov   qword [var_190h], r14
|           0x1800120ef      mov   qword [var_1c0h], r14
|           0x1800120f3      mov   qword [var_1c8h], r14
|           0x1800120f7      mov   qword [var_228h], rdx
|           0x1800120fc      call  0x180020950
|           0x180012101      mov   rdi, rax
|           0x180012104      test  rax, rax
|       ,=< 0x180012107      jnz   0x18001211a
|       |   0x180012109      mov   rsi, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
|       |   0x180012110      mov   ebx, 0x126                          ; 294
|      ,==< 0x180012115      jmp   0x180014173
|      |`-> 0x18001211a      mov   rax, qword [rax+0x08]
|      |    0x18001211e      mov   rcx, rdi
|      |    0x180012121      mov   rdx, qword [0x180030d98]            ; [0x180030d98:8]=0
|      |    0x180012128      mov   r8, qword [rax+0x90]
|      |    0x18001212f      test  r8, r8
|      |,=< 0x180012132      jz    0x180012139
|      ||   0x180012134      call  r8
|     ,===< 0x180012137      jmp   0x18001213f
|     ||`-> 0x180012139      call  qword [sym.imp.python312.dll_PyObject_GetAttr] ; [0x180028168:8]=0x2d8b6
|     ||    ; CODE XREF from fcn.180012080 @ 0x180012137
|     `---> 0x18001213f      mov   rbx, rax
|      |    0x180012142      mov   r14, rax
|      |    0x180012145      test  rax, rax
|      |,=< 0x180012148      jnz   0x18001215b
|      ||   0x18001214a      mov   rsi, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
|      ||   0x180012151      mov   ebx, 0x126                          ; 294
|     ,===< 0x180012156      jmp   0x1800140ed
|     ||`-> 0x18001215b      cmp   dword [rdi], r12d
|     ||,=< 0x18001215e      jl    0x18001216f
|     |||   0x180012160      sub   qword [rdi], 0x01
|    ,====< 0x180012164      jnz   0x18001216f
|    ||||   0x180012166      mov   rcx, rdi
|    ||||   0x180012169      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
|    `--`-> 0x18001216f      mov   rax, qword [sym.imp.python312.dll_PyMethod_Type] ; [0x180028290:8]=0x2db7e ; "~\xdb\U00000002"
|     ||    0x180012176      xor   edi, edi
|     ||    0x180012178      mov   ecx, 0x01
|     ||    0x18001217d      mov   qword [var_220h], rdi
|     ||    0x180012182      cmp   qword [rbx+0x08], rax
|     ||,=< 0x180012186      jnz   0x1800121b9
|     |||   0x180012188      mov   r15, qword [rbx+0x18]
|     |||   0x18001218c      mov   r14, qword [rbx+0x10]
|     |||   0x180012190      mov   eax, dword [r15]
|     |||   0x180012193      add   eax, ecx
|    ,====< 0x180012195      jz    0x18001219a
|    ||||   0x180012197      mov   dword [r15], eax
|    `----> 0x18001219a      mov   eax, dword [r14]
|     |||   0x18001219d      add   eax, ecx
|    ,====< 0x18001219f      jz    0x1800121a4
|    ||||   0x1800121a1      mov   dword [r14], eax
|    `----> 0x1800121a4      cmp   dword [rbx], edi
|    ,====< 0x1800121a6      jl    0x1800121b6
|    ||||   0x1800121a8      sub   qword [rbx], rcx
|   ,=====< 0x1800121ab      jnz   0x1800121b6
|   |||||   0x1800121ad      mov   rcx, rbx
|   |||||   0x1800121b0      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
|   ``----> 0x1800121b6      mov   rcx, rdi
|     ||`-> 0x1800121b9      mov   rax, rcx
|     ||    0x1800121bc      mov   qword [var_180h], r15
|     ||    0x1800121c0      neg   rax
|     ||    0x1800121c3      mov   qword [var_178h], rsi
|     ||    0x1800121c7      shl   rax, 0x3f
|     ||    0x1800121cb      lea   rdx, qword [var_180h]
|     ||    0x1800121cf      lea   rdx, qword [rdx+rcx*8]
|     ||    0x1800121d3      mov   r8d, 0x02
|     ||    0x1800121d9      sub   r8, rcx
|     ||    0x1800121dc      xor   r9d, r9d
|     ||    0x1800121df      or    r8, rax
|     ||    0x1800121e2      mov   rcx, r14
|     ||    0x1800121e5      call  0x18001fee0
|     ||    0x1800121ea      mov   rdi, rax
|     ||    0x1800121ed      test  r15, r15
|     ||,=< 0x1800121f0      jz    0x180012206
|     |||   0x1800121f2      cmp   dword [r15], r12d
|    ,====< 0x1800121f5      jl    0x180012206
|    ||||   0x1800121f7      sub   qword [r15], 0x01
|   ,=====< 0x1800121fb      jnz   0x180012206
|   |||||   0x1800121fd      mov   rcx, r15
|   |||||   0x180012200      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
|   ``--`-> 0x180012206      xor   r15d, r15d
|     ||    0x180012209      cmp   dword [r14], r12d
|     ||,=< 0x18001220c      jl    0x18001221d
|     |||   0x18001220e      sub   qword [r14], 0x01
|    ,====< 0x180012212      jnz   0x18001221d
|    ||||   0x180012214      mov   rcx, r14
|    ||||   0x180012217      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
|    `--`-> 0x18001221d      mov   r14, r15
|     ||    0x180012220      test  rdi, rdi
|     ||,=< 0x180012223      jnz   0x180012236
|     |||   0x180012225      mov   rsi, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
|     |||   0x18001222c      mov   ebx, 0x126                          ; 294
|    ,====< 0x180012231      jmp   0x180014173
|    |||`-> 0x180012236      cmp   rdi, qword [sym.imp.python312.dll__Py_TrueStruct] ; [0x1800284f0:8]=0x2e1aa
|    |||    0x18001223d      mov   ebx, r15d
|    |||    0x180012240      mov   ecx, r15d
|    |||    0x180012243      mov   eax, r15d
|    |||    0x180012246      setz  bl
|    |||    0x180012249      cmp   rdi, qword [sym.imp.python312.dll__Py_FalseStruct] ; [0x180028260:8]=0x2db02
|    |||    0x180012250      setz  cl
|    |||    0x180012253      cmp   rdi, qword [sym.imp.python312.dll__Py_NoneStruct] ; [0x180028188:8]=0x2d904
|    |||    0x18001225a      setz  al
|    |||    0x18001225d      or    ecx, eax
|    |||    0x18001225f      or    ecx, ebx
|    |||,=< 0x180012261      jnz   0x18001226e
|    ||||   0x180012263      mov   rcx, rdi
|    ||||   0x180012266      call  qword [sym.imp.python312.dll_PyObject_IsTrue] ; [0x1800284a8:8]=0x2e0fa
|    ||||   0x18001226c      mov   ebx, eax
|    |||`-> 0x18001226e      test  ebx, ebx
|    |||,=< 0x180012270      jns   0x180012283
|    ||||   0x180012272      mov   rsi, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
|    ||||   0x180012279      mov   ebx, 0x126                          ; 294
|   ,=====< 0x18001227e      jmp   0x1800140b3
|   ||||`-> 0x180012283      cmp   dword [rdi], r12d
|   ||||,=< 0x180012286      jl    0x180012297
|   |||||   0x180012288      sub   qword [rdi], 0x01
|  ,======< 0x18001228c      jnz   0x180012297
|  ||||||   0x18001228e      mov   rcx, rdi
|  ||||||   0x180012291      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
|  `----`-> 0x180012297      test  ebx, ebx
|   ||||,=< 0x180012299      jnz   0x18001433f
|   |||||   0x18001229f      mov   rax, qword [sym.imp.python312.dll_PyUnicode_Type] ; [0x1800283d8:8]=0x2deb6
|   |||||   0x1800122a6      cmp   qword [rsi+0x08], rax
|  ,======< 0x1800122aa      jnz   0x18001232b
|  ||||||   0x1800122ac      mov   eax, dword [rsi]
|  ||||||   0x1800122ae      add   eax, 0x01
| ,=======< 0x1800122b1      jz    0x1800122b5
| |||||||   0x1800122b3      mov   dword [rsi], eax
| `-------> 0x1800122b5      mov   rbx, rsi
| .-------> 0x1800122b8      mov   eax, dword [rbx]
| :||||||   0x1800122ba      add   eax, 0x01
| ========< 0x1800122bd      jz    0x1800122c1
| :||||||   0x1800122bf      mov   dword [rbx], eax
| --------> 0x1800122c1      mov   rcx, qword [0x1800310e8]            ; [0x1800310e8:8]=0
| :||||||   0x1800122c8      lea   rdx, qword [var_170h]
| :||||||   0x1800122cc      mov   qword [var_168h], r15
| :||||||   0x1800122d0      xor   r9d, r9d
| :||||||   0x1800122d3      mov   r15, 0x8000000000000001
| :||||||   0x1800122dd      mov   qword [var_170h], rbx
| :||||||   0x1800122e1      mov   r8, r15
| :||||||   0x1800122e4      call  qword [sym.imp.python312.dll_PyObject_VectorcallMethod] ; [0x1800283f8:8]=0x2df22 ; "\"\xdf\U00000002"
| :||||||   0x1800122ea      mov   rdi, rax
| :||||||   0x1800122ed      cmp   dword [rbx], r12d
| ========< 0x1800122f0      jl    0x180012315
| :||||||   0x1800122f2      sub   qword [rbx], 0x01
| ========< 0x1800122f6      jnz   0x180012301
| :||||||   0x1800122f8      mov   rcx, rbx
| :||||||   0x1800122fb      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180012301      cmp   dword [rbx], r12d
| ========< 0x180012304      jl    0x180012315
| :||||||   0x180012306      sub   qword [rbx], 0x01
| ========< 0x18001230a      jnz   0x180012315
| :||||||   0x18001230c      mov   rcx, rbx
| :||||||   0x18001230f      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180012315      test  rdi, rdi
| ========< 0x180012318      jnz   0x180012351
| :||||||   0x18001231a      mov   rsi, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
| :||||||   0x180012321      mov   ebx, 0x126                          ; 294
| ========< 0x180012326      jmp   0x180014173
| :`------> 0x18001232b      mov   rcx, rsi
| : |||||   0x18001232e      call  qword [sym.imp.python312.dll_PyObject_Str] ; [0x1800284b0:8]=0x2e10c
| : |||||   0x180012334      mov   rbx, rax
| : |||||   0x180012337      test  rax, rax
| `=======< 0x18001233a      jnz   0x1800122b8
|   |||||   0x180012340      mov   rsi, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
|   |||||   0x180012347      mov   ebx, 0x126                          ; 294
|  ,======< 0x18001234c      jmp   0x180014173
| --------> 0x180012351      mov   rdx, qword [0x180030778]            ; [0x180030778:8]=0
|  ||||||   0x180012358      mov   r8d, 0x02
|  ||||||   0x18001235e      mov   rcx, rdi
|  ||||||   0x180012361      call  0x18001fbd0
|  ||||||   0x180012366      mov   ebx, eax
|  ||||||   0x180012368      test  eax, eax
| ,=======< 0x18001236a      jns   0x18001237d
| |||||||   0x18001236c      mov   rsi, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
| |||||||   0x180012373      mov   ebx, 0x126                          ; 294
| ========< 0x180012378      jmp   0x1800140b3
| `-------> 0x18001237d      cmp   dword [rdi], r12d
| ,=======< 0x180012380      jl    0x180012391
| |||||||   0x180012382      sub   qword [rdi], 0x01
| ========< 0x180012386      jnz   0x180012391
| |||||||   0x180012388      mov   rcx, rdi
| |||||||   0x18001238b      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| `-------> 0x180012391      test  ebx, ebx
| ,=======< 0x180012393      jnz   0x18001433f
| |||||||   0x180012399      mov   rax, qword [sym.imp.python312.dll_PyUnicode_Type] ; [0x1800283d8:8]=0x2deb6
| |||||||   0x1800123a0      cmp   qword [rsi+0x08], rax
| ========< 0x1800123a4      jnz   0x18001241e
| |||||||   0x1800123a6      mov   eax, dword [rsi]
| |||||||   0x1800123a8      add   eax, 0x01
| ========< 0x1800123ab      jz    0x1800123af
| |||||||   0x1800123ad      mov   dword [rsi], eax
| --------> 0x1800123af      mov   eax, dword [rsi]
| |||||||   0x1800123b1      add   eax, 0x01
| ========< 0x1800123b4      jz    0x1800123b8
| |||||||   0x1800123b6      mov   dword [rsi], eax
| --------> 0x1800123b8      mov   rcx, qword [0x1800310e8]            ; [0x1800310e8:8]=0
| |||||||   0x1800123bf      lea   rdx, qword [var_160h]
| |||||||   0x1800123c3      xor   r9d, r9d
| |||||||   0x1800123c6      mov   qword [var_160h], rsi
| |||||||   0x1800123ca      mov   r8, r15
| |||||||   0x1800123cd      mov   qword [rbp], r14
| |||||||   0x1800123d1      call  qword [sym.imp.python312.dll_PyObject_VectorcallMethod] ; [0x1800283f8:8]=0x2df22 ; "\"\xdf\U00000002"
| |||||||   0x1800123d7      mov   rdi, rax
| |||||||   0x1800123da      cmp   dword [rsi], r12d
| ========< 0x1800123dd      jl    0x1800123ee
| |||||||   0x1800123df      sub   qword [rsi], 0x01
| ========< 0x1800123e3      jnz   0x1800123ee
| |||||||   0x1800123e5      mov   rcx, rsi
| |||||||   0x1800123e8      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x1800123ee      mov   rbx, r14
| |||||||   0x1800123f1      cmp   dword [rsi], r14d
| ========< 0x1800123f4      jl    0x180012405
| |||||||   0x1800123f6      sub   qword [rsi], 0x01
| ========< 0x1800123fa      jnz   0x180012405
| |||||||   0x1800123fc      mov   rcx, rsi
| |||||||   0x1800123ff      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180012405      mov   r15, r14
| |||||||   0x180012408      test  rdi, rdi
| ========< 0x18001240b      jnz   0x180012440
| |||||||   0x18001240d      mov   rsi, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
| |||||||   0x180012414      mov   ebx, 0x128                          ; 296
| ========< 0x180012419      jmp   0x180014173
| --------> 0x18001241e      mov   rcx, rsi
| |||||||   0x180012421      call  qword [sym.imp.python312.dll_PyObject_Str] ; [0x1800284b0:8]=0x2e10c
| |||||||   0x180012427      mov   rsi, rax
| |||||||   0x18001242a      test  rax, rax
| ========< 0x18001242d      jnz   0x1800123af
| |||||||   0x18001242f      mov   rsi, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
| |||||||   0x180012436      mov   ebx, 0x128                          ; 296
| ========< 0x18001243b      jmp   0x180014173
| --------> 0x180012440      mov   rsi, rdi
| |||||||   0x180012443      mov   qword [var_1d8h], rdi
| |||||||   0x180012447      call  qword [sym.imp.python312.dll__PyThreadState_UncheckedGet] ; [0x180028100:8]=0x2d79a
| |||||||   0x18001244d      mov   rcx, qword [sym.imp.python312.dll__Py_NoneStruct] ; [0x180028188:8]=0x2d904
| |||||||   0x180012454      mov   qword [var_1b8h], rax
| |||||||   0x180012458      mov   rax, qword [rax+0x68]
| |||||||   0x18001245c      nop   dword [rax], eax
| --------> 0x180012460      mov   rdi, qword [rax]
| |||||||   0x180012463      mov   qword [var_1b0h], rdi
| |||||||   0x180012467      test  rdi, rdi
| ========< 0x18001246a      jz    0x180012471
| |||||||   0x18001246c      cmp   rdi, rcx
| ========< 0x18001246f      jnz   0x18001247a
| --------> 0x180012471      mov   rax, qword [rax+0x08]
| |||||||   0x180012475      test  rax, rax
| ========< 0x180012478      jnz   0x180012460
| --------> 0x18001247a      test  rdi, rdi
| ========< 0x18001247d      jz    0x1800124ae
| |||||||   0x18001247f      cmp   rdi, rcx
| ========< 0x180012482      jz    0x1800124ae
| |||||||   0x180012484      mov   eax, dword [rdi]
| |||||||   0x180012486      add   eax, 0x01
| ========< 0x180012489      jz    0x18001248d
| |||||||   0x18001248b      mov   dword [rdi], eax
| --------> 0x18001248d      mov   rcx, qword [rdi+0x08]
| |||||||   0x180012491      mov   qword [var_1a8h], rcx
| |||||||   0x180012495      mov   eax, dword [rcx]
| |||||||   0x180012497      add   eax, 0x01
| ========< 0x18001249a      jz    0x18001249e
| |||||||   0x18001249c      mov   dword [rcx], eax
| --------> 0x18001249e      mov   rcx, rdi
| |||||||   0x1800124a1      call  qword [sym.imp.python312.dll_PyException_GetTraceback] ; [0x1800286a8:8]=0x2d4ca
| |||||||   0x1800124a7      mov   qword [var_200h], rax
| ========< 0x1800124ac      jmp   0x1800124bb
| --------> 0x1800124ae      mov   qword [var_1b0h], r14
| |||||||   0x1800124b2      mov   qword [var_1a8h], r14
| |||||||   0x1800124b6      mov   qword [var_200h], r14
| |||||||   ; CODE XREF from fcn.180012080 @ 0x1800124ac
| --------> 0x1800124bb      mov   rdx, qword [0x180030960]            ; [0x180030960:8]=0
| |||||||   0x1800124c2      mov   edi, 0x02
| |||||||   0x1800124c7      mov   r8d, edi
| |||||||   0x1800124ca      mov   rcx, rsi
| |||||||   0x1800124cd      call  0x18001fbd0
| |||||||   0x1800124d2      test  eax, eax
| ========< 0x1800124d4      jns   0x1800124e0
| |||||||   0x1800124d6      mov   edi, 0x12a                          ; 298
| ========< 0x1800124db      jmp   0x180013d23
| --------> 0x1800124e0      jz    0x180012597
| |||||||   0x1800124e6      mov   rsi, qword [var_228h]
| |||||||   0x1800124eb      mov   eax, dword [rsi]
| |||||||   0x1800124ed      add   eax, 0x01
| ========< 0x1800124f0      jz    0x1800124f4
| |||||||   0x1800124f2      mov   dword [rsi], eax
| --------> 0x1800124f4      mov   rax, qword [sym.imp.python312.dll_PyUnicode_Type] ; [0x1800283d8:8]=0x2deb6
| |||||||   0x1800124fb      lea   rdx, qword [var_190h]
| |||||||   0x1800124ff      mov   rcx, qword [0x180030aa0]            ; [0x180030aa0:8]=0
| |||||||   0x180012506      xor   r9d, r9d
| |||||||   0x180012509      mov   r8, 0x8000000000000002
| |||||||   0x180012513      mov   qword [var_188h], rax
| |||||||   0x180012517      mov   qword [var_190h], rsi
| |||||||   0x18001251b      call  qword [sym.imp.python312.dll_PyObject_VectorcallMethod] ; [0x1800283f8:8]=0x2df22 ; "\"\xdf\U00000002"
| |||||||   0x180012521      mov   r13, rax
| |||||||   0x180012524      cmp   dword [rsi], ebx
| ========< 0x180012526      jl    0x180012537
| |||||||   0x180012528      sub   qword [rsi], 0x01
| ========< 0x18001252c      jnz   0x180012537
| |||||||   0x18001252e      mov   rcx, rsi
| |||||||   0x180012531      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180012537      test  r13, r13
| ========< 0x18001253a      jnz   0x18001254d
| |||||||   0x18001253c      mov   r14, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
| |||||||   0x180012543      mov   edi, 0x12b                          ; 299
| ========< 0x180012548      jmp   0x180013d2f
| --------> 0x18001254d      mov   rdx, qword [0x180030960]            ; [0x180030960:8]=0
| |||||||   0x180012554      mov   r8d, edi
| |||||||   0x180012557      mov   rcx, r13
| |||||||   0x18001255a      call  qword [sym.imp.python312.dll_PyObject_RichCompare] ; [0x180028250:8]=0x2dada
| |||||||   0x180012560      mov   r15, rax
| |||||||   0x180012563      test  rax, rax
| ========< 0x180012566      jnz   0x180012579
| |||||||   0x180012568      mov   r14, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
| |||||||   0x18001256f      mov   edi, 0x12b                          ; 299
| ========< 0x180012574      jmp   0x180012cdb
| --------> 0x180012579      cmp   dword [r13], ebx
| ========< 0x18001257d      jl    0x18001258f
| |||||||   0x18001257f      sub   qword [r13], 0x01
| ========< 0x180012584      jnz   0x18001258f
| |||||||   0x180012586      mov   rcx, r13
| |||||||   0x180012589      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x18001258f      mov   r12, rbx
| ========< 0x180012592      jmp   0x180013c43
| --------> 0x180012597      mov   rdx, qword [0x180030990]            ; [0x180030990:8]=0
| |||||||   0x18001259e      mov   r8d, edi
| |||||||   0x1800125a1      mov   rcx, rsi
| |||||||   0x1800125a4      call  0x18001fbd0
| |||||||   0x1800125a9      test  eax, eax
| ========< 0x1800125ab      jns   0x1800125b7
| |||||||   0x1800125ad      mov   edi, 0x12c                          ; 300
| ========< 0x1800125b2      jmp   0x180013d23
| --------> 0x1800125b7      jz    0x18001266c
| |||||||   0x1800125bd      mov   rsi, qword [var_228h]
| |||||||   0x1800125c2      mov   eax, dword [rsi]
| |||||||   0x1800125c4      add   eax, 0x01
| ========< 0x1800125c7      jz    0x1800125cb
| |||||||   0x1800125c9      mov   dword [rsi], eax
| --------> 0x1800125cb      mov   rax, qword [sym.imp.python312.dll_PyUnicode_Type] ; [0x1800283d8:8]=0x2deb6
| |||||||   0x1800125d2      lea   rdx, qword [var_1a0h]
| |||||||   0x1800125d6      mov   rcx, qword [0x180030aa0]            ; [0x180030aa0:8]=0
| |||||||   0x1800125dd      xor   r9d, r9d
| |||||||   0x1800125e0      mov   r8, 0x8000000000000002
| |||||||   0x1800125ea      mov   qword [var_198h], rax
| |||||||   0x1800125ee      mov   qword [var_1a0h], rsi
| |||||||   0x1800125f2      call  qword [sym.imp.python312.dll_PyObject_VectorcallMethod] ; [0x1800283f8:8]=0x2df22 ; "\"\xdf\U00000002"
| |||||||   0x1800125f8      mov   r15, rax
| |||||||   0x1800125fb      cmp   dword [rsi], ebx
| ========< 0x1800125fd      jl    0x18001260e
| |||||||   0x1800125ff      sub   qword [rsi], 0x01
| ========< 0x180012603      jnz   0x18001260e
| |||||||   0x180012605      mov   rcx, rsi
| |||||||   0x180012608      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x18001260e      test  r15, r15
| ========< 0x180012611      jnz   0x180012624
| |||||||   0x180012613      mov   r14, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
| |||||||   0x18001261a      mov   edi, 0x12d                          ; 301
| ========< 0x18001261f      jmp   0x180013d2f
| --------> 0x180012624      mov   rdx, qword [0x180030990]            ; [0x180030990:8]=0
| |||||||   0x18001262b      mov   r8d, edi
| |||||||   0x18001262e      mov   rcx, r15
| |||||||   0x180012631      call  qword [sym.imp.python312.dll_PyObject_RichCompare] ; [0x180028250:8]=0x2dada
| |||||||   0x180012637      mov   rbx, rax
| |||||||   0x18001263a      test  rax, rax
| ========< 0x18001263d      jnz   0x180012650
| |||||||   0x18001263f      mov   r14, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
| |||||||   0x180012646      mov   edi, 0x12d                          ; 301
| ========< 0x18001264b      jmp   0x180012d3a
| --------> 0x180012650      cmp   dword [r15], r12d
| ========< 0x180012653      jl    0x180012664
| |||||||   0x180012655      sub   qword [r15], 0x01
| ========< 0x180012659      jnz   0x180012664
| |||||||   0x18001265b      mov   rcx, r15
| |||||||   0x18001265e      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180012664      mov   r15, rbx
| ========< 0x180012667      jmp   0x180013c43
| --------> 0x18001266c      mov   rdx, qword [0x180030800]            ; [0x180030800:8]=0
| |||||||   0x180012673      mov   r8d, edi
| |||||||   0x180012676      mov   rcx, rsi
| |||||||   0x180012679      call  0x18001fbd0
| |||||||   0x18001267e      test  eax, eax
| ========< 0x180012680      jns   0x18001268c
| |||||||   0x180012682      mov   edi, 0x12e                          ; 302
| ========< 0x180012687      jmp   0x180013d23
| --------> 0x18001268c      jz    0x180012888
| |||||||   0x180012692      mov   r14, qword [var_228h]
| |||||||   0x180012697      mov   r13, r14
| |||||||   0x18001269a      mov   qword [var_220h], r14
| |||||||   0x18001269f      mov   eax, dword [r14]
| |||||||   0x1800126a2      add   eax, 0x01
| ========< 0x1800126a5      jz    0x1800126aa
| |||||||   0x1800126a7      mov   dword [r14], eax
| --------> 0x1800126aa      mov   rcx, qword [0x180030e88]            ; [0x180030e88:8]=0
| |||||||   0x1800126b1      call  0x180020950
| |||||||   0x1800126b6      mov   r12, rax
| |||||||   0x1800126b9      test  rax, rax
| ========< 0x1800126bc      jnz   0x1800126cf
| |||||||   0x1800126be      mov   r14, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
| |||||||   0x1800126c5      mov   edi, 0x12f                          ; 303
| ========< 0x1800126ca      jmp   0x180012d15
| --------> 0x1800126cf      mov   rax, qword [rax+0x08]
| |||||||   0x1800126d3      mov   rcx, r12
| |||||||   0x1800126d6      mov   rdx, qword [0x180030e68]            ; [0x180030e68:8]=0
| |||||||   0x1800126dd      mov   r8, qword [rax+0x90]
| |||||||   0x1800126e4      test  r8, r8
| ========< 0x1800126e7      jz    0x1800126ee
| |||||||   0x1800126e9      call  r8
| ========< 0x1800126ec      jmp   0x1800126f4
| --------> 0x1800126ee      call  qword [sym.imp.python312.dll_PyObject_GetAttr] ; [0x180028168:8]=0x2d8b6
| |||||||   ; CODE XREF from fcn.180012080 @ 0x1800126ec
| --------> 0x1800126f4      mov   rsi, rax
| |||||||   0x1800126f7      test  rax, rax
| ========< 0x1800126fa      jnz   0x180012710
| |||||||   0x1800126fc      mov   r14, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
| |||||||   0x180012703      mov   edi, 0x12f                          ; 303
| |||||||   0x180012708      xor   r13d, r13d
| ========< 0x18001270b      jmp   0x18001379c
| --------> 0x180012710      cmp   dword [r12], ebx
| ========< 0x180012714      jl    0x180012726
| |||||||   0x180012716      sub   qword [r12], 0x01
| ========< 0x18001271b      jnz   0x180012726
| |||||||   0x18001271d      mov   rcx, r12
| |||||||   0x180012720      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180012726      mov   rax, qword [0x1800308b0]            ; [0x1800308b0:8]=0
| |||||||   0x18001272d      mov   ecx, 0x01
| |||||||   0x180012732      mov   qword [var_c0h], rax
| |||||||   0x180012739      xor   eax, eax
| |||||||   0x18001273b      mov   qword [var_b0h], rax
| |||||||   0x180012742      mov   qword [var_c8h], r14
| |||||||   0x180012749      mov   qword [var_b8h], rsi
| |||||||   0x180012750      call  qword [sym.imp.python312.dll_PyTuple_New] ; [0x180028190:8]=0x2d916
| |||||||   0x180012756      mov   rdi, rax
| |||||||   0x180012759      test  rax, rax
| ========< 0x18001275c      jnz   0x18001276b
| |||||||   0x18001275e      mov   edi, 0x12f                          ; 303
| |||||||   0x180012763      mov   r13, rbx
| ========< 0x180012766      jmp   0x180013cb6
| --------> 0x18001276b      mov   rax, qword [0x180030fa8]            ; [0x180030fa8:8]=0
| |||||||   0x180012772      mov   rdx, qword [sym.imp.python312.dll__Py_TrueStruct] ; [0x1800284f0:8]=0x2e1aa
| |||||||   0x180012779      mov   qword [rdi+0x18], rax
| |||||||   0x18001277d      mov   ecx, dword [rax]
| |||||||   0x18001277f      add   ecx, 0x01
| ========< 0x180012782      jz    0x180012786
| |||||||   0x180012784      mov   dword [rax], ecx
| --------> 0x180012786      mov   rcx, qword [0x180030fb8]            ; [0x180030fb8:8]=0
| |||||||   0x18001278d      mov   r9, rdi
| |||||||   0x180012790      mov   qword [var_b0h], rdx
| |||||||   0x180012797      mov   r8, 0x8000000000000003
| |||||||   0x1800127a1      lea   rdx, qword [var_c8h]
| |||||||   0x1800127a8      call  qword [sym.imp.python312.dll_PyObject_VectorcallMethod] ; [0x1800283f8:8]=0x2df22 ; "\"\xdf\U00000002"
| |||||||   0x1800127ae      mov   rbx, rax
| |||||||   0x1800127b1      cmp   dword [r14], r15d
| ========< 0x1800127b4      jl    0x1800127c5
| |||||||   0x1800127b6      sub   qword [r14], 0x01
| ========< 0x1800127ba      jnz   0x1800127c5
| |||||||   0x1800127bc      mov   rcx, r14
| |||||||   0x1800127bf      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x1800127c5      cmp   dword [rsi], r15d
| ========< 0x1800127c8      jl    0x1800127d9
| |||||||   0x1800127ca      sub   qword [rsi], 0x01
| ========< 0x1800127ce      jnz   0x1800127d9
| |||||||   0x1800127d0      mov   rcx, rsi
| |||||||   0x1800127d3      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x1800127d9      cmp   dword [rdi], r15d
| ========< 0x1800127dc      jl    0x1800127ed
| |||||||   0x1800127de      sub   qword [rdi], 0x01
| ========< 0x1800127e2      jnz   0x1800127ed
| |||||||   0x1800127e4      mov   rcx, rdi
| |||||||   0x1800127e7      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x1800127ed      test  rbx, rbx
| ========< 0x1800127f0      jnz   0x180012806
| |||||||   0x1800127f2      mov   r14, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
| |||||||   0x1800127f9      mov   edi, 0x12f                          ; 303
| |||||||   0x1800127fe      mov   rsi, r13
| ========< 0x180012801      jmp   0x180013d2f
| --------> 0x180012806      mov   eax, dword [rbx]
| |||||||   0x180012808      add   eax, 0x01
| ========< 0x18001280b      jz    0x18001280f
| |||||||   0x18001280d      mov   dword [rbx], eax
| --------> 0x18001280f      mov   rcx, qword [0x180030d98]            ; [0x180030d98:8]=0
| |||||||   0x180012816      lea   rdx, qword [var_1f8h]
| |||||||   0x18001281b      xor   eax, eax
| |||||||   0x18001281d      mov   qword [var_1f8h], rbx
| |||||||   0x180012822      xor   r9d, r9d
| |||||||   0x180012825      mov   qword [var_1f0h], rax
| |||||||   0x18001282a      mov   r8, 0x8000000000000001
| |||||||   0x180012834      call  qword [sym.imp.python312.dll_PyObject_VectorcallMethod] ; [0x1800283f8:8]=0x2df22 ; "\"\xdf\U00000002"
| |||||||   0x18001283a      cmp   dword [rbx], 0x00
| |||||||   0x18001283d      mov   r15, rax
| ========< 0x180012840      jl    0x180012865
| |||||||   0x180012842      sub   qword [rbx], 0x01
| ========< 0x180012846      jnz   0x180012851
| |||||||   0x180012848      mov   rcx, rbx
| |||||||   0x18001284b      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180012851      cmp   dword [rbx], 0x00
| ========< 0x180012854      jl    0x180012865
| |||||||   0x180012856      sub   qword [rbx], 0x01
| ========< 0x18001285a      jnz   0x180012865
| |||||||   0x18001285c      mov   rcx, rbx
| |||||||   0x18001285f      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180012865      test  r15, r15
| ========< 0x180012868      jnz   0x18001287e
| |||||||   0x18001286a      mov   r14, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
| |||||||   0x180012871      mov   edi, 0x12f                          ; 303
| |||||||   0x180012876      mov   rsi, r13
| ========< 0x180012879      jmp   0x180013d2f
| --------> 0x18001287e      mov   r12, qword [var_218h]
| ========< 0x180012883      jmp   0x180013c43
| --------> 0x180012888      mov   rdx, qword [0x180030808]            ; [0x180030808:8]=0
| |||||||   0x18001288f      mov   r8d, edi
| |||||||   0x180012892      mov   rcx, rsi
| |||||||   0x180012895      call  0x18001fbd0
| |||||||   0x18001289a      test  eax, eax
| ========< 0x18001289c      jns   0x1800128a8
| |||||||   0x18001289e      mov   edi, 0x130                          ; 304
| ========< 0x1800128a3      jmp   0x180013d23
| --------> 0x1800128a8      jz    0x180012a9e
| |||||||   0x1800128ae      mov   rdi, qword [var_228h]
| |||||||   0x1800128b3      mov   r12, rdi
| |||||||   0x1800128b6      mov   eax, dword [rdi]
| |||||||   0x1800128b8      add   eax, 0x01
| ========< 0x1800128bb      jz    0x1800128bf
| |||||||   0x1800128bd      mov   dword [rdi], eax
| --------> 0x1800128bf      mov   rcx, qword [0x180030e88]            ; [0x180030e88:8]=0
| |||||||   0x1800128c6      call  0x180020950
| |||||||   0x1800128cb      mov   rsi, rax
| |||||||   0x1800128ce      test  rax, rax
| ========< 0x1800128d1      jnz   0x1800128e4
| |||||||   0x1800128d3      mov   r14, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
| |||||||   0x1800128da      mov   edi, 0x131                          ; 305
| ========< 0x1800128df      jmp   0x18001379c
| --------> 0x1800128e4      mov   rax, qword [rax+0x08]
| |||||||   0x1800128e8      mov   rcx, rsi
| |||||||   0x1800128eb      mov   rdx, qword [0x180030e68]            ; [0x180030e68:8]=0
| |||||||   0x1800128f2      mov   r8, qword [rax+0x90]
| |||||||   0x1800128f9      test  r8, r8
| ========< 0x1800128fc      jz    0x180012903
| |||||||   0x1800128fe      call  r8
| ========< 0x180012901      jmp   0x180012909
| --------> 0x180012903      call  qword [sym.imp.python312.dll_PyObject_GetAttr] ; [0x180028168:8]=0x2d8b6
| |||||||   ; CODE XREF from fcn.180012080 @ 0x180012901
| --------> 0x180012909      mov   qword [var_220h], rax
| |||||||   0x18001290e      mov   r13, rax
| |||||||   0x180012911      test  rax, rax
| ========< 0x180012914      jnz   0x180012927
| |||||||   0x180012916      mov   r14, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
| |||||||   0x18001291d      mov   edi, 0x131                          ; 305
| ========< 0x180012922      jmp   0x18001379c
| --------> 0x180012927      cmp   dword [rsi], ebx
| ========< 0x180012929      jl    0x18001293a
| |||||||   0x18001292b      sub   qword [rsi], 0x01
| ========< 0x18001292f      jnz   0x18001293a
| |||||||   0x180012931      mov   rcx, rsi
| |||||||   0x180012934      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x18001293a      mov   rax, qword [0x1800308b0]            ; [0x1800308b0:8]=0
| |||||||   0x180012941      mov   ecx, 0x01
| |||||||   0x180012946      mov   qword [var_a0h], rax
| |||||||   0x18001294d      xor   eax, eax
| |||||||   0x18001294f      mov   qword [var_90h], rax
| |||||||   0x180012956      mov   qword [var_a8h], rdi
| |||||||   0x18001295d      mov   qword [var_98h], r13
| |||||||   0x180012964      call  qword [sym.imp.python312.dll_PyTuple_New] ; [0x180028190:8]=0x2d916
| |||||||   0x18001296a      mov   rsi, rax
| |||||||   0x18001296d      test  rax, rax
| ========< 0x180012970      jnz   0x180012986
| |||||||   0x180012972      mov   r14, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
| |||||||   0x180012979      mov   edi, 0x131                          ; 305
| |||||||   0x18001297e      xor   r13d, r13d
| ========< 0x180012981      jmp   0x18001379c
| --------> 0x180012986      mov   rax, qword [0x180030fa8]            ; [0x180030fa8:8]=0
| |||||||   0x18001298d      mov   rdx, qword [sym.imp.python312.dll__Py_TrueStruct] ; [0x1800284f0:8]=0x2e1aa
| |||||||   0x180012994      mov   qword [rsi+0x18], rax
| |||||||   0x180012998      mov   ecx, dword [rax]
| |||||||   0x18001299a      add   ecx, 0x01
| ========< 0x18001299d      jz    0x1800129a1
| |||||||   0x18001299f      mov   dword [rax], ecx
| --------> 0x1800129a1      mov   rcx, qword [0x180030fb8]            ; [0x180030fb8:8]=0
| |||||||   0x1800129a8      mov   r9, rsi
| |||||||   0x1800129ab      mov   qword [var_90h], rdx
| |||||||   0x1800129b2      mov   r8, 0x8000000000000003
| |||||||   0x1800129bc      lea   rdx, qword [var_a8h]
| |||||||   0x1800129c3      call  qword [sym.imp.python312.dll_PyObject_VectorcallMethod] ; [0x1800283f8:8]=0x2df22 ; "\"\xdf\U00000002"
| |||||||   0x1800129c9      mov   rbx, rax
| |||||||   0x1800129cc      cmp   dword [rdi], r14d
| ========< 0x1800129cf      jl    0x1800129e0
| |||||||   0x1800129d1      sub   qword [rdi], 0x01
| ========< 0x1800129d5      jnz   0x1800129e0
| |||||||   0x1800129d7      mov   rcx, rdi
| |||||||   0x1800129da      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x1800129e0      cmp   dword [r13], r14d
| ========< 0x1800129e4      jl    0x1800129f6
| |||||||   0x1800129e6      sub   qword [r13], 0x01
| ========< 0x1800129eb      jnz   0x1800129f6
| |||||||   0x1800129ed      mov   rcx, r13
| |||||||   0x1800129f0      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x1800129f6      cmp   dword [rsi], r14d
| ========< 0x1800129f9      jl    0x180012a0a
| |||||||   0x1800129fb      sub   qword [rsi], 0x01
| ========< 0x1800129ff      jnz   0x180012a0a
| |||||||   0x180012a01      mov   rcx, rsi
| |||||||   0x180012a04      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180012a0a      test  rbx, rbx
| ========< 0x180012a0d      jnz   0x180012a23
| |||||||   0x180012a0f      mov   r14, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
| |||||||   0x180012a16      mov   edi, 0x131                          ; 305
| |||||||   0x180012a1b      mov   rsi, r12
| ========< 0x180012a1e      jmp   0x180013d2f
| --------> 0x180012a23      mov   eax, dword [rbx]
| |||||||   0x180012a25      add   eax, 0x01
| ========< 0x180012a28      jz    0x180012a2c
| |||||||   0x180012a2a      mov   dword [rbx], eax
| --------> 0x180012a2c      mov   rcx, qword [0x180030e80]            ; [0x180030e80:8]=0
| |||||||   0x180012a33      lea   rdx, qword [var_150h]
| |||||||   0x180012a37      xor   r9d, r9d
| |||||||   0x180012a3a      mov   qword [var_150h], rbx
| |||||||   0x180012a3e      mov   r8, 0x8000000000000001
| |||||||   0x180012a48      mov   qword [var_148h], r14
| |||||||   0x180012a4c      call  qword [sym.imp.python312.dll_PyObject_VectorcallMethod] ; [0x1800283f8:8]=0x2df22 ; "\"\xdf\U00000002"
| |||||||   0x180012a52      mov   r15, rax
| |||||||   0x180012a55      cmp   dword [rbx], r14d
| ========< 0x180012a58      jl    0x180012a7d
| |||||||   0x180012a5a      sub   qword [rbx], 0x01
| ========< 0x180012a5e      jnz   0x180012a69
| |||||||   0x180012a60      mov   rcx, rbx
| |||||||   0x180012a63      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180012a69      cmp   dword [rbx], r14d
| ========< 0x180012a6c      jl    0x180012a7d
| |||||||   0x180012a6e      sub   qword [rbx], 0x01
| ========< 0x180012a72      jnz   0x180012a7d
| |||||||   0x180012a74      mov   rcx, rbx
| |||||||   0x180012a77      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180012a7d      test  r15, r15
| ========< 0x180012a80      jnz   0x180012a96
| |||||||   0x180012a82      mov   r14, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
| |||||||   0x180012a89      mov   edi, 0x131                          ; 305
| |||||||   0x180012a8e      mov   rsi, r12
| ========< 0x180012a91      jmp   0x180013d2f
| --------> 0x180012a96      mov   r12, r14
| ========< 0x180012a99      jmp   0x180013c43
| --------> 0x180012a9e      xor   ecx, ecx
| |||||||   0x180012aa0      call  qword [sym.imp.python312.dll_PyList_New] ; [0x180028348:8]=0x2dd4a ; "J\xdd\U00000002"
| |||||||   0x180012aa6      mov   qword [var_1f8h], rax
| |||||||   0x180012aab      mov   r13, rax
| |||||||   0x180012aae      test  rax, rax
| ========< 0x180012ab1      jnz   0x180012abd
| |||||||   0x180012ab3      mov   edi, 0x133                          ; 307
| ========< 0x180012ab8      jmp   0x180013d23
| --------> 0x180012abd      mov   r8, qword [0x180030720]             ; [0x180030720:8]=0
| |||||||   0x180012ac4      mov   r9, 0xffffffffffffffff
| |||||||   0x180012acb      mov   rdx, qword [0x180030760]            ; [0x180030760:8]=0
| |||||||   0x180012ad2      mov   rcx, rsi
| |||||||   0x180012ad5      call  qword [sym.imp.python312.dll_PyUnicode_Replace] ; [0x180028640:8]=0x2d5ec
| |||||||   0x180012adb      mov   r15, rax
| |||||||   0x180012ade      test  rax, rax
| ========< 0x180012ae1      jnz   0x180012af4
| |||||||   0x180012ae3      mov   r14, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
| |||||||   0x180012aea      mov   edi, 0x133                          ; 307
| ========< 0x180012aef      jmp   0x180012cdb
| --------> 0x180012af4      mov   rdx, qword [0x180030720]            ; [0x180030720:8]=0
| |||||||   0x180012afb      mov   r8, 0xffffffffffffffff
| |||||||   0x180012b02      mov   rcx, r15
| |||||||   0x180012b05      call  qword [sym.imp.python312.dll_PyUnicode_Split] ; [0x1800281f0:8]=0x2d9fe
| |||||||   0x180012b0b      mov   rbx, rax
| |||||||   0x180012b0e      test  rax, rax
| ========< 0x180012b11      jnz   0x180012b24
| |||||||   0x180012b13      mov   r14, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
| |||||||   0x180012b1a      mov   edi, 0x133                          ; 307
| ========< 0x180012b1f      jmp   0x180012cdb
| --------> 0x180012b24      cmp   dword [r15], r12d
| ========< 0x180012b27      jl    0x180012b38
| |||||||   0x180012b29      sub   qword [r15], 0x01
| ========< 0x180012b2d      jnz   0x180012b38
| |||||||   0x180012b2f      mov   rcx, r15
| |||||||   0x180012b32      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180012b38      mov   ecx, dword [rbx]
| |||||||   0x180012b3a      mov   r15, rbx
| |||||||   0x180012b3d      lea   eax, qword [rcx+0x01]
| |||||||   0x180012b40      test  eax, eax
| ========< 0x180012b42      jz    0x180012b48
| |||||||   0x180012b44      mov   dword [rbx], eax
| |||||||   0x180012b46      mov   ecx, eax
| --------> 0x180012b48      mov   rdi, r14
| |||||||   0x180012b4b      test  ecx, ecx
| ========< 0x180012b4d      js    0x180012b5e
| |||||||   0x180012b4f      sub   qword [rbx], 0x01
| ========< 0x180012b53      jnz   0x180012b5e
| |||||||   0x180012b55      mov   rcx, rbx
| |||||||   0x180012b58      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180012b5e      lea   r14, qword [rbx+0x10]
| |||||||   0x180012b62      mov   r13, rdi
| |||||||   0x180012b65      cmp   qword [r14], rdi
| ========< 0x180012b68      jle   0x180012c58
| |||||||   0x180012b6e      lea   r12, qword [rbx+0x18]
| |||||||   0x180012b72      nop   dword [rax], eax
| |||||||   0x180012b76      nop   word [rax+rax*1], ax
| --------> 0x180012b80      mov   rax, qword [r12]
| |||||||   0x180012b84      mov   rsi, qword [rax+rdi*8]
| |||||||   0x180012b88      mov   eax, dword [rsi]
| |||||||   0x180012b8a      add   eax, 0x01
| ========< 0x180012b8d      jz    0x180012b91
| |||||||   0x180012b8f      mov   dword [rsi], eax
| --------> 0x180012b91      mov   rcx, r13
| |||||||   0x180012b94      inc   rdi
| |||||||   0x180012b97      mov   r13, rsi
| |||||||   0x180012b9a      test  rcx, rcx
| ========< 0x180012b9d      jz    0x180012bb0
| |||||||   0x180012b9f      cmp   dword [rcx], 0x00
| ========< 0x180012ba2      jl    0x180012bb0
| |||||||   0x180012ba4      sub   qword [rcx], 0x01
| ========< 0x180012ba8      jnz   0x180012bb0
| |||||||   0x180012baa      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180012bb0      mov   eax, dword [rsi]
| |||||||   0x180012bb2      add   eax, 0x01
| ========< 0x180012bb5      jz    0x180012bb9
| |||||||   0x180012bb7      mov   dword [rsi], eax
| --------> 0x180012bb9      mov   rcx, qword [0x1800310e8]            ; [0x1800310e8:8]=0
| |||||||   0x180012bc0      lea   rdx, qword [var_140h]
| |||||||   0x180012bc4      xor   eax, eax
| |||||||   0x180012bc6      mov   qword [var_140h], rsi
| |||||||   0x180012bca      xor   r9d, r9d
| |||||||   0x180012bcd      mov   qword [var_138h], rax
| |||||||   0x180012bd1      mov   r8, 0x8000000000000001
| |||||||   0x180012bdb      call  qword [sym.imp.python312.dll_PyObject_VectorcallMethod] ; [0x1800283f8:8]=0x2df22 ; "\"\xdf\U00000002"
| |||||||   0x180012be1      cmp   dword [rsi], 0x00
| |||||||   0x180012be4      mov   rbx, rax
| ========< 0x180012be7      jl    0x180012bf8
| |||||||   0x180012be9      sub   qword [rsi], 0x01
| ========< 0x180012bed      jnz   0x180012bf8
| |||||||   0x180012bef      mov   rcx, rsi
| |||||||   0x180012bf2      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180012bf8      test  rbx, rbx
| ========< 0x180012bfb      jz    0x180012cb6
| |||||||   0x180012c01      mov   r8, qword [var_1f8h]
| |||||||   0x180012c06      mov   rcx, qword [r8+0x10]
| |||||||   0x180012c0a      cmp   qword [r8+0x20], rcx
| ========< 0x180012c0e      jle   0x180012c2b
| |||||||   0x180012c10      mov   eax, dword [rbx]
| |||||||   0x180012c12      add   eax, 0x01
| ========< 0x180012c15      jz    0x180012c19
| |||||||   0x180012c17      mov   dword [rbx], eax
| --------> 0x180012c19      mov   rax, qword [r8+0x18]
| |||||||   0x180012c1d      mov   qword [rax+rcx*8], rbx
| |||||||   0x180012c21      lea   rax, qword [rcx+0x01]
| |||||||   0x180012c25      mov   qword [r8+0x10], rax
| ========< 0x180012c29      jmp   0x180012c3b
| --------> 0x180012c2b      mov   rdx, rbx
| |||||||   0x180012c2e      mov   rcx, r8
| |||||||   0x180012c31      call  qword [sym.imp.python312.dll_PyList_Append] ; [0x180028388:8]=0x2dde0
| |||||||   0x180012c37      test  eax, eax
| ========< 0x180012c39      jnz   0x180012cb6
| |||||||   ; CODE XREF from fcn.180012080 @ 0x180012c29
| --------> 0x180012c3b      cmp   dword [rbx], 0x00
| ========< 0x180012c3e      jl    0x180012c4f
| |||||||   0x180012c40      sub   qword [rbx], 0x01
| ========< 0x180012c44      jnz   0x180012c4f
| |||||||   0x180012c46      mov   rcx, rbx
| |||||||   0x180012c49      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180012c4f      cmp   rdi, qword [r14]
| ========< 0x180012c52      jl    0x180012b80
| --------> 0x180012c58      cmp   dword [r15], 0x00
| ========< 0x180012c5c      jl    0x180012c6d
| |||||||   0x180012c5e      sub   qword [r15], 0x01
| ========< 0x180012c62      jnz   0x180012c6d
| |||||||   0x180012c64      mov   rcx, r15
| |||||||   0x180012c67      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180012c6d      test  r13, r13
| ========< 0x180012c70      jz    0x180012c89
| |||||||   0x180012c72      cmp   dword [r13], 0x00
| ========< 0x180012c77      jl    0x180012c89
| |||||||   0x180012c79      sub   qword [r13], 0x01
| ========< 0x180012c7e      jnz   0x180012c89
| |||||||   0x180012c80      mov   rcx, r13
| |||||||   0x180012c83      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180012c89      mov   rdi, qword [var_1f8h]
| |||||||   0x180012c8e      xor   ecx, ecx
| |||||||   0x180012c90      mov   qword [var_1e8h], rdi
| |||||||   0x180012c95      call  qword [sym.imp.python312.dll_PyList_New] ; [0x180028348:8]=0x2dd4a ; "J\xdd\U00000002"
| |||||||   0x180012c9b      mov   qword [var_1f8h], rax
| |||||||   0x180012ca0      mov   rbx, rax
| |||||||   0x180012ca3      test  rax, rax
| ========< 0x180012ca6      jnz   0x180012d5c
| |||||||   0x180012cac      mov   edi, 0x134                          ; 308
| ========< 0x180012cb1      jmp   0x180013d23
| --------> 0x180012cb6      mov   edi, 0x133                          ; 307
| |||||||   ; CODE XREFS from fcn.180012080 @ 0x1800130cd, 0x1800130dc, 0x1800130ed
| --------> 0x180012cbb      mov   r14, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
| |||||||   0x180012cc2      cmp   dword [rsi], 0x00
| ========< 0x180012cc5      jl    0x180012cd6
| |||||||   0x180012cc7      sub   qword [rsi], 0x01
| ========< 0x180012ccb      jnz   0x180012cd6
| |||||||   0x180012ccd      mov   rcx, rsi
| |||||||   0x180012cd0      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180012cd6      mov   r13, qword [var_1f8h]
| |||||||   ; XREFS: CODE 0x180012574  CODE 0x180012aef  CODE 0x180012b1f
| |||||||   ; XREFS: CODE 0x18001335e  CODE 0x180013cda  CODE 0x180013ceb
| |||||||   ; XREFS: CODE 0x180013d01  CODE 0x180013d19
| --------> 0x180012cdb      cmp   dword [r13], 0x00
| ========< 0x180012ce0      jl    0x180012cf2
| |||||||   0x180012ce2      sub   qword [r13], 0x01
| ========< 0x180012ce7      jnz   0x180012cf2
| |||||||   0x180012ce9      mov   rcx, r13
| |||||||   0x180012cec      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180012cf2      test  rbx, rbx
| ========< 0x180012cf5      jz    0x180012d0b
| |||||||   ; CODE XREF from fcn.180012080 @ 0x18001339f
| --------> 0x180012cf7      cmp   dword [rbx], 0x00
| ========< 0x180012cfa      jl    0x180012d0b
| |||||||   0x180012cfc      sub   qword [rbx], 0x01
| ========< 0x180012d00      jnz   0x180012d0b
| |||||||   0x180012d02      mov   rcx, rbx
| |||||||   0x180012d05      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| |||||||   ; CODE XREFS from fcn.180012080 @ 0x1800130bf, 0x18001332d
| --------> 0x180012d0b      mov   r13, qword [var_220h]
| |||||||   0x180012d10      test  r13, r13
| ========< 0x180012d13      jz    0x180012d2c
| |||||||   ; CODE XREFS from fcn.180012080 @ 0x1800126ca, 0x180013636
| --------> 0x180012d15      cmp   dword [r13], 0x00
| ========< 0x180012d1a      jl    0x180012d2c
| |||||||   0x180012d1c      sub   qword [r13], 0x01
| ========< 0x180012d21      jnz   0x180012d2c
| |||||||   0x180012d23      mov   rcx, r13
| |||||||   0x180012d26      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180012d2c      test  r15, r15
| ========< 0x180012d2f      jz    0x180013d2a
| |||||||   0x180012d35      mov   rsi, qword [var_228h]
| |||||||   ; CODE XREF from fcn.180012080 @ 0x18001264b
| --------> 0x180012d3a      cmp   dword [r15], 0x00
| ========< 0x180012d3e      jl    0x180013d2f
| |||||||   0x180012d44      sub   qword [r15], 0x01
| ========< 0x180012d48      jnz   0x180013d2f
| |||||||   0x180012d4e      mov   rcx, r15
| |||||||   0x180012d51      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| ========< 0x180012d57      jmp   0x180013d2f
| --------> 0x180012d5c      mov   eax, dword [rdi]
| |||||||   0x180012d5e      mov   r15, rdi
| |||||||   0x180012d61      add   eax, 0x01
| ========< 0x180012d64      jz    0x180012d68
| |||||||   0x180012d66      mov   dword [rdi], eax
| --------> 0x180012d68      xor   r14d, r14d
| |||||||   0x180012d6b      mov   r12, 0x8000000000000002
| |||||||   0x180012d75      mov   r13d, r14d
| |||||||   0x180012d78      cmp   qword [rdi+0x10], r14
| ========< 0x180012d7c      jle   0x18001306d
| |||||||   0x180012d82      nop   dword [rax], eax
| |||||||   0x180012d86      nop   word [rax+rax*1], ax
| --------> 0x180012d90      mov   rax, qword [rdi+0x18]
| |||||||   0x180012d94      mov   rsi, qword [rax+r13*8]
| |||||||   0x180012d98      mov   eax, dword [rsi]
| |||||||   0x180012d9a      add   eax, 0x01
| ========< 0x180012d9d      jz    0x180012da1
| |||||||   0x180012d9f      mov   dword [rsi], eax
| --------> 0x180012da1      mov   rcx, qword [var_1a0h]
| |||||||   0x180012da5      inc   r13
| |||||||   0x180012da8      mov   qword [var_1a0h], rsi
| |||||||   0x180012dac      test  rcx, rcx
| ========< 0x180012daf      jz    0x180012dc2
| |||||||   0x180012db1      cmp   dword [rcx], 0x00
| ========< 0x180012db4      jl    0x180012dc2
| |||||||   0x180012db6      sub   qword [rcx], 0x01
| ========< 0x180012dba      jnz   0x180012dc2
| |||||||   0x180012dbc      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180012dc2      mov   eax, dword [rsi]
| |||||||   0x180012dc4      add   eax, 0x01
| ========< 0x180012dc7      jz    0x180012dcb
| |||||||   0x180012dc9      mov   dword [rsi], eax
| --------> 0x180012dcb      mov   rax, qword [0x1800307e8]            ; [0x1800307e8:8]=0
| |||||||   0x180012dd2      lea   rdx, qword [var_130h]
| |||||||   0x180012dd6      mov   rcx, qword [0x1800310c8]            ; [0x1800310c8:8]=0
| |||||||   0x180012ddd      xor   r9d, r9d
| |||||||   0x180012de0      mov   r8, r12
| |||||||   0x180012de3      mov   qword [var_128h], rax
| |||||||   0x180012de7      mov   qword [var_130h], rsi
| |||||||   0x180012deb      call  qword [sym.imp.python312.dll_PyObject_VectorcallMethod] ; [0x1800283f8:8]=0x2df22 ; "\"\xdf\U00000002"
| |||||||   0x180012df1      cmp   dword [rsi], 0x00
| |||||||   0x180012df4      mov   rbx, rax
| ========< 0x180012df7      jl    0x180012e08
| |||||||   0x180012df9      sub   qword [rsi], 0x01
| ========< 0x180012dfd      jnz   0x180012e08
| |||||||   0x180012dff      mov   rcx, rsi
| |||||||   0x180012e02      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180012e08      test  rbx, rbx
| ========< 0x180012e0b      jz    0x1800130e1
| |||||||   0x180012e11      xor   edx, edx
| |||||||   0x180012e13      cmp   rbx, qword [sym.imp.python312.dll__Py_TrueStruct] ; [0x1800284f0:8]=0x2e1aa
| |||||||   0x180012e1a      mov   r14d, edx
| |||||||   0x180012e1d      mov   ecx, edx
| |||||||   0x180012e1f      mov   eax, edx
| |||||||   0x180012e21      setz  r14b
| |||||||   0x180012e25      cmp   rbx, qword [sym.imp.python312.dll__Py_FalseStruct] ; [0x180028260:8]=0x2db02
| |||||||   0x180012e2c      setz  cl
| |||||||   0x180012e2f      cmp   rbx, qword [sym.imp.python312.dll__Py_NoneStruct] ; [0x180028188:8]=0x2d904
| |||||||   0x180012e36      setz  al
| |||||||   0x180012e39      or    ecx, eax
| |||||||   0x180012e3b      or    ecx, r14d
| ========< 0x180012e3e      jnz   0x180012e4e
| |||||||   0x180012e40      mov   rcx, rbx
| |||||||   0x180012e43      call  qword [sym.imp.python312.dll_PyObject_IsTrue] ; [0x1800284a8:8]=0x2e0fa
| |||||||   0x180012e49      mov   r14d, eax
| |||||||   0x180012e4c      xor   edx, edx
| --------> 0x180012e4e      test  r14d, r14d
| ========< 0x180012e51      js    0x1800130d2
| |||||||   0x180012e57      cmp   dword [rbx], 0x00
| ========< 0x180012e5a      jl    0x180012e6b
| |||||||   0x180012e5c      sub   qword [rbx], 0x01
| ========< 0x180012e60      jnz   0x180012e6b
| |||||||   0x180012e62      mov   rcx, rbx
| |||||||   0x180012e65      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180012e6b      xor   eax, eax
| |||||||   0x180012e6d      test  r14d, r14d
| |||||||   0x180012e70      mov   edi, eax
| |||||||   0x180012e72      mov   ebx, eax
| |||||||   0x180012e74      setz  dil
| |||||||   0x180012e78      test  r14d, r14d
| ========< 0x180012e7b      jz    0x18001301a
| |||||||   0x180012e81      mov   rcx, qword [0x180030f78]            ; [0x180030f78:8]=0
| |||||||   0x180012e88      mov   r12d, eax
| |||||||   0x180012e8b      call  0x180020950
| |||||||   0x180012e90      mov   qword [var_220h], rax
| |||||||   0x180012e95      mov   rcx, rax
| |||||||   0x180012e98      test  rax, rax
| ========< 0x180012e9b      jz    0x1800130e8
| |||||||   0x180012ea1      mov   rax, qword [rax+0x08]
| |||||||   0x180012ea5      mov   rdx, qword [0x180030e08]            ; [0x180030e08:8]=0
| |||||||   0x180012eac      mov   r8, qword [rax+0x90]
| |||||||   0x180012eb3      test  r8, r8
| ========< 0x180012eb6      jz    0x180012ebd
| |||||||   0x180012eb8      call  r8
| ========< 0x180012ebb      jmp   0x180012ec3
| --------> 0x180012ebd      call  qword [sym.imp.python312.dll_PyObject_GetAttr] ; [0x180028168:8]=0x2d8b6
| |||||||   ; CODE XREF from fcn.180012080 @ 0x180012ebb
| --------> 0x180012ec3      mov   rdi, rax
| |||||||   0x180012ec6      mov   r14, rax
| |||||||   0x180012ec9      test  rax, rax
| ========< 0x180012ecc      jz    0x1800130e8
| |||||||   0x180012ed2      mov   rcx, qword [var_220h]
| |||||||   0x180012ed7      cmp   dword [rcx], ebx
| ========< 0x180012ed9      jl    0x180012ee7
| |||||||   0x180012edb      sub   qword [rcx], 0x01
| ========< 0x180012edf      jnz   0x180012ee7
| |||||||   0x180012ee1      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180012ee7      mov   rax, qword [sym.imp.python312.dll_PyMethod_Type] ; [0x180028290:8]=0x2db7e ; "~\xdb\U00000002"
| |||||||   0x180012eee      mov   ecx, 0x01
| |||||||   0x180012ef3      mov   qword [var_220h], rbx
| |||||||   0x180012ef8      cmp   qword [rdi+0x08], rax
| ========< 0x180012efc      jnz   0x180012f31
| |||||||   0x180012efe      mov   r12, qword [rdi+0x18]
| |||||||   0x180012f02      mov   r14, qword [rdi+0x10]
| |||||||   0x180012f06      mov   eax, dword [r12]
| |||||||   0x180012f0a      add   eax, ecx
| ========< 0x180012f0c      jz    0x180012f12
| |||||||   0x180012f0e      mov   dword [r12], eax
| --------> 0x180012f12      mov   eax, dword [r14]
| |||||||   0x180012f15      add   eax, ecx
| ========< 0x180012f17      jz    0x180012f1c
| |||||||   0x180012f19      mov   dword [r14], eax
| --------> 0x180012f1c      cmp   dword [rdi], ebx
| ========< 0x180012f1e      jl    0x180012f2e
| |||||||   0x180012f20      sub   qword [rdi], rcx
| ========< 0x180012f23      jnz   0x180012f2e
| |||||||   0x180012f25      mov   rcx, rdi
| |||||||   0x180012f28      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180012f2e      mov   rcx, rbx
| --------> 0x180012f31      mov   rax, qword [0x180030810]            ; [0x180030810:8]=0
| |||||||   0x180012f38      lea   rdx, qword [var_88h]
| |||||||   0x180012f3f      mov   qword [var_80h], rax
| |||||||   0x180012f46      lea   rdx, qword [rdx+rcx*8]
| |||||||   0x180012f4a      mov   rax, rcx
| |||||||   0x180012f4d      mov   qword [var_88h], r12
| |||||||   0x180012f54      neg   rax
| |||||||   0x180012f57      mov   qword [var_78h], rsi
| |||||||   0x180012f5e      shl   rax, 0x3f
| |||||||   0x180012f62      mov   r8d, 0x03
| |||||||   0x180012f68      sub   r8, rcx
| |||||||   0x180012f6b      xor   r9d, r9d
| |||||||   0x180012f6e      or    r8, rax
| |||||||   0x180012f71      mov   rcx, r14
| |||||||   0x180012f74      call  0x18001fee0
| |||||||   0x180012f79      mov   rbx, rax
| |||||||   0x180012f7c      test  r12, r12
| ========< 0x180012f7f      jz    0x180012f98
| |||||||   0x180012f81      cmp   dword [r12], 0x00
| ========< 0x180012f86      jl    0x180012f98
| |||||||   0x180012f88      sub   qword [r12], 0x01
| ========< 0x180012f8d      jnz   0x180012f98
| |||||||   0x180012f8f      mov   rcx, r12
| |||||||   0x180012f92      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180012f98      cmp   dword [r14], 0x00
| ========< 0x180012f9c      jl    0x180012fad
| |||||||   0x180012f9e      sub   qword [r14], 0x01
| ========< 0x180012fa2      jnz   0x180012fad
| |||||||   0x180012fa4      mov   rcx, r14
| |||||||   0x180012fa7      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180012fad      test  rbx, rbx
| ========< 0x180012fb0      jz    0x1800130e8
| |||||||   0x180012fb6      xor   r14d, r14d
| |||||||   0x180012fb9      cmp   rbx, qword [sym.imp.python312.dll__Py_TrueStruct] ; [0x1800284f0:8]=0x2e1aa
| |||||||   0x180012fc0      mov   edi, r14d
| |||||||   0x180012fc3      mov   ecx, r14d
| |||||||   0x180012fc6      mov   eax, r14d
| |||||||   0x180012fc9      setz  dil
| |||||||   0x180012fcd      cmp   rbx, qword [sym.imp.python312.dll__Py_FalseStruct] ; [0x180028260:8]=0x2db02
| |||||||   0x180012fd4      setz  cl
| |||||||   0x180012fd7      cmp   rbx, qword [sym.imp.python312.dll__Py_NoneStruct] ; [0x180028188:8]=0x2d904
| |||||||   0x180012fde      setz  al
| |||||||   0x180012fe1      or    ecx, eax
| |||||||   0x180012fe3      or    ecx, edi
| ========< 0x180012fe5      jnz   0x180012ff2
| |||||||   0x180012fe7      mov   rcx, rbx
| |||||||   0x180012fea      call  qword [sym.imp.python312.dll_PyObject_IsTrue] ; [0x1800284a8:8]=0x2e0fa
| |||||||   0x180012ff0      mov   edi, eax
| --------> 0x180012ff2      test  edi, edi
| ========< 0x180012ff4      js    0x1800130e8
| |||||||   0x180012ffa      cmp   dword [rbx], r14d
| ========< 0x180012ffd      jl    0x18001300e
| |||||||   0x180012fff      sub   qword [rbx], 0x01
| ========< 0x180013003      jnz   0x18001300e
| |||||||   0x180013005      mov   rcx, rbx
| |||||||   0x180013008      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x18001300e      mov   r12, 0x8000000000000002
| ========< 0x180013018      jmp   0x180013022
| --------> 0x18001301a      mov   qword [var_220h], rax
| |||||||   0x18001301f      xor   r14d, r14d
| |||||||   ; CODE XREF from fcn.180012080 @ 0x180013018
| --------> 0x180013022      mov   rbx, qword [var_1f8h]
| |||||||   0x180013027      test  edi, edi
| ========< 0x180013029      jz    0x180013060
| |||||||   0x18001302b      mov   rcx, qword [rbx+0x10]
| |||||||   0x18001302f      cmp   qword [rbx+0x20], rcx
| ========< 0x180013033      jle   0x180013050
| |||||||   0x180013035      mov   eax, dword [rsi]
| |||||||   0x180013037      add   eax, 0x01
| ========< 0x18001303a      jz    0x18001303e
| |||||||   0x18001303c      mov   dword [rsi], eax
| --------> 0x18001303e      mov   rax, qword [rbx+0x18]
| |||||||   0x180013042      mov   qword [rax+rcx*8], rsi
| |||||||   0x180013046      lea   rax, qword [rcx+0x01]
| |||||||   0x18001304a      mov   qword [rbx+0x10], rax
| ========< 0x18001304e      jmp   0x180013060
| --------> 0x180013050      mov   rdx, rsi
| |||||||   0x180013053      mov   rcx, rbx
| |||||||   0x180013056      call  qword [sym.imp.python312.dll_PyList_Append] ; [0x180028388:8]=0x2dde0
| |||||||   0x18001305c      test  eax, eax
| ========< 0x18001305e      jnz   0x1800130c4
| |||||||   ; CODE XREF from fcn.180012080 @ 0x18001304e
| --------> 0x180013060      mov   rdi, r15
| |||||||   0x180013063      cmp   r13, qword [r15+0x10]
| ========< 0x180013067      jl    0x180012d90
| --------> 0x18001306d      cmp   dword [rdi], 0x00
| ========< 0x180013070      jl    0x180013081
| |||||||   0x180013072      sub   qword [rdi], 0x01
| ========< 0x180013076      jnz   0x180013081
| |||||||   0x180013078      mov   rcx, rdi
| |||||||   0x18001307b      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180013081      mov   rcx, qword [var_1a0h]
| |||||||   0x180013085      mov   r15, r14
| |||||||   0x180013088      test  rcx, rcx
| ========< 0x18001308b      jz    0x18001309e
| |||||||   0x18001308d      cmp   dword [rcx], 0x00
| ========< 0x180013090      jl    0x18001309e
| |||||||   0x180013092      sub   qword [rcx], 0x01
| ========< 0x180013096      jnz   0x18001309e
| |||||||   0x180013098      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x18001309e      xor   ecx, ecx
| |||||||   0x1800130a0      mov   qword [var_1e0h], rbx
| |||||||   0x1800130a5      call  qword [sym.imp.python312.dll_PyList_New] ; [0x180028348:8]=0x2dd4a ; "J\xdd\U00000002"
| |||||||   0x1800130ab      mov   r13, rax
| |||||||   0x1800130ae      test  rax, rax
| ========< 0x1800130b1      jnz   0x1800130f2
| |||||||   0x1800130b3      mov   r14, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
| |||||||   0x1800130ba      mov   edi, 0x135                          ; 309
| ========< 0x1800130bf      jmp   0x180012d0b
| --------> 0x1800130c4      xor   eax, eax
| |||||||   0x1800130c6      mov   edi, 0x134                          ; 308
| |||||||   0x1800130cb      mov   ebx, eax
| ========< 0x1800130cd      jmp   0x180012cbb
| --------> 0x1800130d2      mov   qword [var_220h], rdx
| |||||||   0x1800130d7      mov   edi, 0x134                          ; 308
| ========< 0x1800130dc      jmp   0x180012cbb
| --------> 0x1800130e1      xor   eax, eax
| |||||||   0x1800130e3      mov   qword [var_220h], rax
| --------> 0x1800130e8      mov   edi, 0x134                          ; 308
| ========< 0x1800130ed      jmp   0x180012cbb
| --------> 0x1800130f2      mov   eax, dword [rdi]
| |||||||   0x1800130f4      mov   r15, rdi
| |||||||   0x1800130f7      add   eax, 0x01
| ========< 0x1800130fa      jz    0x1800130fe
| |||||||   0x1800130fc      mov   dword [rdi], eax
| --------> 0x1800130fe      cmp   qword [rdi+0x10], 0x00
| ========< 0x180013103      jle   0x1800132d4
| |||||||   0x180013109      nop   dword [rax], eax
| --------> 0x180013110      mov   rax, qword [rdi+0x18]
| |||||||   0x180013114      mov   rsi, qword [rax+r14*8]
| |||||||   0x180013118      mov   eax, dword [rsi]
| |||||||   0x18001311a      add   eax, 0x01
| ========< 0x18001311d      jz    0x180013121
| |||||||   0x18001311f      mov   dword [rsi], eax
| --------> 0x180013121      mov   rcx, qword [var_190h]
| |||||||   0x180013125      inc   r14
| |||||||   0x180013128      mov   qword [var_190h], rsi
| |||||||   0x18001312c      test  rcx, rcx
| ========< 0x18001312f      jz    0x180013142
| |||||||   0x180013131      cmp   dword [rcx], 0x00
| ========< 0x180013134      jl    0x180013142
| |||||||   0x180013136      sub   qword [rcx], 0x01
| ========< 0x18001313a      jnz   0x180013142
| |||||||   0x18001313c      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180013142      mov   eax, dword [rsi]
| |||||||   0x180013144      add   eax, 0x01
| ========< 0x180013147      jz    0x18001314b
| |||||||   0x180013149      mov   dword [rsi], eax
| --------> 0x18001314b      mov   rax, qword [0x1800307e8]            ; [0x1800307e8:8]=0
| |||||||   0x180013152      lea   rdx, qword [var_120h]
| |||||||   0x180013156      mov   rcx, qword [0x1800310c8]            ; [0x1800310c8:8]=0
| |||||||   0x18001315d      xor   r9d, r9d
| |||||||   0x180013160      mov   r8, r12
| |||||||   0x180013163      mov   qword [var_118h], rax
| |||||||   0x180013167      mov   qword [var_120h], rsi
| |||||||   0x18001316b      call  qword [sym.imp.python312.dll_PyObject_VectorcallMethod] ; [0x1800283f8:8]=0x2df22 ; "\"\xdf\U00000002"
| |||||||   0x180013171      cmp   dword [rsi], 0x00
| |||||||   0x180013174      mov   rbx, rax
| ========< 0x180013177      jl    0x180013188
| |||||||   0x180013179      sub   qword [rsi], 0x01
| ========< 0x18001317d      jnz   0x180013188
| |||||||   0x18001317f      mov   rcx, rsi
| |||||||   0x180013182      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180013188      test  rbx, rbx
| ========< 0x18001318b      jz    0x180013336
| |||||||   0x180013191      xor   eax, eax
| |||||||   0x180013193      cmp   rbx, qword [sym.imp.python312.dll__Py_TrueStruct] ; [0x1800284f0:8]=0x2e1aa
| |||||||   0x18001319a      mov   edi, eax
| |||||||   0x18001319c      mov   ecx, eax
| |||||||   0x18001319e      setz  dil
| |||||||   0x1800131a2      cmp   rbx, qword [sym.imp.python312.dll__Py_FalseStruct] ; [0x180028260:8]=0x2db02
| |||||||   0x1800131a9      setz  cl
| |||||||   0x1800131ac      cmp   rbx, qword [sym.imp.python312.dll__Py_NoneStruct] ; [0x180028188:8]=0x2d904
| |||||||   0x1800131b3      setz  al
| |||||||   0x1800131b6      or    ecx, eax
| |||||||   0x1800131b8      or    ecx, edi
| ========< 0x1800131ba      jnz   0x1800131c7
| |||||||   0x1800131bc      mov   rcx, rbx
| |||||||   0x1800131bf      call  qword [sym.imp.python312.dll_PyObject_IsTrue] ; [0x1800284a8:8]=0x2e0fa
| |||||||   0x1800131c5      mov   edi, eax
| --------> 0x1800131c7      test  edi, edi
| ========< 0x1800131c9      js    0x180013336
| |||||||   0x1800131cf      cmp   dword [rbx], 0x00
| ========< 0x1800131d2      jl    0x1800131e3
| |||||||   0x1800131d4      sub   qword [rbx], 0x01
| ========< 0x1800131d8      jnz   0x1800131e3
| |||||||   0x1800131da      mov   rcx, rbx
| |||||||   0x1800131dd      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x1800131e3      test  edi, edi
| ========< 0x1800131e5      jz    0x1800132c5
| |||||||   0x1800131eb      mov   eax, dword [rsi]
| |||||||   0x1800131ed      add   eax, 0x01
| ========< 0x1800131f0      jz    0x1800131f4
| |||||||   0x1800131f2      mov   dword [rsi], eax
| --------> 0x1800131f4      mov   rax, qword [0x1800307d8]            ; [0x1800307d8:8]=0
| |||||||   0x1800131fb      lea   rdx, qword [var_110h]
| |||||||   0x1800131ff      mov   rcx, qword [0x1800310c8]            ; [0x1800310c8:8]=0
| |||||||   0x180013206      xor   r9d, r9d
| |||||||   0x180013209      mov   r8, r12
| |||||||   0x18001320c      mov   qword [var_108h], rax
| |||||||   0x180013210      mov   qword [var_110h], rsi
| |||||||   0x180013214      call  qword [sym.imp.python312.dll_PyObject_VectorcallMethod] ; [0x1800283f8:8]=0x2df22 ; "\"\xdf\U00000002"
| |||||||   0x18001321a      cmp   dword [rsi], 0x00
| |||||||   0x18001321d      mov   rbx, rax
| ========< 0x180013220      jl    0x180013231
| |||||||   0x180013222      sub   qword [rsi], 0x01
| ========< 0x180013226      jnz   0x180013231
| |||||||   0x180013228      mov   rcx, rsi
| |||||||   0x18001322b      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180013231      test  rbx, rbx
| ========< 0x180013234      jz    0x180013336
| |||||||   0x18001323a      xor   eax, eax
| |||||||   0x18001323c      cmp   rbx, qword [sym.imp.python312.dll__Py_TrueStruct] ; [0x1800284f0:8]=0x2e1aa
| |||||||   0x180013243      mov   edi, eax
| |||||||   0x180013245      mov   ecx, eax
| |||||||   0x180013247      setz  dil
| |||||||   0x18001324b      cmp   rbx, qword [sym.imp.python312.dll__Py_FalseStruct] ; [0x180028260:8]=0x2db02
| |||||||   0x180013252      setz  cl
| |||||||   0x180013255      cmp   rbx, qword [sym.imp.python312.dll__Py_NoneStruct] ; [0x180028188:8]=0x2d904
| |||||||   0x18001325c      setz  al
| |||||||   0x18001325f      or    ecx, eax
| |||||||   0x180013261      or    ecx, edi
| ========< 0x180013263      jnz   0x180013270
| |||||||   0x180013265      mov   rcx, rbx
| |||||||   0x180013268      call  qword [sym.imp.python312.dll_PyObject_IsTrue] ; [0x1800284a8:8]=0x2e0fa
| |||||||   0x18001326e      mov   edi, eax
| --------> 0x180013270      test  edi, edi
| ========< 0x180013272      js    0x180013336
| |||||||   0x180013278      cmp   dword [rbx], 0x00
| ========< 0x18001327b      jl    0x18001328c
| |||||||   0x18001327d      sub   qword [rbx], 0x01
| ========< 0x180013281      jnz   0x18001328c
| |||||||   0x180013283      mov   rcx, rbx
| |||||||   0x180013286      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x18001328c      test  edi, edi
| ========< 0x18001328e      jnz   0x1800132c5
| |||||||   0x180013290      mov   rcx, qword [r13+0x10]
| |||||||   0x180013294      cmp   qword [r13+0x20], rcx
| ========< 0x180013298      jle   0x1800132b5
| |||||||   0x18001329a      mov   eax, dword [rsi]
| |||||||   0x18001329c      add   eax, 0x01
| ========< 0x18001329f      jz    0x1800132a3
| |||||||   0x1800132a1      mov   dword [rsi], eax
| --------> 0x1800132a3      mov   rax, qword [r13+0x18]
| |||||||   0x1800132a7      mov   qword [rax+rcx*8], rsi
| |||||||   0x1800132ab      lea   rax, qword [rcx+0x01]
| |||||||   0x1800132af      mov   qword [r13+0x10], rax
| ========< 0x1800132b3      jmp   0x1800132c5
| --------> 0x1800132b5      mov   rdx, rsi
| |||||||   0x1800132b8      mov   rcx, r13
| |||||||   0x1800132bb      call  qword [sym.imp.python312.dll_PyList_Append] ; [0x180028388:8]=0x2dde0
| |||||||   0x1800132c1      test  eax, eax
| ========< 0x1800132c3      jnz   0x180013332
| |||||||   ; CODE XREF from fcn.180012080 @ 0x1800132b3
| --------> 0x1800132c5      mov   rdi, qword [var_1e8h]
| |||||||   0x1800132ca      cmp   r14, qword [rdi+0x10]
| ========< 0x1800132ce      jl    0x180013110
| --------> 0x1800132d4      cmp   dword [rdi], 0x00
| ========< 0x1800132d7      jl    0x1800132e8
| |||||||   0x1800132d9      sub   qword [rdi], 0x01
| ========< 0x1800132dd      jnz   0x1800132e8
| |||||||   0x1800132df      mov   rcx, rdi
| |||||||   0x1800132e2      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x1800132e8      mov   rcx, qword [var_190h]
| |||||||   0x1800132ec      test  rcx, rcx
| ========< 0x1800132ef      jz    0x180013302
| |||||||   0x1800132f1      cmp   dword [rcx], 0x00
| ========< 0x1800132f4      jl    0x180013302
| |||||||   0x1800132f6      sub   qword [rcx], 0x01
| ========< 0x1800132fa      jnz   0x180013302
| |||||||   0x1800132fc      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180013302      mov   rcx, qword [0x180030f20]            ; [0x180030f20:8]=0
| |||||||   0x180013309      mov   qword [var_218h], r13
| |||||||   0x18001330e      xor   r13d, r13d
| |||||||   0x180013311      mov   r15d, r13d
| |||||||   0x180013314      call  0x180020950
| |||||||   0x180013319      mov   rbx, rax
| |||||||   0x18001331c      test  rax, rax
| ========< 0x18001331f      jnz   0x180013363
| |||||||   0x180013321      mov   r14, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
| |||||||   0x180013328      mov   edi, 0x137                          ; 311
| ========< 0x18001332d      jmp   0x180012d0b
| --------> 0x180013332      xor   eax, eax
| |||||||   0x180013334      mov   ebx, eax
| --------> 0x180013336      mov   r14, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
| |||||||   0x18001333d      mov   edi, 0x135                          ; 309
| |||||||   0x180013342      cmp   dword [rsi], 0x00
| ========< 0x180013345      jl    0x180012cdb
| |||||||   0x18001334b      sub   qword [rsi], 0x01
| ========< 0x18001334f      jnz   0x180012cdb
| |||||||   0x180013355      mov   rcx, rsi
| |||||||   0x180013358      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| ========< 0x18001335e      jmp   0x180012cdb
| --------> 0x180013363      mov   rax, qword [rax+0x08]
| |||||||   0x180013367      mov   rcx, rbx
| |||||||   0x18001336a      mov   rdx, qword [0x180030928]            ; [0x180030928:8]=0
| |||||||   0x180013371      mov   r8, qword [rax+0x90]
| |||||||   0x180013378      test  r8, r8
| ========< 0x18001337b      jz    0x180013382
| |||||||   0x18001337d      call  r8
| ========< 0x180013380      jmp   0x180013388
| --------> 0x180013382      call  qword [sym.imp.python312.dll_PyObject_GetAttr] ; [0x180028168:8]=0x2d8b6
| |||||||   ; CODE XREF from fcn.180012080 @ 0x180013380
| --------> 0x180013388      mov   rdi, rax
| |||||||   0x18001338b      mov   r12, rax
| |||||||   0x18001338e      test  rax, rax
| ========< 0x180013391      jnz   0x1800133a4
| |||||||   0x180013393      mov   r14, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
| |||||||   0x18001339a      mov   edi, 0x137                          ; 311
| ========< 0x18001339f      jmp   0x180012cf7
| --------> 0x1800133a4      cmp   dword [rbx], r13d
| ========< 0x1800133a7      jl    0x1800133b8
| |||||||   0x1800133a9      sub   qword [rbx], 0x01
| ========< 0x1800133ad      jnz   0x1800133b8
| |||||||   0x1800133af      mov   rcx, rbx
| |||||||   0x1800133b2      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x1800133b8      mov   r14, qword [var_228h]
| |||||||   0x1800133bd      mov   rbx, r13
| |||||||   0x1800133c0      mov   rcx, r14
| |||||||   0x1800133c3      call  qword [sym.imp.python312.dll_PyObject_Size] ; [0x180028578:8]=0x2e318
| |||||||   0x1800133c9      mov   rsi, rax
| |||||||   0x1800133cc      cmp   rax, 0xffffffffffffffff
| ========< 0x1800133d0      jnz   0x1800133e6
| |||||||   0x1800133d2      mov   r14, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
| |||||||   0x1800133d9      mov   edi, 0x137                          ; 311
| |||||||   0x1800133de      mov   rsi, r13
| ========< 0x1800133e1      jmp   0x18001379c
| --------> 0x1800133e6      test  rsi, rsi
| |||||||   0x1800133e9      mov   rcx, rsi
| |||||||   0x1800133ec      cmovs rcx, r13
| |||||||   0x1800133f0      call  qword [sym.imp.python312.dll_PyList_New] ; [0x180028348:8]=0x2dd4a ; "J\xdd\U00000002"
| |||||||   0x1800133f6      mov   rbx, rax
| |||||||   0x1800133f9      test  rax, rax
| ========< 0x1800133fc      jnz   0x180013412
| |||||||   0x1800133fe      mov   r14, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
| |||||||   0x180013405      mov   edi, 0x137                          ; 311
| |||||||   0x18001340a      mov   rsi, r13
| ========< 0x18001340d      jmp   0x18001379c
| --------> 0x180013412      mov   rdx, r13
| |||||||   0x180013415      test  rsi, rsi
| ========< 0x180013418      jle   0x180013447
| |||||||   0x18001341a      nop   word [rax+rax*1], ax
| --------> 0x180013420      mov   rcx, qword [sym.imp.python312.dll__Py_TrueStruct] ; [0x1800284f0:8]=0x2e1aa
| |||||||   0x180013427      mov   eax, dword [rcx]
| |||||||   0x180013429      add   eax, 0x01
| ========< 0x18001342c      jz    0x180013437
| |||||||   0x18001342e      mov   dword [rcx], eax
| |||||||   0x180013430      mov   rcx, qword [sym.imp.python312.dll__Py_TrueStruct] ; [0x1800284f0:8]=0x2e1aa
| --------> 0x180013437      mov   rax, qword [rbx+0x18]
| |||||||   0x18001343b      mov   qword [rax+rdx*8], rcx
| |||||||   0x18001343f      inc   rdx
| |||||||   0x180013442      cmp   rdx, rsi
| ========< 0x180013445      jl    0x180013420
| --------> 0x180013447      mov   rax, qword [r14+0x08]
| |||||||   0x18001344b      mov   rcx, r14
| |||||||   0x18001344e      mov   rdx, qword [0x180030d58]            ; [0x180030d58:8]=0
| |||||||   0x180013455      mov   r8, qword [rax+0x90]
| |||||||   0x18001345c      test  r8, r8
| ========< 0x18001345f      jz    0x180013466
| |||||||   0x180013461      call  r8
| ========< 0x180013464      jmp   0x18001346c
| --------> 0x180013466      call  qword [sym.imp.python312.dll_PyObject_GetAttr] ; [0x180028168:8]=0x2d8b6
| |||||||   ; CODE XREF from fcn.180012080 @ 0x180013464
| --------> 0x18001346c      mov   rsi, rax
| |||||||   0x18001346f      test  rax, rax
| ========< 0x180013472      jnz   0x180013485
| |||||||   0x180013474      mov   r14, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
| |||||||   0x18001347b      mov   edi, 0x137                          ; 311
| ========< 0x180013480      jmp   0x18001379c
| --------> 0x180013485      mov   rax, qword [sym.imp.python312.dll_PyMethod_Type] ; [0x180028290:8]=0x2db7e ; "~\xdb\U00000002"
| |||||||   0x18001348c      mov   r14d, 0x01
| |||||||   0x180013492      cmp   qword [rdi+0x08], rax
| ========< 0x180013496      jnz   0x1800134ce
| |||||||   0x180013498      mov   r15, qword [rdi+0x18]
| |||||||   0x18001349c      mov   r12, qword [rdi+0x10]
| |||||||   0x1800134a0      mov   eax, dword [r15]
| |||||||   0x1800134a3      add   eax, r14d
| ========< 0x1800134a6      jz    0x1800134ab
| |||||||   0x1800134a8      mov   dword [r15], eax
| --------> 0x1800134ab      mov   eax, dword [r12]
| |||||||   0x1800134af      add   eax, r14d
| ========< 0x1800134b2      jz    0x1800134b8
| |||||||   0x1800134b4      mov   dword [r12], eax
| --------> 0x1800134b8      cmp   dword [rdi], r13d
| ========< 0x1800134bb      jl    0x1800134cb
| |||||||   0x1800134bd      sub   qword [rdi], r14
| ========< 0x1800134c0      jnz   0x1800134cb
| |||||||   0x1800134c2      mov   rcx, rdi
| |||||||   0x1800134c5      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x1800134cb      mov   r14, r13
| --------> 0x1800134ce      xor   eax, eax
| |||||||   0x1800134d0      mov   qword [var_f8h], r15
| |||||||   0x1800134d4      mov   ecx, 0x01
| |||||||   0x1800134d9      mov   qword [var_e8h], rax
| |||||||   0x1800134dd      mov   qword [var_f0h], rbx
| |||||||   0x1800134e1      call  qword [sym.imp.python312.dll_PyTuple_New] ; [0x180028190:8]=0x2d916
| |||||||   0x1800134e7      mov   qword [var_220h], rax
| |||||||   0x1800134ec      mov   r13, rax
| |||||||   0x1800134ef      test  rax, rax
| ========< 0x1800134f2      jnz   0x1800134fe
| |||||||   0x1800134f4      mov   edi, 0x137                          ; 311
| ========< 0x1800134f9      jmp   0x180013788
| --------> 0x1800134fe      mov   rax, qword [0x180030d58]            ; [0x180030d58:8]=0
| |||||||   0x180013505      mov   qword [r13+0x18], rax
| |||||||   0x180013509      mov   ecx, dword [rax]
| |||||||   0x18001350b      add   ecx, 0x01
| ========< 0x18001350e      jz    0x180013512
| |||||||   0x180013510      mov   dword [rax], ecx
| --------> 0x180013512      mov   rax, r14
| |||||||   0x180013515      mov   qword [var_e8h], rsi
| |||||||   0x180013519      neg   rax
| |||||||   0x18001351c      lea   rdx, qword [var_f8h]
| |||||||   0x180013520      shl   rax, 0x3f
| |||||||   0x180013524      lea   rdx, qword [rdx+r14*8]
| |||||||   0x180013528      mov   r8d, 0x02
| |||||||   0x18001352e      mov   r9, r13
| |||||||   0x180013531      sub   r8, r14
| |||||||   0x180013534      mov   rcx, r12
| |||||||   0x180013537      or    r8, rax
| |||||||   0x18001353a      call  qword [sym.imp.python312.dll_PyObject_Vectorcall] ; [0x180028328:8]=0x2dd02
| |||||||   0x180013540      mov   rdi, rax
| |||||||   0x180013543      test  r15, r15
| ========< 0x180013546      jz    0x18001355d
| |||||||   0x180013548      cmp   dword [r15], 0x00
| ========< 0x18001354c      jl    0x18001355d
| |||||||   0x18001354e      sub   qword [r15], 0x01
| ========< 0x180013552      jnz   0x18001355d
| |||||||   0x180013554      mov   rcx, r15
| |||||||   0x180013557      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x18001355d      xor   r14d, r14d
| |||||||   0x180013560      mov   r15d, r14d
| |||||||   0x180013563      cmp   dword [rbx], r14d
| ========< 0x180013566      jl    0x180013577
| |||||||   0x180013568      sub   qword [rbx], 0x01
| ========< 0x18001356c      jnz   0x180013577
| |||||||   0x18001356e      mov   rcx, rbx
| |||||||   0x180013571      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180013577      mov   rbx, r14
| |||||||   0x18001357a      cmp   dword [rsi], r14d
| ========< 0x18001357d      jl    0x18001358e
| |||||||   0x18001357f      sub   qword [rsi], 0x01
| ========< 0x180013583      jnz   0x18001358e
| |||||||   0x180013585      mov   rcx, rsi
| |||||||   0x180013588      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x18001358e      cmp   dword [r13], ebx
| ========< 0x180013592      jl    0x1800135a4
| |||||||   0x180013594      sub   qword [r13], 0x01
| ========< 0x180013599      jnz   0x1800135a4
| |||||||   0x18001359b      mov   rcx, r13
| |||||||   0x18001359e      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x1800135a4      cmp   dword [r12], ebx
| ========< 0x1800135a8      jl    0x1800135ba
| |||||||   0x1800135aa      sub   qword [r12], 0x01
| ========< 0x1800135af      jnz   0x1800135ba
| |||||||   0x1800135b1      mov   rcx, r12
| |||||||   0x1800135b4      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x1800135ba      test  rdi, rdi
| ========< 0x1800135bd      jnz   0x1800135c9
| |||||||   0x1800135bf      mov   edi, 0x137                          ; 311
| ========< 0x1800135c4      jmp   0x180013d23
| --------> 0x1800135c9      mov   rax, qword [var_1e0h]
| |||||||   0x1800135ce      xor   esi, esi
| |||||||   0x1800135d0      mov   qword [var_210h], rdi
| |||||||   0x1800135d5      cmp   qword [rax+0x10], rbx
| ========< 0x1800135d9      jz    0x180013a81
| |||||||   0x1800135df      mov   rcx, qword [0x180030f20]            ; [0x180030f20:8]=0
| |||||||   0x1800135e6      mov   r12d, esi
| |||||||   0x1800135e9      call  0x180020950
| |||||||   0x1800135ee      mov   r13, rax
| |||||||   0x1800135f1      test  rax, rax
| ========< 0x1800135f4      jz    0x180013d1e
| |||||||   0x1800135fa      mov   rax, qword [rax+0x08]
| |||||||   0x1800135fe      mov   rcx, r13
| |||||||   0x180013601      mov   rdx, qword [0x180030928]            ; [0x180030928:8]=0
| |||||||   0x180013608      mov   r8, qword [rax+0x90]
| |||||||   0x18001360f      test  r8, r8
| ========< 0x180013612      jz    0x180013619
| |||||||   0x180013614      call  r8
| ========< 0x180013617      jmp   0x18001361f
| --------> 0x180013619      call  qword [sym.imp.python312.dll_PyObject_GetAttr] ; [0x180028168:8]=0x2d8b6
| |||||||   ; CODE XREF from fcn.180012080 @ 0x180013617
| --------> 0x18001361f      mov   rdi, rax
| |||||||   0x180013622      mov   rsi, rax
| |||||||   0x180013625      test  rax, rax
| ========< 0x180013628      jnz   0x18001363b
| |||||||   0x18001362a      mov   r14, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
| |||||||   0x180013631      mov   edi, 0x139                          ; 313
| ========< 0x180013636      jmp   0x180012d15
| --------> 0x18001363b      cmp   dword [r13], ebx
| ========< 0x18001363f      jl    0x180013651
| |||||||   0x180013641      sub   qword [r13], 0x01
| ========< 0x180013646      jnz   0x180013651
| |||||||   0x180013648      mov   rcx, r13
| |||||||   0x18001364b      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180013651      mov   rcx, qword [var_228h]
| |||||||   0x180013656      xor   r13d, r13d
| |||||||   0x180013659      mov   qword [var_220h], r13
| |||||||   0x18001365e      call  qword [sym.imp.python312.dll_PyObject_Size] ; [0x180028578:8]=0x2e318
| |||||||   0x180013664      mov   r14, rax
| |||||||   0x180013667      cmp   rax, 0xffffffffffffffff
| ========< 0x18001366b      jnz   0x18001367a
| |||||||   0x18001366d      mov   edi, 0x139                          ; 313
| |||||||   0x180013672      mov   r13, rbx
| ========< 0x180013675      jmp   0x180013cb6
| --------> 0x18001367a      test  r14, r14
| |||||||   0x18001367d      mov   rcx, r14
| |||||||   0x180013680      cmovs rcx, r13
| |||||||   0x180013684      call  qword [sym.imp.python312.dll_PyList_New] ; [0x180028348:8]=0x2dd4a ; "J\xdd\U00000002"
| |||||||   0x18001368a      mov   qword [var_220h], rax
| |||||||   0x18001368f      mov   r13, rax
| |||||||   0x180013692      test  rax, rax
| ========< 0x180013695      jnz   0x1800136a4
| |||||||   0x180013697      mov   edi, 0x139                          ; 313
| |||||||   0x18001369c      mov   r13, rbx
| ========< 0x18001369f      jmp   0x180013cb6
| --------> 0x1800136a4      xor   eax, eax
| |||||||   0x1800136a6      mov   edx, eax
| |||||||   0x1800136a8      test  r14, r14
| ========< 0x1800136ab      jle   0x1800136d7
| |||||||   0x1800136ad      nop   dword [rax], eax
| --------> 0x1800136b0      mov   rcx, qword [sym.imp.python312.dll__Py_FalseStruct] ; [0x180028260:8]=0x2db02
| |||||||   0x1800136b7      mov   eax, dword [rcx]
| |||||||   0x1800136b9      add   eax, 0x01
| ========< 0x1800136bc      jz    0x1800136c7
| |||||||   0x1800136be      mov   dword [rcx], eax
| |||||||   0x1800136c0      mov   rcx, qword [sym.imp.python312.dll__Py_FalseStruct] ; [0x180028260:8]=0x2db02
| --------> 0x1800136c7      mov   rax, qword [r13+0x18]
| |||||||   0x1800136cb      mov   qword [rax+rdx*8], rcx
| |||||||   0x1800136cf      inc   rdx
| |||||||   0x1800136d2      cmp   rdx, r14
| ========< 0x1800136d5      jl    0x1800136b0
| --------> 0x1800136d7      mov   rcx, qword [var_228h]
| |||||||   0x1800136dc      mov   rdx, qword [0x180030d58]            ; [0x180030d58:8]=0
| |||||||   0x1800136e3      mov   rax, qword [rcx+0x08]
| |||||||   0x1800136e7      mov   r8, qword [rax+0x90]
| |||||||   0x1800136ee      test  r8, r8
| ========< 0x1800136f1      jz    0x1800136f8
| |||||||   0x1800136f3      call  r8
| ========< 0x1800136f6      jmp   0x1800136fe
| --------> 0x1800136f8      call  qword [sym.imp.python312.dll_PyObject_GetAttr] ; [0x180028168:8]=0x2d8b6
| |||||||   ; CODE XREF from fcn.180012080 @ 0x1800136f6
| --------> 0x1800136fe      mov   rbx, rax
| |||||||   0x180013701      test  rax, rax
| ========< 0x180013704      jnz   0x180013713
| |||||||   0x180013706      mov   edi, 0x139                          ; 313
| |||||||   0x18001370b      mov   r13, r12
| ========< 0x18001370e      jmp   0x180013cb6
| --------> 0x180013713      mov   rax, qword [sym.imp.python312.dll_PyMethod_Type] ; [0x180028290:8]=0x2db7e ; "~\xdb\U00000002"
| |||||||   0x18001371a      mov   r14d, 0x01
| |||||||   0x180013720      cmp   qword [rdi+0x08], rax
| ========< 0x180013724      jnz   0x18001375c
| |||||||   0x180013726      mov   r12, qword [rdi+0x18]
| |||||||   0x18001372a      mov   rsi, qword [rdi+0x10]
| |||||||   0x18001372e      mov   eax, dword [r12]
| |||||||   0x180013732      add   eax, r14d
| ========< 0x180013735      jz    0x18001373b
| |||||||   0x180013737      mov   dword [r12], eax
| --------> 0x18001373b      mov   eax, dword [rsi]
| |||||||   0x18001373d      add   eax, r14d
| ========< 0x180013740      jz    0x180013744
| |||||||   0x180013742      mov   dword [rsi], eax
| --------> 0x180013744      cmp   dword [rdi], r15d
| ========< 0x180013747      jl    0x180013757
| |||||||   0x180013749      sub   qword [rdi], r14
| ========< 0x18001374c      jnz   0x180013757
| |||||||   0x18001374e      mov   rcx, rdi
| |||||||   0x180013751      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180013757      xor   eax, eax
| |||||||   0x180013759      mov   r14d, eax
| --------> 0x18001375c      xor   eax, eax
| |||||||   0x18001375e      mov   qword [var_e0h], r12
| |||||||   0x180013762      mov   ecx, 0x01
| |||||||   0x180013767      mov   qword [var_d0h], rax
| |||||||   0x18001376e      mov   qword [var_d8h], r13
| |||||||   0x180013775      call  qword [sym.imp.python312.dll_PyTuple_New] ; [0x180028190:8]=0x2d916
| |||||||   0x18001377b      mov   r15, rax
| |||||||   0x18001377e      test  rax, rax
| ========< 0x180013781      jnz   0x1800137d5
| |||||||   0x180013783      mov   edi, 0x139                          ; 313
| |||||||   ; CODE XREF from fcn.180012080 @ 0x1800134f9
| --------> 0x180013788      mov   r14, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
| |||||||   0x18001378f      xor   r13d, r13d
| |||||||   0x180013792      mov   qword [var_1f8h], r13
| |||||||   0x180013797      test  r12, r12
| ========< 0x18001379a      jz    0x1800137c2
| |||||||   ; XREFS: CODE 0x18001270b  CODE 0x1800128df  CODE 0x180012922
| |||||||   ; XREFS: CODE 0x180012981  CODE 0x1800133e1  CODE 0x18001340d
| |||||||   ; XREFS: CODE 0x180013480
| --------> 0x18001379c      cmp   dword [r12], 0x00
| |||||||   0x1800137a1      mov   qword [var_1f8h], r13
| ========< 0x1800137a6      jl    0x1800137c2
| |||||||   0x1800137a8      sub   qword [r12], 0x01
| |||||||   0x1800137ad      mov   qword [var_1f8h], r13
| ========< 0x1800137b2      jnz   0x1800137c2
| |||||||   0x1800137b4      mov   rcx, r12
| |||||||   0x1800137b7      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| |||||||   0x1800137bd      mov   qword [var_1f8h], r13
| --------> 0x1800137c2      mov   r13, qword [var_1f8h]
| |||||||   0x1800137c7      test  rsi, rsi
| ========< 0x1800137ca      jz    0x180013cd1
| ========< 0x1800137d0      jmp   0x180013cbd
| --------> 0x1800137d5      mov   rax, qword [0x180030d58]            ; [0x180030d58:8]=0
| |||||||   0x1800137dc      mov   qword [r15+0x18], rax
| |||||||   0x1800137e0      mov   ecx, dword [rax]
| |||||||   0x1800137e2      add   ecx, 0x01
| ========< 0x1800137e5      jz    0x1800137e9
| |||||||   0x1800137e7      mov   dword [rax], ecx
| --------> 0x1800137e9      mov   rax, r14
| |||||||   0x1800137ec      mov   qword [var_d0h], rbx
| |||||||   0x1800137f3      neg   rax
| |||||||   0x1800137f6      lea   rdx, qword [var_e0h]
| |||||||   0x1800137fa      shl   rax, 0x3f
| |||||||   0x1800137fe      lea   rdx, qword [rdx+r14*8]
| |||||||   0x180013802      mov   r8d, 0x02
| |||||||   0x180013808      mov   r9, r15
| |||||||   0x18001380b      sub   r8, r14
| |||||||   0x18001380e      mov   rcx, rsi
| |||||||   0x180013811      or    r8, rax
| |||||||   0x180013814      call  qword [sym.imp.python312.dll_PyObject_Vectorcall] ; [0x180028328:8]=0x2dd02
| |||||||   0x18001381a      mov   rdi, rax
| |||||||   0x18001381d      test  r12, r12
| ========< 0x180013820      jz    0x180013839
| |||||||   0x180013822      cmp   dword [r12], 0x00
| ========< 0x180013827      jl    0x180013839
| |||||||   0x180013829      sub   qword [r12], 0x01
| ========< 0x18001382e      jnz   0x180013839
| |||||||   0x180013830      mov   rcx, r12
| |||||||   0x180013833      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180013839      cmp   dword [r13], 0x00
| ========< 0x18001383e      jl    0x180013850
| |||||||   0x180013840      sub   qword [r13], 0x01
| ========< 0x180013845      jnz   0x180013850
| |||||||   0x180013847      mov   rcx, r13
| |||||||   0x18001384a      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180013850      xor   eax, eax
| |||||||   0x180013852      mov   qword [var_220h], rax
| |||||||   0x180013857      cmp   dword [rbx], eax
| ========< 0x180013859      jl    0x18001386a
| |||||||   0x18001385b      sub   qword [rbx], 0x01
| ========< 0x18001385f      jnz   0x18001386a
| |||||||   0x180013861      mov   rcx, rbx
| |||||||   0x180013864      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x18001386a      cmp   dword [r15], 0x00
| ========< 0x18001386e      jl    0x18001387f
| |||||||   0x180013870      sub   qword [r15], 0x01
| ========< 0x180013874      jnz   0x18001387f
| |||||||   0x180013876      mov   rcx, r15
| |||||||   0x180013879      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x18001387f      cmp   dword [rsi], 0x00
| ========< 0x180013882      jl    0x180013893
| |||||||   0x180013884      sub   qword [rsi], 0x01
| ========< 0x180013888      jnz   0x180013893
| |||||||   0x18001388a      mov   rcx, rsi
| |||||||   0x18001388d      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180013893      test  rdi, rdi
| ========< 0x180013896      jz    0x180013d1e
| |||||||   0x18001389c      mov   r12, qword [var_1e0h]
| |||||||   0x1800138a1      mov   rbx, rdi
| |||||||   0x1800138a4      mov   qword [var_208h], rbx
| |||||||   0x1800138a9      mov   r13, r12
| |||||||   0x1800138ac      mov   eax, dword [r12]
| |||||||   0x1800138b0      add   eax, 0x01
| ========< 0x1800138b3      jz    0x1800138b9
| |||||||   0x1800138b5      mov   dword [r12], eax
| --------> 0x1800138b9      xor   esi, esi
| |||||||   0x1800138bb      mov   r14d, esi
| |||||||   0x1800138be      cmp   qword [r12+0x10], rsi
| ========< 0x1800138c3      jle   0x180013a43
| |||||||   0x1800138c9      nop   dword [rax], eax
| --------> 0x1800138d0      mov   rax, qword [r12+0x18]
| |||||||   0x1800138d5      mov   rdi, qword [rax+r14*8]
| |||||||   0x1800138d9      mov   eax, dword [rdi]
| |||||||   0x1800138db      add   eax, 0x01
| ========< 0x1800138de      jz    0x1800138e2
| |||||||   0x1800138e0      mov   dword [rdi], eax
| --------> 0x1800138e2      mov   rcx, qword [var_1d0h]
| |||||||   0x1800138e6      inc   r14
| |||||||   0x1800138e9      mov   qword [var_1d0h], rdi
| |||||||   0x1800138ed      test  rcx, rcx
| ========< 0x1800138f0      jz    0x180013903
| |||||||   0x1800138f2      cmp   dword [rcx], 0x00
| ========< 0x1800138f5      jl    0x180013903
| |||||||   0x1800138f7      sub   qword [rcx], 0x01
| ========< 0x1800138fb      jnz   0x180013903
| |||||||   0x1800138fd      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180013903      mov   rcx, qword [0x180030b00]            ; [0x180030b00:8]=0
| |||||||   0x18001390a      mov   r15, rsi
| |||||||   0x18001390d      call  0x180020950
| |||||||   0x180013912      mov   rbx, rax
| |||||||   0x180013915      test  rax, rax
| ========< 0x180013918      jz    0x180013cdf
| |||||||   0x18001391e      mov   rax, qword [sym.imp.python312.dll_PyMethod_Type] ; [0x180028290:8]=0x2db7e ; "~\xdb\U00000002"
| |||||||   0x180013925      mov   ecx, 0x01
| |||||||   0x18001392a      cmp   qword [rbx+0x08], rax
| ========< 0x18001392e      jnz   0x180013964
| |||||||   0x180013930      mov   r15, qword [rbx+0x18]
| |||||||   0x180013934      mov   rdx, qword [rbx+0x10]
| |||||||   0x180013938      mov   eax, dword [r15]
| |||||||   0x18001393b      add   eax, ecx
| ========< 0x18001393d      jz    0x180013942
| |||||||   0x18001393f      mov   dword [r15], eax
| --------> 0x180013942      mov   eax, dword [rdx]
| |||||||   0x180013944      add   eax, ecx
| ========< 0x180013946      jz    0x18001394a
| |||||||   0x180013948      mov   dword [rdx], eax
| --------> 0x18001394a      mov   rcx, rbx
| |||||||   0x18001394d      mov   rbx, rdx
| |||||||   0x180013950      cmp   dword [rcx], 0x00
| ========< 0x180013953      jl    0x180013961
| |||||||   0x180013955      sub   qword [rcx], 0x01
| ========< 0x180013959      jnz   0x180013961
| |||||||   0x18001395b      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180013961      mov   rcx, rsi
| --------> 0x180013964      mov   rax, qword [var_228h]
| |||||||   0x180013969      lea   rdx, qword [var_70h]
| |||||||   0x180013970      mov   qword [var_68h], rax
| |||||||   0x180013977      lea   rdx, qword [rdx+rcx*8]
| |||||||   0x18001397b      mov   rax, rcx
| |||||||   0x18001397e      mov   qword [var_70h], r15
| |||||||   0x180013985      neg   rax
| |||||||   0x180013988      mov   qword [var_60h], rdi
| |||||||   0x18001398f      shl   rax, 0x3f
| |||||||   0x180013993      mov   r8d, 0x03
| |||||||   0x180013999      sub   r8, rcx
| |||||||   0x18001399c      xor   r9d, r9d
| |||||||   0x18001399f      or    r8, rax
| |||||||   0x1800139a2      mov   rcx, rbx
| |||||||   0x1800139a5      call  0x18001fee0
| |||||||   0x1800139aa      mov   rsi, rax
| |||||||   0x1800139ad      test  r15, r15
| ========< 0x1800139b0      jz    0x1800139c7
| |||||||   0x1800139b2      cmp   dword [r15], 0x00
| ========< 0x1800139b6      jl    0x1800139c7
| |||||||   0x1800139b8      sub   qword [r15], 0x01
| ========< 0x1800139bc      jnz   0x1800139c7
| |||||||   0x1800139be      mov   rcx, r15
| |||||||   0x1800139c1      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x1800139c7      xor   edi, edi
| |||||||   0x1800139c9      mov   r15d, edi
| |||||||   0x1800139cc      cmp   dword [rbx], edi
| ========< 0x1800139ce      jl    0x1800139df
| |||||||   0x1800139d0      sub   qword [rbx], 0x01
| ========< 0x1800139d4      jnz   0x1800139df
| |||||||   0x1800139d6      mov   rcx, rbx
| |||||||   0x1800139d9      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x1800139df      mov   rbx, rdi
| |||||||   0x1800139e2      test  rsi, rsi
| ========< 0x1800139e5      jz    0x180013cdf
| |||||||   0x1800139eb      mov   rdi, qword [var_208h]
| |||||||   0x1800139f0      mov   rdx, rsi
| |||||||   0x1800139f3      mov   rcx, rdi
| |||||||   0x1800139f6      call  qword [sym.imp.python312.dll_PyNumber_Or] ; [0x180028548:8]=0x2e29e
| |||||||   0x1800139fc      mov   rbx, rax
| |||||||   0x1800139ff      test  rax, rax
| ========< 0x180013a02      jz    0x180013cb1
| |||||||   0x180013a08      cmp   dword [rsi], r15d
| ========< 0x180013a0b      jl    0x180013a1c
| |||||||   0x180013a0d      sub   qword [rsi], 0x01
| ========< 0x180013a11      jnz   0x180013a1c
| |||||||   0x180013a13      mov   rcx, rsi
| |||||||   0x180013a16      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180013a1c      mov   rcx, rdi
| |||||||   0x180013a1f      mov   qword [var_208h], rbx
| |||||||   0x180013a24      cmp   dword [rdi], r15d
| ========< 0x180013a27      jl    0x180013a35
| |||||||   0x180013a29      sub   qword [rdi], 0x01
| ========< 0x180013a2d      jnz   0x180013a35
| |||||||   0x180013a2f      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180013a35      mov   rsi, r15
| |||||||   0x180013a38      cmp   r14, qword [r12+0x10]
| ========< 0x180013a3d      jl    0x1800138d0
| --------> 0x180013a43      cmp   dword [r12], 0x00
| ========< 0x180013a48      jl    0x180013a5a
| |||||||   0x180013a4a      sub   qword [r12], 0x01
| ========< 0x180013a4f      jnz   0x180013a5a
| |||||||   0x180013a51      mov   rcx, r12
| |||||||   0x180013a54      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180013a5a      mov   eax, dword [rbx]
| |||||||   0x180013a5c      add   eax, 0x01
| ========< 0x180013a5f      jz    0x180013a63
| |||||||   0x180013a61      mov   dword [rbx], eax
| --------> 0x180013a63      mov   rcx, qword [var_210h]
| |||||||   0x180013a68      mov   rdi, rbx
| |||||||   0x180013a6b      mov   qword [var_210h], rbx
| |||||||   0x180013a70      cmp   dword [rcx], 0x00
| ========< 0x180013a73      jl    0x180013a81
| |||||||   0x180013a75      sub   qword [rcx], 0x01
| ========< 0x180013a79      jnz   0x180013a81
| |||||||   0x180013a7b      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180013a81      mov   r12, qword [var_218h]
| |||||||   0x180013a86      mov   r13, r12
| |||||||   0x180013a89      mov   eax, dword [r12]
| |||||||   0x180013a8d      add   eax, 0x01
| ========< 0x180013a90      jz    0x180013a96
| |||||||   0x180013a92      mov   dword [r12], eax
| --------> 0x180013a96      cmp   qword [r12+0x10], 0x00
| |||||||   0x180013a9c      mov   r14, rsi
| ========< 0x180013a9f      jle   0x180013c20
| |||||||   0x180013aa5      nop   word [rax+rax*1], ax
| --------> 0x180013ab0      mov   rax, qword [r12+0x18]
| |||||||   0x180013ab5      mov   rsi, qword [rax+r14*8]
| |||||||   0x180013ab9      mov   eax, dword [rsi]
| |||||||   0x180013abb      add   eax, 0x01
| ========< 0x180013abe      jz    0x180013ac2
| |||||||   0x180013ac0      mov   dword [rsi], eax
| --------> 0x180013ac2      mov   rcx, qword [var_1d0h]
| |||||||   0x180013ac6      inc   r14
| |||||||   0x180013ac9      mov   qword [var_1d0h], rsi
| |||||||   0x180013acd      test  rcx, rcx
| ========< 0x180013ad0      jz    0x180013ae3
| |||||||   0x180013ad2      cmp   dword [rcx], 0x00
| ========< 0x180013ad5      jl    0x180013ae3
| |||||||   0x180013ad7      sub   qword [rcx], 0x01
| ========< 0x180013adb      jnz   0x180013ae3
| |||||||   0x180013add      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180013ae3      mov   rcx, qword [0x180030b00]            ; [0x180030b00:8]=0
| |||||||   0x180013aea      xor   eax, eax
| |||||||   0x180013aec      mov   ebx, eax
| |||||||   0x180013aee      mov   edi, eax
| |||||||   0x180013af0      call  0x180020950
| |||||||   0x180013af5      mov   r15, rax
| |||||||   0x180013af8      test  rax, rax
| ========< 0x180013afb      jz    0x180013d06
| |||||||   0x180013b01      mov   rax, qword [sym.imp.python312.dll_PyMethod_Type] ; [0x180028290:8]=0x2db7e ; "~\xdb\U00000002"
| |||||||   0x180013b08      mov   ecx, 0x01
| |||||||   0x180013b0d      cmp   qword [r15+0x08], rax
| ========< 0x180013b11      jnz   0x180013b45
| |||||||   0x180013b13      mov   rdi, qword [r15+0x18]
| |||||||   0x180013b17      mov   rdx, qword [r15+0x10]
| |||||||   0x180013b1b      mov   eax, dword [rdi]
| |||||||   0x180013b1d      add   eax, ecx
| ========< 0x180013b1f      jz    0x180013b23
| |||||||   0x180013b21      mov   dword [rdi], eax
| --------> 0x180013b23      mov   eax, dword [rdx]
| |||||||   0x180013b25      add   eax, ecx
| ========< 0x180013b27      jz    0x180013b2b
| |||||||   0x180013b29      mov   dword [rdx], eax
| --------> 0x180013b2b      mov   rcx, r15
| |||||||   0x180013b2e      mov   r15, rdx
| |||||||   0x180013b31      cmp   dword [rcx], ebx
| ========< 0x180013b33      jl    0x180013b41
| |||||||   0x180013b35      sub   qword [rcx], 0x01
| ========< 0x180013b39      jnz   0x180013b41
| |||||||   0x180013b3b      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180013b41      xor   eax, eax
| |||||||   0x180013b43      mov   ecx, eax
| --------> 0x180013b45      mov   rax, qword [var_228h]
| |||||||   0x180013b4a      lea   rdx, qword [var_58h]
| |||||||   0x180013b51      mov   qword [var_50h], rax
| |||||||   0x180013b58      lea   rdx, qword [rdx+rcx*8]
| |||||||   0x180013b5c      mov   rax, rcx
| |||||||   0x180013b5f      mov   qword [var_58h], rdi
| |||||||   0x180013b66      neg   rax
| |||||||   0x180013b69      mov   qword [var_48h], rsi
| |||||||   0x180013b70      shl   rax, 0x3f
| |||||||   0x180013b74      mov   r8d, 0x03
| |||||||   0x180013b7a      sub   r8, rcx
| |||||||   0x180013b7d      xor   r9d, r9d
| |||||||   0x180013b80      or    r8, rax
| |||||||   0x180013b83      mov   rcx, r15
| |||||||   0x180013b86      call  0x18001fee0
| |||||||   0x180013b8b      mov   rbx, rax
| |||||||   0x180013b8e      test  rdi, rdi
| ========< 0x180013b91      jz    0x180013ba7
| |||||||   0x180013b93      cmp   dword [rdi], 0x00
| ========< 0x180013b96      jl    0x180013ba7
| |||||||   0x180013b98      sub   qword [rdi], 0x01
| ========< 0x180013b9c      jnz   0x180013ba7
| |||||||   0x180013b9e      mov   rcx, rdi
| |||||||   0x180013ba1      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180013ba7      cmp   dword [r15], 0x00
| ========< 0x180013bab      jl    0x180013bbc
| |||||||   0x180013bad      sub   qword [r15], 0x01
| ========< 0x180013bb1      jnz   0x180013bbc
| |||||||   0x180013bb3      mov   rcx, r15
| |||||||   0x180013bb6      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180013bbc      xor   esi, esi
| |||||||   0x180013bbe      mov   r15d, esi
| |||||||   0x180013bc1      test  rbx, rbx
| ========< 0x180013bc4      jz    0x180013cf0
| |||||||   0x180013bca      mov   rdi, qword [var_210h]
| |||||||   0x180013bcf      mov   rdx, rbx
| |||||||   0x180013bd2      mov   rcx, rdi
| |||||||   0x180013bd5      call  qword [sym.imp.python312.dll_PyNumber_And] ; [0x1800282f8:8]=0x2dc7c ; "|\xdc\U00000002"
| |||||||   0x180013bdb      mov   r15, rax
| |||||||   0x180013bde      test  rax, rax
| ========< 0x180013be1      jz    0x180013cf0
| |||||||   0x180013be7      cmp   dword [rbx], esi
| ========< 0x180013be9      jl    0x180013bfa
| |||||||   0x180013beb      sub   qword [rbx], 0x01
| ========< 0x180013bef      jnz   0x180013bfa
| |||||||   0x180013bf1      mov   rcx, rbx
| |||||||   0x180013bf4      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180013bfa      mov   rcx, rdi
| |||||||   0x180013bfd      mov   qword [var_210h], r15
| |||||||   0x180013c02      mov   rdi, r15
| |||||||   0x180013c05      cmp   dword [rcx], esi
| ========< 0x180013c07      jl    0x180013c15
| |||||||   0x180013c09      sub   qword [rcx], 0x01
| ========< 0x180013c0d      jnz   0x180013c15
| |||||||   0x180013c0f      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180013c15      cmp   r14, qword [r12+0x10]
| ========< 0x180013c1a      jl    0x180013ab0
| --------> 0x180013c20      cmp   dword [r12], 0x00
| ========< 0x180013c25      jl    0x180013c37
| |||||||   0x180013c27      sub   qword [r12], 0x01
| ========< 0x180013c2c      jnz   0x180013c37
| |||||||   0x180013c2e      mov   rcx, r12
| |||||||   0x180013c31      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180013c37      mov   eax, dword [rdi]
| |||||||   0x180013c39      add   eax, 0x01
| ========< 0x180013c3c      jz    0x180013c40
| |||||||   0x180013c3e      mov   dword [rdi], eax
| --------> 0x180013c40      mov   r15, rdi
| |||||||   ; CODE XREFS from fcn.180012080 @ 0x180012592, 0x180012667, 0x180012883, 0x180012a99
| --------> 0x180013c43      mov   rax, qword [var_1b8h]
| |||||||   0x180013c47      mov   rdx, qword [var_1b0h]
| |||||||   0x180013c4b      mov   rax, qword [rax+0x68]
| |||||||   0x180013c4f      mov   rcx, qword [rax]
| |||||||   0x180013c52      mov   qword [rax], rdx
| |||||||   0x180013c55      test  rcx, rcx
| ========< 0x180013c58      jz    0x180013c6b
| |||||||   0x180013c5a      cmp   dword [rcx], 0x00
| ========< 0x180013c5d      jl    0x180013c6b
| |||||||   0x180013c5f      sub   qword [rcx], 0x01
| ========< 0x180013c63      jnz   0x180013c6b
| |||||||   0x180013c65      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180013c6b      mov   rcx, qword [var_1a8h]
| |||||||   0x180013c6f      test  rcx, rcx
| ========< 0x180013c72      jz    0x180013c85
| |||||||   0x180013c74      cmp   dword [rcx], 0x00
| ========< 0x180013c77      jl    0x180013c85
| |||||||   0x180013c79      sub   qword [rcx], 0x01
| ========< 0x180013c7d      jnz   0x180013c85
| |||||||   0x180013c7f      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180013c85      mov   rcx, qword [var_200h]
| |||||||   0x180013c8a      test  rcx, rcx
| ========< 0x180013c8d      jz    0x180014271
| |||||||   0x180013c93      cmp   dword [rcx], 0x00
| ========< 0x180013c96      jl    0x180014271
| |||||||   0x180013c9c      sub   qword [rcx], 0x01
| ========< 0x180013ca0      jnz   0x180014271
| |||||||   0x180013ca6      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| ========< 0x180013cac      jmp   0x180014271
| --------> 0x180013cb1      mov   edi, 0x13b                          ; 315
| |||||||   ; CODE XREFS from fcn.180012080 @ 0x180012766, 0x180013675, 0x18001369f, 0x18001370e
| --------> 0x180013cb6      mov   r14, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
| |||||||   ; CODE XREF from fcn.180012080 @ 0x1800137d0
| --------> 0x180013cbd      cmp   dword [rsi], 0x00
| ========< 0x180013cc0      jl    0x180013cd1
| |||||||   0x180013cc2      sub   qword [rsi], 0x01
| ========< 0x180013cc6      jnz   0x180013cd1
| |||||||   0x180013cc8      mov   rcx, rsi
| |||||||   0x180013ccb      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180013cd1      test  r13, r13
| ========< 0x180013cd4      jz    0x180012cf2
| ========< 0x180013cda      jmp   0x180012cdb
| --------> 0x180013cdf      mov   r14, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
| |||||||   0x180013ce6      mov   edi, 0x13b                          ; 315
| ========< 0x180013ceb      jmp   0x180012cdb
| --------> 0x180013cf0      mov   r14, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
| |||||||   0x180013cf7      mov   edi, 0x13f                          ; 319
| |||||||   0x180013cfc      mov   qword [var_220h], rsi
| ========< 0x180013d01      jmp   0x180012cdb
| --------> 0x180013d06      mov   r14, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
| |||||||   0x180013d0d      xor   eax, eax
| |||||||   0x180013d0f      mov   qword [var_220h], rax
| |||||||   0x180013d14      mov   edi, 0x13f                          ; 319
| ========< 0x180013d19      jmp   0x180012cdb
| --------> 0x180013d1e      mov   edi, 0x139                          ; 313
| |||||||   ; XREFS: CODE 0x1800124db  CODE 0x1800125b2  CODE 0x180012687
| |||||||   ; XREFS: CODE 0x1800128a3  CODE 0x180012ab8  CODE 0x180012cb1
| |||||||   ; XREFS: CODE 0x1800135c4
| --------> 0x180013d23      mov   r14, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
| --------> 0x180013d2a      mov   rsi, qword [var_228h]
| |||||||   ; XREFS: CODE 0x180012548  CODE 0x18001261f  CODE 0x180012801
| |||||||   ; XREFS: CODE 0x180012879  CODE 0x180012a1e  CODE 0x180012a91
| |||||||   ; XREFS: CODE 0x180012d57
| --------> 0x180013d2f      mov   r9, r14
| |||||||   0x180013d32      lea   rcx, qword str.modules.jet_test._core._check_condition ; 0x180028c70 ; "modules.jet_test._core._check_condition"
| |||||||   0x180013d39      mov   r8d, edi
| |||||||   0x180013d3c      call  0x1800242d0
| |||||||   0x180013d41      mov   rbx, qword [var_1b8h]
| |||||||   0x180013d45      xor   r15d, r15d
| |||||||   0x180013d48      mov   edi, r15d
| |||||||   0x180013d4b      mov   r12d, r15d
| |||||||   0x180013d4e      mov   r14, qword [rbx+0x60]
| |||||||   0x180013d52      mov   qword [rbx+0x60], r15
| |||||||   0x180013d56      test  r14, r14
| ========< 0x180013d59      jz    0x180013d98
| |||||||   0x180013d5b      mov   rdi, qword [r14+0x08]
| |||||||   0x180013d5f      mov   eax, dword [rdi]
| |||||||   0x180013d61      add   eax, 0x01
| ========< 0x180013d64      jz    0x180013d68
| |||||||   0x180013d66      mov   dword [rdi], eax
| --------> 0x180013d68      mov   rcx, r14
| |||||||   0x180013d6b      call  qword [sym.imp.python312.dll_PyException_GetTraceback] ; [0x1800286a8:8]=0x2d4ca
| |||||||   0x180013d71      mov   r12, rax
| |||||||   0x180013d74      test  rax, rax
| ========< 0x180013d77      jz    0x180013d84
| |||||||   0x180013d79      mov   eax, dword [rax]
| |||||||   0x180013d7b      add   eax, 0x01
| ========< 0x180013d7e      jz    0x180013d84
| |||||||   0x180013d80      mov   dword [r12], eax
| --------> 0x180013d84      mov   eax, dword [rdi]
| |||||||   0x180013d86      add   eax, 0x01
| ========< 0x180013d89      jz    0x180013d8d
| |||||||   0x180013d8b      mov   dword [rdi], eax
| --------> 0x180013d8d      mov   eax, dword [r14]
| |||||||   0x180013d90      add   eax, 0x01
| ========< 0x180013d93      jz    0x180013d98
| |||||||   0x180013d95      mov   dword [r14], eax
| --------> 0x180013d98      mov   rax, qword [rbx+0x68]
| |||||||   0x180013d9c      mov   rbx, qword [rax]
| |||||||   0x180013d9f      mov   qword [rax], r14
| |||||||   0x180013da2      test  rdi, rdi
| ========< 0x180013da5      jz    0x180013dbb
| |||||||   0x180013da7      cmp   dword [rdi], r15d
| ========< 0x180013daa      jl    0x180013dbb
| |||||||   0x180013dac      sub   qword [rdi], 0x01
| ========< 0x180013db0      jnz   0x180013dbb
| |||||||   0x180013db2      mov   rcx, rdi
| |||||||   0x180013db5      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180013dbb      test  r12, r12
| ========< 0x180013dbe      jz    0x180013dd6
| |||||||   0x180013dc0      cmp   dword [r12], r15d
| ========< 0x180013dc4      jl    0x180013dd6
| |||||||   0x180013dc6      sub   qword [r12], 0x01
| ========< 0x180013dcb      jnz   0x180013dd6
| |||||||   0x180013dcd      mov   rcx, r12
| |||||||   0x180013dd0      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180013dd6      test  rbx, rbx
| ========< 0x180013dd9      jz    0x180013def
| |||||||   0x180013ddb      cmp   dword [rbx], r15d
| ========< 0x180013dde      jl    0x180013def
| |||||||   0x180013de0      sub   qword [rbx], 0x01
| ========< 0x180013de4      jnz   0x180013def
| |||||||   0x180013de6      mov   rcx, rbx
| |||||||   0x180013de9      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180013def      mov   rcx, qword [0x180030f20]            ; [0x180030f20:8]=0
| |||||||   0x180013df6      mov   qword [var_220h], r15
| |||||||   0x180013dfb      call  0x180020950
| |||||||   0x180013e00      mov   r13, rax
| |||||||   0x180013e03      test  rax, rax
| ========< 0x180013e06      jz    0x180014045
| |||||||   0x180013e0c      mov   rax, qword [rax+0x08]
| |||||||   0x180013e10      mov   rcx, r13
| |||||||   0x180013e13      mov   rdx, qword [0x180030928]            ; [0x180030928:8]=0
| |||||||   0x180013e1a      mov   r8, qword [rax+0x90]
| |||||||   0x180013e21      test  r8, r8
| ========< 0x180013e24      jz    0x180013e2b
| |||||||   0x180013e26      call  r8
| ========< 0x180013e29      jmp   0x180013e31
| --------> 0x180013e2b      call  qword [sym.imp.python312.dll_PyObject_GetAttr] ; [0x180028168:8]=0x2d8b6
| |||||||   ; CODE XREF from fcn.180012080 @ 0x180013e29
| --------> 0x180013e31      mov   qword [var_1c0h], rax
| |||||||   0x180013e35      mov   rbx, rax
| |||||||   0x180013e38      test  rax, rax
| ========< 0x180013e3b      jz    0x180014045
| |||||||   0x180013e41      cmp   dword [r13], r15d
| ========< 0x180013e45      jl    0x180013e57
| |||||||   0x180013e47      sub   qword [r13], 0x01
| ========< 0x180013e4c      jnz   0x180013e57
| |||||||   0x180013e4e      mov   rcx, r13
| |||||||   0x180013e51      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180013e57      xor   eax, eax
| |||||||   0x180013e59      mov   rcx, rsi
| |||||||   0x180013e5c      mov   r13d, eax
| |||||||   0x180013e5f      call  qword [sym.imp.python312.dll_PyObject_Size] ; [0x180028578:8]=0x2e318
| |||||||   0x180013e65      mov   rsi, rax
| |||||||   0x180013e68      cmp   rax, 0xffffffffffffffff
| ========< 0x180013e6c      jz    0x180014045
| |||||||   0x180013e72      test  rax, rax
| |||||||   0x180013e75      mov   rcx, rax
| |||||||   0x180013e78      cmovs rcx, r13
| |||||||   0x180013e7c      call  qword [sym.imp.python312.dll_PyList_New] ; [0x180028348:8]=0x2dd4a ; "J\xdd\U00000002"
| |||||||   0x180013e82      mov   r13, rax
| |||||||   0x180013e85      test  rax, rax
| ========< 0x180013e88      jz    0x180014045
| |||||||   0x180013e8e      xor   eax, eax
| |||||||   0x180013e90      mov   edx, eax
| |||||||   0x180013e92      test  rsi, rsi
| ========< 0x180013e95      jle   0x180013ec7
| |||||||   0x180013e97      nop   word [rax+rax*1], ax
| --------> 0x180013ea0      mov   rcx, qword [sym.imp.python312.dll__Py_FalseStruct] ; [0x180028260:8]=0x2db02
| |||||||   0x180013ea7      mov   eax, dword [rcx]
| |||||||   0x180013ea9      add   eax, 0x01
| ========< 0x180013eac      jz    0x180013eb7
| |||||||   0x180013eae      mov   dword [rcx], eax
| |||||||   0x180013eb0      mov   rcx, qword [sym.imp.python312.dll__Py_FalseStruct] ; [0x180028260:8]=0x2db02
| --------> 0x180013eb7      mov   rax, qword [r13+0x18]
| |||||||   0x180013ebb      mov   qword [rax+rdx*8], rcx
| |||||||   0x180013ebf      inc   rdx
| |||||||   0x180013ec2      cmp   rdx, rsi
| ========< 0x180013ec5      jl    0x180013ea0
| --------> 0x180013ec7      mov   rcx, qword [var_228h]
| |||||||   0x180013ecc      mov   rdx, qword [0x180030d58]            ; [0x180030d58:8]=0
| |||||||   0x180013ed3      mov   rax, qword [rcx+0x08]
| |||||||   0x180013ed7      mov   r8, qword [rax+0x90]
| |||||||   0x180013ede      test  r8, r8
| ========< 0x180013ee1      jz    0x180013ee8
| |||||||   0x180013ee3      call  r8
| ========< 0x180013ee6      jmp   0x180013eee
| --------> 0x180013ee8      call  qword [sym.imp.python312.dll_PyObject_GetAttr] ; [0x180028168:8]=0x2d8b6
| |||||||   ; CODE XREF from fcn.180012080 @ 0x180013ee6
| --------> 0x180013eee      mov   qword [var_1c8h], rax
| |||||||   0x180013ef2      test  rax, rax
| ========< 0x180013ef5      jz    0x180014045
| |||||||   0x180013efb      mov   rax, qword [sym.imp.python312.dll_PyMethod_Type] ; [0x180028290:8]=0x2db7e ; "~\xdb\U00000002"
| |||||||   0x180013f02      mov   esi, 0x01
| |||||||   0x180013f07      cmp   qword [rbx+0x08], rax
| ========< 0x180013f0b      jnz   0x180013f47
| |||||||   0x180013f0d      mov   r15, qword [rbx+0x18]
| |||||||   0x180013f11      mov   rcx, qword [rbx+0x10]
| |||||||   0x180013f15      mov   qword [var_220h], r15
| |||||||   0x180013f1a      mov   qword [var_1c0h], rcx
| |||||||   0x180013f1e      mov   eax, dword [r15]
| |||||||   0x180013f21      add   eax, esi
| ========< 0x180013f23      jz    0x180013f28
| |||||||   0x180013f25      mov   dword [r15], eax
| --------> 0x180013f28      mov   eax, dword [rcx]
| |||||||   0x180013f2a      add   eax, esi
| ========< 0x180013f2c      jz    0x180013f30
| |||||||   0x180013f2e      mov   dword [rcx], eax
| --------> 0x180013f30      cmp   dword [rbx], 0x00
| ========< 0x180013f33      jl    0x180013f43
| |||||||   0x180013f35      sub   qword [rbx], rsi
| ========< 0x180013f38      jnz   0x180013f43
| |||||||   0x180013f3a      mov   rcx, rbx
| |||||||   0x180013f3d      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180013f43      xor   eax, eax
| |||||||   0x180013f45      mov   esi, eax
| --------> 0x180013f47      xor   eax, eax
| |||||||   0x180013f49      mov   qword [var_110h], r15
| |||||||   0x180013f4d      mov   ecx, 0x01
| |||||||   0x180013f52      mov   qword [var_100h], rax
| |||||||   0x180013f56      mov   qword [var_108h], r13
| |||||||   0x180013f5a      call  qword [sym.imp.python312.dll_PyTuple_New] ; [0x180028190:8]=0x2d916
| |||||||   0x180013f60      mov   rbx, rax
| |||||||   0x180013f63      test  rax, rax
| ========< 0x180013f66      jz    0x180014045
| |||||||   0x180013f6c      mov   rax, qword [0x180030d58]            ; [0x180030d58:8]=0
| |||||||   0x180013f73      mov   qword [rbx+0x18], rax
| |||||||   0x180013f77      mov   ecx, dword [rax]
| |||||||   0x180013f79      add   ecx, 0x01
| ========< 0x180013f7c      jz    0x180013f80
| |||||||   0x180013f7e      mov   dword [rax], ecx
| --------> 0x180013f80      mov   rax, qword [var_1c8h]
| |||||||   0x180013f84      lea   rdx, qword [var_110h]
| |||||||   0x180013f88      mov   qword [var_100h], rax
| |||||||   0x180013f8c      lea   rdx, qword [rdx+rsi*8]
| |||||||   0x180013f90      mov   rax, rsi
| |||||||   0x180013f93      mov   r8d, 0x02
| |||||||   0x180013f99      sub   r8, rsi
| |||||||   0x180013f9c      neg   rax
| |||||||   0x180013f9f      mov   rsi, qword [var_1c0h]
| |||||||   0x180013fa3      mov   r9, rbx
| |||||||   0x180013fa6      shl   rax, 0x3f
| |||||||   0x180013faa      mov   rcx, rsi
| |||||||   0x180013fad      or    r8, rax
| |||||||   0x180013fb0      call  qword [sym.imp.python312.dll_PyObject_Vectorcall] ; [0x180028328:8]=0x2dd02
| |||||||   0x180013fb6      mov   rcx, qword [var_220h]
| |||||||   0x180013fbb      mov   r15, rax
| |||||||   0x180013fbe      test  rcx, rcx
| ========< 0x180013fc1      jz    0x180013fd4
| |||||||   0x180013fc3      cmp   dword [rcx], 0x00
| ========< 0x180013fc6      jl    0x180013fd4
| |||||||   0x180013fc8      sub   qword [rcx], 0x01
| ========< 0x180013fcc      jnz   0x180013fd4
| |||||||   0x180013fce      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180013fd4      xor   eax, eax
| |||||||   0x180013fd6      mov   qword [var_220h], rax
| |||||||   0x180013fdb      cmp   dword [r13], eax
| ========< 0x180013fdf      jl    0x180013ff1
| |||||||   0x180013fe1      sub   qword [r13], 0x01
| ========< 0x180013fe6      jnz   0x180013ff1
| |||||||   0x180013fe8      mov   rcx, r13
| |||||||   0x180013feb      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180013ff1      mov   rcx, qword [var_1c8h]
| |||||||   0x180013ff5      xor   r13d, r13d
| |||||||   0x180013ff8      cmp   dword [rcx], r13d
| ========< 0x180013ffb      jl    0x180014009
| |||||||   0x180013ffd      sub   qword [rcx], 0x01
| ========< 0x180014001      jnz   0x180014009
| |||||||   0x180014003      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180014009      xor   eax, eax
| |||||||   0x18001400b      mov   qword [var_1c8h], rax
| |||||||   0x18001400f      cmp   dword [rbx], eax
| ========< 0x180014011      jl    0x180014022
| |||||||   0x180014013      sub   qword [rbx], 0x01
| ========< 0x180014017      jnz   0x180014022
| |||||||   0x180014019      mov   rcx, rbx
| |||||||   0x18001401c      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180014022      cmp   dword [rsi], r13d
| ========< 0x180014025      jl    0x180014036
| |||||||   0x180014027      sub   qword [rsi], 0x01
| ========< 0x18001402b      jnz   0x180014036
| |||||||   0x18001402d      mov   rcx, rsi
| |||||||   0x180014030      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180014036      xor   eax, eax
| |||||||   0x180014038      mov   qword [var_1c0h], rax
| |||||||   0x18001403c      test  r15, r15
| ========< 0x18001403f      jnz   0x1800141d2
| --------> 0x180014045      mov   rsi, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
| |||||||   0x18001404c      mov   ebx, 0x142                          ; 322
| |||||||   0x180014051      mov   rax, qword [var_1b8h]
| |||||||   0x180014055      mov   rdx, qword [var_1b0h]
| |||||||   0x180014059      mov   rax, qword [rax+0x68]
| |||||||   0x18001405d      mov   rcx, qword [rax]
| |||||||   0x180014060      mov   qword [rax], rdx
| |||||||   0x180014063      test  rcx, rcx
| ========< 0x180014066      jz    0x180014079
| |||||||   0x180014068      cmp   dword [rcx], 0x00
| ========< 0x18001406b      jl    0x180014079
| |||||||   0x18001406d      sub   qword [rcx], 0x01
| ========< 0x180014071      jnz   0x180014079
| |||||||   0x180014073      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180014079      mov   rcx, qword [var_1a8h]
| |||||||   0x18001407d      test  rcx, rcx
| ========< 0x180014080      jz    0x180014093
| |||||||   0x180014082      cmp   dword [rcx], 0x00
| ========< 0x180014085      jl    0x180014093
| |||||||   0x180014087      sub   qword [rcx], 0x01
| ========< 0x18001408b      jnz   0x180014093
| |||||||   0x18001408d      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180014093      mov   rcx, qword [var_200h]
| |||||||   0x180014098      test  rcx, rcx
| ========< 0x18001409b      jz    0x1800140ae
| |||||||   0x18001409d      cmp   dword [rcx], 0x00
| ========< 0x1800140a0      jl    0x1800140ae
| |||||||   0x1800140a2      sub   qword [rcx], 0x01
| ========< 0x1800140a6      jnz   0x1800140ae
| |||||||   0x1800140a8      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x1800140ae      test  rdi, rdi
| ========< 0x1800140b1      jz    0x1800140c7
| |||||||   ; CODE XREFS from fcn.180012080 @ 0x18001227e, 0x180012378
| --`-----> 0x1800140b3      cmp   dword [rdi], 0x00
| ||,=====< 0x1800140b6      jl    0x1800140c7
| |||||||   0x1800140b8      sub   qword [rdi], 0x01
| ========< 0x1800140bc      jnz   0x1800140c7
| |||||||   0x1800140be      mov   rcx, rdi
| |||||||   0x1800140c1      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --`-----> 0x1800140c7      test  r12, r12
| ||,=====< 0x1800140ca      jz    0x1800140e3
| |||||||   0x1800140cc      cmp   dword [r12], 0x00
| ========< 0x1800140d1      jl    0x1800140e3
| |||||||   0x1800140d3      sub   qword [r12], 0x01
| ========< 0x1800140d8      jnz   0x1800140e3
| |||||||   0x1800140da      mov   rcx, r12
| |||||||   0x1800140dd      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --`-----> 0x1800140e3      mov   rdi, qword [var_220h]
| || ||||   0x1800140e8      test  rdi, rdi
| ||,=====< 0x1800140eb      jz    0x180014101
| |||||||   ; CODE XREF from fcn.180012080 @ 0x180012156
| ||||`---> 0x1800140ed      cmp   dword [rdi], 0x00
| ||||,===< 0x1800140f0      jl    0x180014101
| |||||||   0x1800140f2      sub   qword [rdi], 0x01
| ========< 0x1800140f6      jnz   0x180014101
| |||||||   0x1800140f8      mov   rcx, rdi
| |||||||   0x1800140fb      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --`-`---> 0x180014101      test  r14, r14
| || |,===< 0x180014104      jz    0x18001411b
| || ||||   0x180014106      cmp   dword [r14], 0x00
| ||,=====< 0x18001410a      jl    0x18001411b
| |||||||   0x18001410c      sub   qword [r14], 0x01
| ========< 0x180014110      jnz   0x18001411b
| |||||||   0x180014112      mov   rcx, r14
| |||||||   0x180014115      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --`-`---> 0x18001411b      test  r13, r13
| || |,===< 0x18001411e      jz    0x180014137
| || ||||   0x180014120      cmp   dword [r13], 0x00
| ||,=====< 0x180014125      jl    0x180014137
| |||||||   0x180014127      sub   qword [r13], 0x01
| ========< 0x18001412c      jnz   0x180014137
| |||||||   0x18001412e      mov   rcx, r13
| |||||||   0x180014131      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --`-`---> 0x180014137      mov   rcx, qword [var_1c0h]
| || | ||   0x18001413b      test  rcx, rcx
| || |,===< 0x18001413e      jz    0x180014151
| || ||||   0x180014140      cmp   dword [rcx], 0x00
| ||,=====< 0x180014143      jl    0x180014151
| |||||||   0x180014145      sub   qword [rcx], 0x01
| ========< 0x180014149      jnz   0x180014151
| |||||||   0x18001414b      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --`-`---> 0x180014151      mov   rcx, qword [var_1c8h]
| || | ||   0x180014155      test  rcx, rcx
| || |,===< 0x180014158      jz    0x18001416b
| || ||||   0x18001415a      cmp   dword [rcx], 0x00
| ||,=====< 0x18001415d      jl    0x18001416b
| |||||||   0x18001415f      sub   qword [rcx], 0x01
| ========< 0x180014163      jnz   0x18001416b
| |||||||   0x180014165      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --`-`---> 0x18001416b      mov   r12, qword [var_218h]
| || | ||   0x180014170      xor   r14d, r14d
| || | ||   ; XREFS: CODE 0x180012115  CODE 0x180012231  CODE 0x180012326
| || | ||   ; XREFS: CODE 0x18001234c  CODE 0x180012419  CODE 0x18001243b
| -`-`-`--> 0x180014173      mov   rax, qword [var_208h]
| |     |   0x180014178      lea   rcx, qword str.modules.jet_test._core._check_condition ; 0x180028c70 ; "modules.jet_test._core._check_condition"
| |     |   0x18001417f      mov   r15, qword [var_1d0h]
| |     |   0x180014183      mov   r9, rsi
| |     |   0x180014186      mov   r13, qword [var_1e0h]
| |     |   0x18001418b      mov   r8d, ebx
| |     |   0x18001418e      mov   rdi, qword [var_1e8h]
| |     |   0x180014193      mov   qword [var_208h], rax
| |     |   0x180014198      mov   rax, qword [var_210h]
| |     |   0x18001419d      mov   qword [var_210h], rax
| |     |   0x1800141a2      mov   rax, qword [var_1d8h]
| |     |   0x1800141a6      mov   qword [var_1d8h], rax
| |     |   0x1800141aa      mov   qword [var_1d0h], r15
| |     |   0x1800141ae      call  0x1800242d0
| |     |   0x1800141b3      mov   rcx, qword [var_1d8h]
| |     |   0x1800141b7      mov   r15, r14
| |     |   0x1800141ba      mov   rbx, qword [var_210h]
| |     |   0x1800141bf      mov   rsi, qword [var_208h]
| |     |   0x1800141c4      test  rcx, rcx
| |    ,==< 0x1800141c7      jz    0x18001429a
| |   ,===< 0x1800141cd      jmp   0x180014289
| --------> 0x1800141d2      cmp   dword [rdi], eax
| |  ,====< 0x1800141d4      jl    0x1800141e5
| |  ||||   0x1800141d6      sub   qword [rdi], 0x01
| | ,=====< 0x1800141da      jnz   0x1800141e5
| | |||||   0x1800141dc      mov   rcx, rdi
| | |||||   0x1800141df      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| | ``----> 0x1800141e5      cmp   dword [r12], r13d
| |  ,====< 0x1800141e9      jl    0x1800141fb
| |  ||||   0x1800141eb      sub   qword [r12], 0x01
| | ,=====< 0x1800141f0      jnz   0x1800141fb
| | |||||   0x1800141f2      mov   rcx, r12
| | |||||   0x1800141f5      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| | ``----> 0x1800141fb      cmp   dword [r14], r13d
| |  ,====< 0x1800141fe      jl    0x18001420f
| |  ||||   0x180014200      sub   qword [r14], 0x01
| | ,=====< 0x180014204      jnz   0x18001420f
| | |||||   0x180014206      mov   rcx, r14
| | |||||   0x180014209      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| | ``----> 0x18001420f      mov   rax, qword [var_1b8h]
| |   |||   0x180014213      mov   rdx, qword [var_1b0h]
| |   |||   0x180014217      mov   rax, qword [rax+0x68]
| |   |||   0x18001421b      mov   rcx, qword [rax]
| |   |||   0x18001421e      mov   qword [rax], rdx
| |   |||   0x180014221      test  rcx, rcx
| |  ,====< 0x180014224      jz    0x180014237
| |  ||||   0x180014226      cmp   dword [rcx], r13d
| | ,=====< 0x180014229      jl    0x180014237
| | |||||   0x18001422b      sub   qword [rcx], 0x01
| |,======< 0x18001422f      jnz   0x180014237
| |||||||   0x180014231      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| |```----> 0x180014237      mov   rcx, qword [var_1a8h]
| |   |||   0x18001423b      test  rcx, rcx
| |  ,====< 0x18001423e      jz    0x180014251
| |  ||||   0x180014240      cmp   dword [rcx], r13d
| | ,=====< 0x180014243      jl    0x180014251
| | |||||   0x180014245      sub   qword [rcx], 0x01
| |,======< 0x180014249      jnz   0x180014251
| |||||||   0x18001424b      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| |```----> 0x180014251      mov   rcx, qword [var_200h]
| |   |||   0x180014256      test  rcx, rcx
| |  ,====< 0x180014259      jz    0x18001426c
| |  ||||   0x18001425b      cmp   dword [rcx], r13d
| | ,=====< 0x18001425e      jl    0x18001426c
| | |||||   0x180014260      sub   qword [rcx], 0x01
| |,======< 0x180014264      jnz   0x18001426c
| |||||||   0x180014266      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| |```----> 0x18001426c      mov   r12, qword [var_218h]
| |   |||   ; CODE XREF from fcn.180012080 @ 0x180013cac
| --------> 0x180014271      mov   rcx, qword [var_1d8h]
| |   |||   0x180014275      mov   rsi, qword [var_208h]
| |   |||   0x18001427a      mov   rbx, qword [var_210h]
| |   |||   0x18001427f      mov   r13, qword [var_1e0h]
| |   |||   0x180014284      mov   rdi, qword [var_1e8h]
| |   |||   ; CODE XREF from fcn.180012080 @ 0x1800141cd
| |   `---> 0x180014289      cmp   dword [rcx], 0x00
| |   ,===< 0x18001428c      jl    0x18001429a
| |   |||   0x18001428e      sub   qword [rcx], 0x01
| |  ,====< 0x180014292      jnz   0x18001429a
| |  ||||   0x180014294      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| |  ```--> 0x18001429a      test  rdi, rdi
| |    ,==< 0x18001429d      jz    0x1800142b3
| |    ||   0x18001429f      cmp   dword [rdi], 0x00
| |   ,===< 0x1800142a2      jl    0x1800142b3
| |   |||   0x1800142a4      sub   qword [rdi], 0x01
| |  ,====< 0x1800142a8      jnz   0x1800142b3
| |  ||||   0x1800142aa      mov   rcx, rdi
| |  ||||   0x1800142ad      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| |  ```--> 0x1800142b3      test  r13, r13
| |    ,==< 0x1800142b6      jz    0x1800142cf
| |    ||   0x1800142b8      cmp   dword [r13], 0x00
| |   ,===< 0x1800142bd      jl    0x1800142cf
| |   |||   0x1800142bf      sub   qword [r13], 0x01
| |  ,====< 0x1800142c4      jnz   0x1800142cf
| |  ||||   0x1800142c6      mov   rcx, r13
| |  ||||   0x1800142c9      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| |  ```--> 0x1800142cf      test  r12, r12
| |    ,==< 0x1800142d2      jz    0x1800142eb
| |    ||   0x1800142d4      cmp   dword [r12], 0x00
| |   ,===< 0x1800142d9      jl    0x1800142eb
| |   |||   0x1800142db      sub   qword [r12], 0x01
| |  ,====< 0x1800142e0      jnz   0x1800142eb
| |  ||||   0x1800142e2      mov   rcx, r12
| |  ||||   0x1800142e5      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| |  ```--> 0x1800142eb      test  rbx, rbx
| |    ,==< 0x1800142ee      jz    0x180014304
| |    ||   0x1800142f0      cmp   dword [rbx], 0x00
| |   ,===< 0x1800142f3      jl    0x180014304
| |   |||   0x1800142f5      sub   qword [rbx], 0x01
| |  ,====< 0x1800142f9      jnz   0x180014304
| |  ||||   0x1800142fb      mov   rcx, rbx
| |  ||||   0x1800142fe      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| |  ```--> 0x180014304      test  rsi, rsi
| |    ,==< 0x180014307      jz    0x18001431d
| |    ||   0x180014309      cmp   dword [rsi], 0x00
| |   ,===< 0x18001430c      jl    0x18001431d
| |   |||   0x18001430e      sub   qword [rsi], 0x01
| |  ,====< 0x180014312      jnz   0x18001431d
| |  ||||   0x180014314      mov   rcx, rsi
| |  ||||   0x180014317      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| |  ```--> 0x18001431d      mov   rax, qword [var_1d0h]
| |     |   0x180014321      test  rax, rax
| |    ,==< 0x180014324      jz    0x18001433a
| |    ||   0x180014326      cmp   dword [rax], 0x00
| |   ,===< 0x180014329      jl    0x18001433a
| |   |||   0x18001432b      sub   qword [rax], 0x01
| |  ,====< 0x18001432f      jnz   0x18001433a
| |  ||||   0x180014331      mov   rcx, rax
| |  ||||   0x180014334      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| |  ```--> 0x18001433a      mov   rax, r15
| |    ,==< 0x18001433d      jmp   0x18001434f
| `-----`-> 0x18001433f      mov   rax, qword [sym.imp.python312.dll__Py_NoneStruct] ; [0x180028188:8]=0x2d904
|      |    0x180014346      mov   ecx, dword [rax]
|      |    0x180014348      add   ecx, 0x01
|      |,=< 0x18001434b      jz    0x18001434f
|      ||   0x18001434d      mov   dword [rax], ecx
|      ||   ; CODE XREF from fcn.180012080 @ 0x18001433d
|      ``-> 0x18001434f      mov   rcx, qword [var_40h]
|           0x180014356      xor   rcx, rsp
|           0x180014359      call  0x180026430
|           0x18001435e      mov   rbx, qword [arg_8h]
|           0x180014366      add   rsp, 0x220
|           0x18001436d      pop   r15
|           0x18001436f      pop   r14
|           0x180014371      pop   r13
|           0x180014373      pop   r12
|           0x180014375      pop   rdi
|           0x180014376      pop   rsi
|           0x180014377      pop   rbp
\           0x180014378      ret
