/ fcn.18000ffd0(unknown_t arg_8h, unknown_t arg_10h, unknown_t arg_18h, unknown_t arg_20h, unknown_t arg_28h, unknown_t arg_30h, unknown_t arg_38h, unknown_t arg_40h, unknown_t arg_48h, unknown_t arg_50h, unknown_t arg_58h, unknown_t arg_60h, unknown_t arg_68h, unknown_t arg_70h, unknown_t arg_78h, unknown_t arg_80h, unknown_t arg_88h, unknown_t arg_90h, unknown_t arg_98h, unknown_t arg_a0h, unknown_t arg_a8h, unknown_t arg_b0h, unknown_t arg_b8h, unknown_t arg_c0h, unknown_t arg_c8h, unknown_t arg_d0h, unknown_t arg_d8h, unknown_t arg_e0h, unknown_t arg_e8h);
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
|           ; var unknown_t var_80h @ stack - 0x80
|           ; var unknown_t var_78h @ stack - 0x78
|           ; var unknown_t var_70h @ stack - 0x70
|           ; var unknown_t var_68h @ stack - 0x68
|           ; var unknown_t var_60h @ stack - 0x60
|           ; var unknown_t var_58h @ stack - 0x58
|           ; var unknown_t var_50h @ stack - 0x50
|           ; var unknown_t var_48h @ stack - 0x48
|           ; var unknown_t var_40h @ stack - 0x40
|           ; var unknown_t var_38h @ stack - 0x38
|           ; var unknown_t var_30h @ stack - 0x30
|           ; var unknown_t var_28h @ stack - 0x28
|           ; var unknown_t var_20h @ stack - 0x20
|           ; var unknown_t var_18h @ stack - 0x18
|           ; var unknown_t var_10h @ stack - 0x10
|           ; var unknown_t var_8h @ stack - 0x8
|           ; arg unknown_t arg_8h @ stack + 0x8
|           ; arg unknown_t arg_10h @ stack + 0x10
|           ; arg unknown_t arg_18h @ stack + 0x18
|           ; arg unknown_t arg_20h @ stack + 0x20
|           ; arg unknown_t arg_28h @ stack + 0x28
|           ; arg unknown_t arg_30h @ stack + 0x30
|           ; arg unknown_t arg_38h @ stack + 0x38
|           ; arg unknown_t arg_40h @ stack + 0x40
|           ; arg unknown_t arg_48h @ stack + 0x48
|           ; arg unknown_t arg_50h @ stack + 0x50
|           ; arg unknown_t arg_58h @ stack + 0x58
|           ; arg unknown_t arg_60h @ stack + 0x60
|           ; arg unknown_t arg_68h @ stack + 0x68
|           ; arg unknown_t arg_70h @ stack + 0x70
|           ; arg unknown_t arg_78h @ stack + 0x78
|           ; arg unknown_t arg_80h @ stack + 0x80
|           ; arg unknown_t arg_88h @ stack + 0x88
|           ; arg unknown_t arg_90h @ stack + 0x90
|           ; arg unknown_t arg_98h @ stack + 0x98
|           ; arg unknown_t arg_a0h @ stack + 0xa0
|           ; arg unknown_t arg_a8h @ stack + 0xa8
|           ; arg unknown_t arg_b0h @ stack + 0xb0
|           ; arg unknown_t arg_b8h @ stack + 0xb8
|           ; arg unknown_t arg_c0h @ stack + 0xc0
|           ; arg unknown_t arg_c8h @ stack + 0xc8
|           ; arg unknown_t arg_d0h @ stack + 0xd0
|           ; arg unknown_t arg_d8h @ stack + 0xd8
|           ; arg unknown_t arg_e0h @ stack + 0xe0
|           ; arg unknown_t arg_e8h @ stack + 0xe8
|           0x18000ffd0      mov   r11, rsp
|           0x18000ffd3      push  rbp
|           0x18000ffd4      push  r14
|           0x18000ffd6      lea   rbp, qword [r11-0x138]
|           0x18000ffdd      sub   rsp, 0x228
|           0x18000ffe4      mov   rax, qword [section..data]          ; [0x18002f000:8]=0x2b992ddfa232 ; "2\xa2\xdf-\x99+"
|           0x18000ffeb      xor   rax, rsp
|           0x18000ffee      mov   qword [arg_e8h], rax
|           0x18000fff5      mov   qword [r11+0x08], rbx
|           0x18000fff9      mov   qword [r11-0x20], rdi
|           0x18000fffd      mov   rdi, r8
|           0x180010000      xor   r8d, r8d
|           0x180010003      mov   qword [r11-0x30], r13
|           0x180010007      mov   qword [var_218h], rdx
|           0x18001000c      mov   r13d, r8d
|           0x18001000f      mov   qword [var_1e0h], r8
|           0x180010014      mov   ecx, dword [rdi]
|           0x180010016      mov   qword [var_78h], r8
|           0x18001001a      mov   qword [var_1d8h], r8
|           0x18001001f      mov   qword [var_80h], r8
|           0x180010023      lea   eax, qword [rcx+0x01]
|           0x180010026      mov   qword [var_1d0h], r8
|           0x18001002b      mov   qword [var_1e8h], r8
|           0x180010030      mov   qword [var_208h], r8
|           0x180010035      mov   qword [var_200h], r8
|           0x18001003a      test  eax, eax
|       ,=< 0x18001003c      jz    0x180010042
|       |   0x18001003e      mov   dword [rdi], eax
|       |   0x180010040      mov   ecx, eax
|       `-> 0x180010042      mov   rax, qword [sym.imp.python312.dll_PyUnicode_Type] ; [0x1800283d8:8]=0x2deb6
|           0x180010049      mov   qword [var_18h], rsi
|           0x180010051      mov   qword [var_28h], r12
|           0x180010059      mov   qword [var_38h], r15
|           0x180010061      movaps xmmword [var_48h], xmm6
|           0x180010069      cmp   qword [rdi+0x08], rax
|       ,=< 0x18001006d      jnz   0x18001007b
|       |   0x18001006f      add   ecx, 0x01
|      ,==< 0x180010072      jz    0x180010076
|      ||   0x180010074      mov   dword [rdi], ecx
|      `--> 0x180010076      mov   rbx, rdi
|      ,==< 0x180010079      jmp   0x1800100a0
|      |`-> 0x18001007b      mov   rcx, rdi
|      |    0x18001007e      call  qword [sym.imp.python312.dll_PyObject_Str] ; [0x1800284b0:8]=0x2e10c
|      |    0x180010084      mov   rbx, rax
|      |    0x180010087      test  rax, rax
|      |,=< 0x18001008a      jnz   0x18001009d
|      ||   0x18001008c      mov   r14, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
|      ||   0x180010093      mov   ebx, 0x108                          ; 264
|     ,===< 0x180010098      jmp   0x180011ce6
|     ||`-> 0x18001009d      xor   r8d, r8d
|     ||    ; CODE XREF from fcn.18000ffd0 @ 0x180010079
|     |`--> 0x1800100a0      mov   eax, dword [rbx]
|     |     0x1800100a2      add   eax, 0x01
|     | ,=< 0x1800100a5      jz    0x1800100a9
|     | |   0x1800100a7      mov   dword [rbx], eax
|     | `-> 0x1800100a9      mov   rcx, qword [0x1800310e8]            ; [0x1800310e8:8]=0
|     |     0x1800100b0      lea   rdx, qword [var_70h]
|     |     0x1800100b4      mov   qword [var_68h], r8
|     |     0x1800100b8      xor   r9d, r9d
|     |     0x1800100bb      mov   r8, 0x8000000000000001
|     |     0x1800100c5      mov   qword [var_70h], rbx
|     |     0x1800100c9      call  qword [sym.imp.python312.dll_PyObject_VectorcallMethod] ; [0x1800283f8:8]=0x2df22 ; "\"\xdf\U00000002"
|     |     0x1800100cf      mov   r14, rax
|     |     0x1800100d2      cmp   dword [rbx], r13d
|     | ,=< 0x1800100d5      jl    0x1800100fa
|     | |   0x1800100d7      sub   qword [rbx], 0x01
|     |,==< 0x1800100db      jnz   0x1800100e6
|     |||   0x1800100dd      mov   rcx, rbx
|     |||   0x1800100e0      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
|     |`--> 0x1800100e6      cmp   dword [rbx], r13d
|     |,==< 0x1800100e9      jl    0x1800100fa
|     |||   0x1800100eb      sub   qword [rbx], 0x01
|    ,====< 0x1800100ef      jnz   0x1800100fa
|    ||||   0x1800100f1      mov   rcx, rbx
|    ||||   0x1800100f4      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
|    `-``-> 0x1800100fa      test  r14, r14
|     | ,=< 0x1800100fd      jnz   0x180010110
|     | |   0x1800100ff      mov   r14, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
|     | |   0x180010106      mov   ebx, 0x108                          ; 264
|     |,==< 0x18001010b      jmp   0x180011ce6
|     ||`-> 0x180010110      mov   qword [var_210h], r14
|     ||    0x180010115      cmp   dword [rdi], r13d
|     ||,=< 0x180010118      jl    0x180010129
|     |||   0x18001011a      sub   qword [rdi], 0x01
|    ,====< 0x18001011e      jnz   0x180010129
|    ||||   0x180010120      mov   rcx, rdi
|    ||||   0x180010123      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
|    `--`-> 0x180010129      mov   rcx, qword [0x180030f78]            ; [0x180030f78:8]=0
|     ||    0x180010130      xor   eax, eax
|     ||    0x180010132      mov   r15d, eax
|     ||    0x180010135      call  0x180020950
|     ||    0x18001013a      mov   rsi, rax
|     ||    0x18001013d      test  rax, rax
|     ||,=< 0x180010140      jnz   0x18001014c
|     |||   0x180010142      mov   ebx, 0x109                          ; 265
|    ,====< 0x180010147      jmp   0x180011cda
|    |||`-> 0x18001014c      mov   rax, qword [rax+0x08]
|    |||    0x180010150      mov   rcx, rsi
|    |||    0x180010153      mov   rdx, qword [0x180030e08]            ; [0x180030e08:8]=0
|    |||    0x18001015a      mov   r8, qword [rax+0x90]
|    |||    0x180010161      test  r8, r8
|    |||,=< 0x180010164      jz    0x18001016b
|    ||||   0x180010166      call  r8
|   ,=====< 0x180010169      jmp   0x180010171
|   ||||`-> 0x18001016b      call  qword [sym.imp.python312.dll_PyObject_GetAttr] ; [0x180028168:8]=0x2d8b6
|   ||||    ; CODE XREF from fcn.18000ffd0 @ 0x180010169
|   `-----> 0x180010171      mov   rbx, rax
|    |||    0x180010174      mov   rdi, rax
|    |||    0x180010177      test  rax, rax
|    |||,=< 0x18001017a      jnz   0x18001018d
|    ||||   0x18001017c      mov   r14, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
|    ||||   0x180010183      mov   ebx, 0x109                          ; 265
|   ,=====< 0x180010188      jmp   0x180011a27
|   ||||`-> 0x18001018d      cmp   dword [rsi], r13d
|   ||||,=< 0x180010190      jl    0x1800101a1
|   |||||   0x180010192      sub   qword [rsi], 0x01
|  ,======< 0x180010196      jnz   0x1800101a1
|  ||||||   0x180010198      mov   rcx, rsi
|  ||||||   0x18001019b      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
|  `----`-> 0x1800101a1      mov   rax, qword [sym.imp.python312.dll_PyMethod_Type] ; [0x180028290:8]=0x2db7e ; "~\xdb\U00000002"
|   ||||    0x1800101a8      mov   ecx, 0x01
|   ||||    0x1800101ad      cmp   qword [rbx+0x08], rax
|   ||||,=< 0x1800101b1      jnz   0x1800101e6
|   |||||   0x1800101b3      mov   r15, qword [rbx+0x18]
|   |||||   0x1800101b7      mov   rdi, qword [rbx+0x10]
|   |||||   0x1800101bb      mov   eax, dword [r15]
|   |||||   0x1800101be      add   eax, ecx
|  ,======< 0x1800101c0      jz    0x1800101c5
|  ||||||   0x1800101c2      mov   dword [r15], eax
|  `------> 0x1800101c5      mov   eax, dword [rdi]
|   |||||   0x1800101c7      add   eax, ecx
|  ,======< 0x1800101c9      jz    0x1800101cd
|  ||||||   0x1800101cb      mov   dword [rdi], eax
|  `------> 0x1800101cd      cmp   dword [rbx], r13d
|  ,======< 0x1800101d0      jl    0x1800101e0
|  ||||||   0x1800101d2      sub   qword [rbx], rcx
| ,=======< 0x1800101d5      jnz   0x1800101e0
| |||||||   0x1800101d7      mov   rcx, rbx
| |||||||   0x1800101da      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| ``------> 0x1800101e0      xor   esi, esi
|   |||||   0x1800101e2      mov   ecx, esi
|  ,======< 0x1800101e4      jmp   0x1800101e8
|  |||||`-> 0x1800101e6      xor   esi, esi
|  |||||    ; CODE XREF from fcn.18000ffd0 @ 0x1800101e4
|  `------> 0x1800101e8      mov   rax, qword [0x1800308b8]            ; [0x1800308b8:8]=0
|   ||||    0x1800101ef      lea   rdx, qword [arg_b8h]
|   ||||    0x1800101f6      mov   qword [arg_c0h], rax
|   ||||    0x1800101fd      lea   rdx, qword [rdx+rcx*8]
|   ||||    0x180010201      mov   rax, rcx
|   ||||    0x180010204      mov   qword [arg_b8h], r15
|   ||||    0x18001020b      neg   rax
|   ||||    0x18001020e      mov   qword [arg_c8h], r14
|   ||||    0x180010215      shl   rax, 0x3f
|   ||||    0x180010219      mov   r8d, 0x03
|   ||||    0x18001021f      sub   r8, rcx
|   ||||    0x180010222      xor   r9d, r9d
|   ||||    0x180010225      or    r8, rax
|   ||||    0x180010228      mov   rcx, rdi
|   ||||    0x18001022b      call  0x18001fee0
|   ||||    0x180010230      mov   rbx, rax
|   ||||    0x180010233      test  r15, r15
|   ||||,=< 0x180010236      jz    0x18001024c
|   |||||   0x180010238      cmp   dword [r15], r13d
|  ,======< 0x18001023b      jl    0x18001024c
|  ||||||   0x18001023d      sub   qword [r15], 0x01
| ,=======< 0x180010241      jnz   0x18001024c
| |||||||   0x180010243      mov   rcx, r15
| |||||||   0x180010246      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| ``----`-> 0x18001024c      cmp   dword [rdi], r13d
|   ||||,=< 0x18001024f      jl    0x180010260
|   |||||   0x180010251      sub   qword [rdi], 0x01
|  ,======< 0x180010255      jnz   0x180010260
|  ||||||   0x180010257      mov   rcx, rdi
|  ||||||   0x18001025a      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
|  `----`-> 0x180010260      test  rbx, rbx
|   ||||,=< 0x180010263      jnz   0x18001026f
|   |||||   0x180010265      mov   ebx, 0x109                          ; 265
|  ,======< 0x18001026a      jmp   0x180011cda
|  |||||`-> 0x18001026f      mov   rcx, qword [0x180030f78]            ; [0x180030f78:8]=0
|  |||||    0x180010276      mov   r12, rbx
|  |||||    0x180010279      mov   qword [var_1e0h], rbx
|  |||||    0x18001027e      mov   rdi, rsi
|  |||||    0x180010281      call  0x180020950
|  |||||    0x180010286      mov   r15, rax
|  |||||    0x180010289      test  rax, rax
|  |||||,=< 0x18001028c      jnz   0x180010298
|  ||||||   0x18001028e      mov   ebx, 0x10a                          ; 266
| ,=======< 0x180010293      jmp   0x180011cda
| ||||||`-> 0x180010298      mov   rax, qword [rax+0x08]
| ||||||    0x18001029c      mov   rcx, r15
| ||||||    0x18001029f      mov   rdx, qword [0x180030e08]            ; [0x180030e08:8]=0
| ||||||    0x1800102a6      mov   r8, qword [rax+0x90]
| ||||||    0x1800102ad      test  r8, r8
| ||||||,=< 0x1800102b0      jz    0x1800102b7
| |||||||   0x1800102b2      call  r8
| ========< 0x1800102b5      jmp   0x1800102bd
| ||||||`-> 0x1800102b7      call  qword [sym.imp.python312.dll_PyObject_GetAttr] ; [0x180028168:8]=0x2d8b6
| ||||||    ; CODE XREF from fcn.18000ffd0 @ 0x1800102b5
| --------> 0x1800102bd      mov   rbx, rax
| ||||||    0x1800102c0      mov   rsi, rax
| ||||||    0x1800102c3      test  rax, rax
| ||||||,=< 0x1800102c6      jnz   0x1800102d2
| |||||||   0x1800102c8      mov   ebx, 0x10a                          ; 266
| ========< 0x1800102cd      jmp   0x180011b9e
| ||||||`-> 0x1800102d2      cmp   dword [r15], r13d
| ||||||,=< 0x1800102d5      jl    0x1800102e6
| |||||||   0x1800102d7      sub   qword [r15], 0x01
| ========< 0x1800102db      jnz   0x1800102e6
| |||||||   0x1800102dd      mov   rcx, r15
| |||||||   0x1800102e0      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| ------`-> 0x1800102e6      xor   eax, eax
| ||||||    0x1800102e8      mov   ecx, 0x01
| ||||||    0x1800102ed      mov   r15d, eax
| ||||||    0x1800102f0      mov   rax, qword [sym.imp.python312.dll_PyMethod_Type] ; [0x180028290:8]=0x2db7e ; "~\xdb\U00000002"
| ||||||    0x1800102f7      cmp   qword [rbx+0x08], rax
| ||||||,=< 0x1800102fb      jnz   0x18001032c
| |||||||   0x1800102fd      mov   rdi, qword [rbx+0x18]
| |||||||   0x180010301      mov   rsi, qword [rbx+0x10]
| |||||||   0x180010305      mov   eax, dword [rdi]
| |||||||   0x180010307      add   eax, ecx
| ========< 0x180010309      jz    0x18001030d
| |||||||   0x18001030b      mov   dword [rdi], eax
| --------> 0x18001030d      mov   eax, dword [rsi]
| |||||||   0x18001030f      add   eax, ecx
| ========< 0x180010311      jz    0x180010315
| |||||||   0x180010313      mov   dword [rsi], eax
| --------> 0x180010315      cmp   dword [rbx], r13d
| ========< 0x180010318      jl    0x180010328
| |||||||   0x18001031a      sub   qword [rbx], rcx
| ========< 0x18001031d      jnz   0x180010328
| |||||||   0x18001031f      mov   rcx, rbx
| |||||||   0x180010322      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180010328      xor   eax, eax
| |||||||   0x18001032a      mov   ecx, eax
| ||||||`-> 0x18001032c      mov   rax, qword [0x180030880]            ; [0x180030880:8]=0
| ||||||    0x180010333      lea   rdx, qword [arg_d0h]
| ||||||    0x18001033a      mov   qword [arg_d8h], rax
| ||||||    0x180010341      lea   rdx, qword [rdx+rcx*8]
| ||||||    0x180010345      mov   rax, rcx
| ||||||    0x180010348      mov   qword [arg_d0h], rdi
| ||||||    0x18001034f      neg   rax
| ||||||    0x180010352      mov   qword [arg_e0h], r14
| ||||||    0x180010359      shl   rax, 0x3f
| ||||||    0x18001035d      mov   r8d, 0x03
| ||||||    0x180010363      sub   r8, rcx
| ||||||    0x180010366      xor   r9d, r9d
| ||||||    0x180010369      or    r8, rax
| ||||||    0x18001036c      mov   rcx, rsi
| ||||||    0x18001036f      call  0x18001fee0
| ||||||    0x180010374      mov   rbx, rax
| ||||||    0x180010377      test  rdi, rdi
| ||||||,=< 0x18001037a      jz    0x180010390
| |||||||   0x18001037c      cmp   dword [rdi], r13d
| ========< 0x18001037f      jl    0x180010390
| |||||||   0x180010381      sub   qword [rdi], 0x01
| ========< 0x180010385      jnz   0x180010390
| |||||||   0x180010387      mov   rcx, rdi
| |||||||   0x18001038a      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| ------`-> 0x180010390      xor   eax, eax
| ||||||    0x180010392      mov   edi, eax
| ||||||    0x180010394      cmp   dword [rsi], eax
| ||||||,=< 0x180010396      jl    0x1800103a7
| |||||||   0x180010398      sub   qword [rsi], 0x01
| ========< 0x18001039c      jnz   0x1800103a7
| |||||||   0x18001039e      mov   rcx, rsi
| |||||||   0x1800103a1      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| ------`-> 0x1800103a7      test  rbx, rbx
| ||||||,=< 0x1800103aa      jnz   0x1800103b6
| |||||||   0x1800103ac      mov   ebx, 0x10a                          ; 266
| ========< 0x1800103b1      jmp   0x180011cda
| ||||||`-> 0x1800103b6      mov   rcx, r12
| ||||||    0x1800103b9      mov   qword [var_78h], rbx
| ||||||    0x1800103bd      call  0x1800262b0
| ||||||    0x1800103c2      test  eax, eax
| ||||||,=< 0x1800103c4      jns   0x1800103d0
| |||||||   0x1800103c6      mov   ebx, 0x10c                          ; 268
| ========< 0x1800103cb      jmp   0x180011cda
| ||||||`-> 0x1800103d0      mov   esi, 0x02
| ||||||    0x1800103d5      mov   rcx, 0x8000000000000002
| ||||||    0x1800103df      test  eax, eax
| ||||||,=< 0x1800103e1      jnz   0x18001040f
| |||||||   0x1800103e3      mov   rcx, rbx
| |||||||   0x1800103e6      call  0x1800262b0
| |||||||   0x1800103eb      test  eax, eax
| ========< 0x1800103ed      jns   0x1800103f9
| |||||||   0x1800103ef      mov   ebx, 0x10c                          ; 268
| ========< 0x1800103f4      jmp   0x180011cda
| --------> 0x1800103f9      jnz   0x180010405
| |||||||   0x1800103fb      xor   eax, eax
| |||||||   0x1800103fd      mov   r12d, eax
| ========< 0x180010400      jmp   0x180010e1e
| --------> 0x180010405      mov   rcx, 0x8000000000000002
| ||||||`-> 0x18001040f      mov   eax, dword [r14]
| ||||||    0x180010412      add   eax, 0x01
| ||||||,=< 0x180010415      jz    0x18001041a
| |||||||   0x180010417      mov   dword [r14], eax
| ||||||`-> 0x18001041a      mov   rax, qword [0x1800307b0]            ; [0x1800307b0:8]=0
| ||||||    0x180010421      lea   rdx, qword [var_60h]
| ||||||    0x180010425      mov   r8, rcx
| ||||||    0x180010428      mov   qword [var_58h], rax
| ||||||    0x18001042c      mov   rcx, qword [0x1800310c8]            ; [0x1800310c8:8]=0
| ||||||    0x180010433      xor   r9d, r9d
| ||||||    0x180010436      mov   qword [var_60h], r14
| ||||||    0x18001043a      call  qword [sym.imp.python312.dll_PyObject_VectorcallMethod] ; [0x1800283f8:8]=0x2df22 ; "\"\xdf\U00000002"
| ||||||    0x180010440      mov   r12, rax
| ||||||    0x180010443      cmp   dword [r14], edi
| ||||||,=< 0x180010446      jl    0x180010457
| |||||||   0x180010448      sub   qword [r14], 0x01
| ========< 0x18001044c      jnz   0x180010457
| |||||||   0x18001044e      mov   rcx, r14
| |||||||   0x180010451      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| ------`-> 0x180010457      xor   eax, eax
| ||||||    0x180010459      mov   esi, eax
| ||||||    0x18001045b      test  r12, r12
| ||||||,=< 0x18001045e      jnz   0x18001046a
| |||||||   0x180010460      mov   ebx, 0x10c                          ; 268
| ========< 0x180010465      jmp   0x180011cda
| ||||||`-> 0x18001046a      mov   rcx, r12
| ||||||    0x18001046d      call  0x1800262b0
| ||||||    0x180010472      mov   ebx, eax
| ||||||    0x180010474      test  eax, eax
| ||||||,=< 0x180010476      jns   0x180010482
| |||||||   0x180010478      mov   ebx, 0x10c                          ; 268
| ========< 0x18001047d      jmp   0x180011503
| ||||||`-> 0x180010482      cmp   dword [r12], esi
| ||||||,=< 0x180010486      jl    0x180010498
| |||||||   0x180010488      sub   qword [r12], 0x01
| ========< 0x18001048d      jnz   0x180010498
| |||||||   0x18001048f      mov   rcx, r12
| |||||||   0x180010492      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| ------`-> 0x180010498      mov   r12, rsi
| ||||||    0x18001049b      test  ebx, ebx
| ||||||,=< 0x18001049d      jnz   0x180010e19
| |||||||   0x1800104a3      mov   rcx, qword [0x180030cb8]            ; [0x180030cb8:8]=0
| |||||||   0x1800104aa      call  0x180020950
| |||||||   0x1800104af      mov   rbx, rax
| |||||||   0x1800104b2      test  rax, rax
| ========< 0x1800104b5      jnz   0x1800104c1
| |||||||   0x1800104b7      mov   ebx, 0x10e                          ; 270
| ========< 0x1800104bc      jmp   0x180011cda
| --------> 0x1800104c1      mov   rax, qword [sym.imp.python312.dll_PyMethod_Type] ; [0x180028290:8]=0x2db7e ; "~\xdb\U00000002"
| |||||||   0x1800104c8      mov   ecx, 0x01
| |||||||   0x1800104cd      cmp   qword [rbx+0x08], rax
| ========< 0x1800104d1      jnz   0x180010504
| |||||||   0x1800104d3      mov   rdi, qword [rbx+0x18]
| |||||||   0x1800104d7      mov   rdx, qword [rbx+0x10]
| |||||||   0x1800104db      mov   eax, dword [rdi]
| |||||||   0x1800104dd      add   eax, ecx
| ========< 0x1800104df      jz    0x1800104e3
| |||||||   0x1800104e1      mov   dword [rdi], eax
| --------> 0x1800104e3      mov   eax, dword [rdx]
| |||||||   0x1800104e5      add   eax, ecx
| ========< 0x1800104e7      jz    0x1800104eb
| |||||||   0x1800104e9      mov   dword [rdx], eax
| --------> 0x1800104eb      mov   rcx, rbx
| |||||||   0x1800104ee      mov   rbx, rdx
| |||||||   0x1800104f1      cmp   dword [rcx], esi
| ========< 0x1800104f3      jl    0x180010501
| |||||||   0x1800104f5      sub   qword [rcx], 0x01
| ========< 0x1800104f9      jnz   0x180010501
| |||||||   0x1800104fb      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180010501      mov   rcx, rsi
| --------> 0x180010504      mov   rax, qword [var_218h]
| |||||||   0x180010509      lea   rdx, qword [var_50h]
| |||||||   0x18001050d      mov   qword [var_48h], rax
| |||||||   0x180010511      lea   rdx, qword [rdx+rcx*8]
| |||||||   0x180010515      mov   rax, rcx
| |||||||   0x180010518      mov   qword [var_50h], rdi
| |||||||   0x18001051c      neg   rax
| |||||||   0x18001051f      mov   r8d, 0x02
| |||||||   0x180010525      sub   r8, rcx
| |||||||   0x180010528      shl   rax, 0x3f
| |||||||   0x18001052c      or    r8, rax
| |||||||   0x18001052f      xor   r9d, r9d
| |||||||   0x180010532      mov   rcx, rbx
| |||||||   0x180010535      call  0x18001fee0
| |||||||   0x18001053a      mov   rsi, rax
| |||||||   0x18001053d      test  rdi, rdi
| ========< 0x180010540      jz    0x180010556
| |||||||   0x180010542      cmp   dword [rdi], r12d
| ========< 0x180010545      jl    0x180010556
| |||||||   0x180010547      sub   qword [rdi], 0x01
| ========< 0x18001054b      jnz   0x180010556
| |||||||   0x18001054d      mov   rcx, rdi
| |||||||   0x180010550      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180010556      cmp   dword [rbx], r12d
| ========< 0x180010559      jl    0x18001056a
| |||||||   0x18001055b      sub   qword [rbx], 0x01
| ========< 0x18001055f      jnz   0x18001056a
| |||||||   0x180010561      mov   rcx, rbx
| |||||||   0x180010564      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x18001056a      xor   eax, eax
| |||||||   0x18001056c      mov   edi, eax
| |||||||   0x18001056e      test  rsi, rsi
| ========< 0x180010571      jnz   0x18001057d
| |||||||   0x180010573      mov   ebx, 0x10e                          ; 270
| ========< 0x180010578      jmp   0x180011cda
| --------> 0x18001057d      mov   rbx, qword [var_1e0h]
| |||||||   0x180010582      mov   rcx, rbx
| |||||||   0x180010585      mov   qword [var_1d8h], rsi
| |||||||   0x18001058a      call  0x1800262b0
| |||||||   0x18001058f      test  eax, eax
| ========< 0x180010591      jns   0x18001059d
| |||||||   0x180010593      mov   ebx, 0x10f                          ; 271
| ========< 0x180010598      jmp   0x180011cda
| --------> 0x18001059d      jz    0x180010d85
| |||||||   0x1800105a3      mov   eax, dword [rbx]
| |||||||   0x1800105a5      add   eax, 0x01
| ========< 0x1800105a8      jz    0x1800105ac
| |||||||   0x1800105aa      mov   dword [rbx], eax
| --------> 0x1800105ac      mov   rax, qword [0x180031328]            ; [0x180031328:8]=0
| |||||||   0x1800105b3      lea   rdx, qword [var_40h]
| |||||||   0x1800105b7      mov   rcx, qword [0x180030cf8]            ; [0x180030cf8:8]=0
| |||||||   0x1800105be      mov   rdi, 0x8000000000000002
| |||||||   0x1800105c8      mov   r8, rdi
| |||||||   0x1800105cb      mov   qword [var_40h], rbx
| |||||||   0x1800105cf      xor   r9d, r9d
| |||||||   0x1800105d2      mov   qword [var_38h], rax
| |||||||   0x1800105d6      call  qword [sym.imp.python312.dll_PyObject_VectorcallMethod] ; [0x1800283f8:8]=0x2df22 ; "\"\xdf\U00000002"
| |||||||   0x1800105dc      mov   r12, rax
| |||||||   0x1800105df      cmp   dword [rbx], r13d
| ========< 0x1800105e2      jl    0x1800105f3
| |||||||   0x1800105e4      sub   qword [rbx], 0x01
| ========< 0x1800105e8      jnz   0x1800105f3
| |||||||   0x1800105ea      mov   rcx, rbx
| |||||||   0x1800105ed      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x1800105f3      test  r12, r12
| ========< 0x1800105f6      jnz   0x180010602
| |||||||   0x1800105f8      mov   ebx, 0x110                          ; 272
| ========< 0x1800105fd      jmp   0x180011cda
| --------> 0x180010602      mov   eax, dword [rbx]
| |||||||   0x180010604      add   eax, 0x01
| ========< 0x180010607      jz    0x18001060b
| |||||||   0x180010609      mov   dword [rbx], eax
| --------> 0x18001060b      mov   rax, qword [0x180031330]            ; [0x180031330:8]=0
| |||||||   0x180010612      lea   rdx, qword [var_30h]
| |||||||   0x180010616      mov   rcx, qword [0x180030cf8]            ; [0x180030cf8:8]=0
| |||||||   0x18001061d      xor   r9d, r9d
| |||||||   0x180010620      mov   r8, rdi
| |||||||   0x180010623      mov   qword [var_28h], rax
| |||||||   0x180010627      mov   qword [var_30h], rbx
| |||||||   0x18001062b      call  qword [sym.imp.python312.dll_PyObject_VectorcallMethod] ; [0x1800283f8:8]=0x2df22 ; "\"\xdf\U00000002"
| |||||||   0x180010631      mov   rdi, rax
| |||||||   0x180010634      cmp   dword [rbx], r13d
| ========< 0x180010637      jl    0x180010648
| |||||||   0x180010639      sub   qword [rbx], 0x01
| ========< 0x18001063d      jnz   0x180010648
| |||||||   0x18001063f      mov   rcx, rbx
| |||||||   0x180010642      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180010648      xor   eax, eax
| |||||||   0x18001064a      mov   esi, eax
| |||||||   0x18001064c      test  rdi, rdi
| ========< 0x18001064f      jnz   0x18001065b
| |||||||   0x180010651      mov   ebx, 0x110                          ; 272
| ========< 0x180010656      jmp   0x180011503
| --------> 0x18001065b      mov   rax, qword [rdi+0x08]
| |||||||   0x18001065f      cmp   rax, qword [sym.imp.python312.dll_PyFloat_Type] ; [0x180028278:8]=0x2db40 ; "@\xdb\U00000002"
| ========< 0x180010666      jnz   0x18001066f
| |||||||   0x180010668      movsd xmm6, qword [rdi+0x10]
| ========< 0x18001066d      jmp   0x18001068b
| --------> 0x18001066f      cmp   rax, qword [sym.imp.python312.dll_PyLong_Type] ; [0x180028298:8]=0x2db8e
| |||||||   0x180010676      mov   rcx, rdi
| ========< 0x180010679      jnz   0x180010683
| |||||||   0x18001067b      call  qword [sym.imp.python312.dll_PyLong_AsDouble] ; [0x1800283a0:8]=0x2de1c
| ========< 0x180010681      jmp   0x180010688
| --------> 0x180010683      call  0x180022220
| |||||||   ; CODE XREF from fcn.18000ffd0 @ 0x180010681
| --------> 0x180010688      movaps xmm6, xmm0
| |||||||   ; CODE XREF from fcn.18000ffd0 @ 0x18001066d
| --------> 0x18001068b      ucomisd xmm6, qword [0x18002aff0]
| ========< 0x180010693      jp    0x1800106ac
| ========< 0x180010695      jnz   0x1800106ac
| |||||||   0x180010697      call  qword [sym.imp.python312.dll_PyErr_Occurred] ; [0x1800285f8:8]=0x2d6c6
| |||||||   0x18001069d      test  rax, rax
| ========< 0x1800106a0      jz    0x1800106ac
| |||||||   0x1800106a2      mov   ebx, 0x110                          ; 272
| ========< 0x1800106a7      jmp   0x180011503
| --------> 0x1800106ac      cmp   dword [rdi], esi
| ========< 0x1800106ae      jl    0x1800106bf
| |||||||   0x1800106b0      sub   qword [rdi], 0x01
| ========< 0x1800106b4      jnz   0x1800106bf
| |||||||   0x1800106b6      mov   rcx, rdi
| |||||||   0x1800106b9      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x1800106bf      mov   qword [var_80h], r12
| |||||||   0x1800106c3      call  qword [sym.imp.python312.dll_PyDict_New] ; [0x1800283d0:8]=0x2dea8
| |||||||   0x1800106c9      mov   qword [var_1c8h], rax
| |||||||   0x1800106ce      mov   rbx, rax
| |||||||   0x1800106d1      test  rax, rax
| ========< 0x1800106d4      jnz   0x1800106e0
| |||||||   0x1800106d6      mov   ebx, 0x111                          ; 273
| ========< 0x1800106db      jmp   0x180011cda
| --------> 0x1800106e0      movaps xmm0, xmm6
| |||||||   0x1800106e3      call  qword [sym.imp.python312.dll_PyFloat_FromDouble] ; [0x1800281c0:8]=0x2d990
| |||||||   0x1800106e9      mov   rdi, rax
| |||||||   0x1800106ec      test  rax, rax
| ========< 0x1800106ef      jnz   0x180010700
| |||||||   0x1800106f1      mov   r12, qword [var_1c8h]
| |||||||   0x1800106f6      mov   ebx, 0x111                          ; 273
| ========< 0x1800106fb      jmp   0x180011503
| --------> 0x180010700      mov   r12, qword [var_1d8h]
| |||||||   0x180010705      mov   r8d, 0x04
| |||||||   0x18001070b      mov   rcx, r12
| |||||||   0x18001070e      mov   rdx, rdi
| |||||||   0x180010711      call  qword [sym.imp.python312.dll_PyObject_RichCompare] ; [0x180028250:8]=0x2dada
| |||||||   0x180010717      mov   rsi, rax
| |||||||   0x18001071a      test  rax, rax
| ========< 0x18001071d      jnz   0x18001072e
| |||||||   0x18001071f      mov   r12, qword [var_1c8h]
| |||||||   0x180010724      mov   ebx, 0x111                          ; 273
| ========< 0x180010729      jmp   0x180011503
| --------> 0x18001072e      cmp   dword [rdi], r13d
| ========< 0x180010731      jl    0x180010742
| |||||||   0x180010733      sub   qword [rdi], 0x01
| ========< 0x180010737      jnz   0x180010742
| |||||||   0x180010739      mov   rcx, rdi
| |||||||   0x18001073c      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180010742      mov   rdx, qword [0x1800307b8]            ; [0x1800307b8:8]=0
| |||||||   0x180010749      xor   eax, eax
| |||||||   0x18001074b      mov   r8, rsi
| |||||||   0x18001074e      mov   rcx, rbx
| |||||||   0x180010751      mov   edi, eax
| |||||||   0x180010753      call  qword [sym.imp.python312.dll_PyDict_SetItem] ; [0x1800283c8:8]=0x2de96
| |||||||   0x180010759      test  eax, eax
| ========< 0x18001075b      jns   0x18001076c
| |||||||   0x18001075d      mov   r12, qword [var_1c8h]
| |||||||   0x180010762      mov   ebx, 0x111                          ; 273
| ========< 0x180010767      jmp   0x180011503
| --------> 0x18001076c      cmp   dword [rsi], edi
| ========< 0x18001076e      jl    0x18001077f
| |||||||   0x180010770      sub   qword [rsi], 0x01
| ========< 0x180010774      jnz   0x18001077f
| |||||||   0x180010776      mov   rcx, rsi
| |||||||   0x180010779      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x18001077f      movaps xmm0, xmm6
| |||||||   0x180010782      call  qword [sym.imp.python312.dll_PyFloat_FromDouble] ; [0x1800281c0:8]=0x2d990
| |||||||   0x180010788      mov   rsi, rax
| |||||||   0x18001078b      test  rax, rax
| ========< 0x18001078e      jnz   0x18001079f
| |||||||   0x180010790      mov   r12, qword [var_1c8h]
| |||||||   0x180010795      mov   ebx, 0x111                          ; 273
| ========< 0x18001079a      jmp   0x180011503
| --------> 0x18001079f      xor   r8d, r8d
| |||||||   0x1800107a2      mov   rdx, rsi
| |||||||   0x1800107a5      mov   rcx, r12
| |||||||   0x1800107a8      call  qword [sym.imp.python312.dll_PyObject_RichCompare] ; [0x180028250:8]=0x2dada
| |||||||   0x1800107ae      mov   rdi, rax
| |||||||   0x1800107b1      test  rax, rax
| ========< 0x1800107b4      jnz   0x1800107c5
| |||||||   0x1800107b6      mov   r12, qword [var_1c8h]
| |||||||   0x1800107bb      mov   ebx, 0x111                          ; 273
| ========< 0x1800107c0      jmp   0x180011503
| --------> 0x1800107c5      cmp   dword [rsi], r13d
| ========< 0x1800107c8      jl    0x1800107d9
| |||||||   0x1800107ca      sub   qword [rsi], 0x01
| ========< 0x1800107ce      jnz   0x1800107d9
| |||||||   0x1800107d0      mov   rcx, rsi
| |||||||   0x1800107d3      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x1800107d9      mov   rdx, qword [0x1800307c0]            ; [0x1800307c0:8]=0
| |||||||   0x1800107e0      xor   eax, eax
| |||||||   0x1800107e2      mov   r8, rdi
| |||||||   0x1800107e5      mov   rcx, rbx
| |||||||   0x1800107e8      mov   esi, eax
| |||||||   0x1800107ea      call  qword [sym.imp.python312.dll_PyDict_SetItem] ; [0x1800283c8:8]=0x2de96
| |||||||   0x1800107f0      test  eax, eax
| ========< 0x1800107f2      jns   0x180010803
| |||||||   0x1800107f4      mov   r12, qword [var_1c8h]
| |||||||   0x1800107f9      mov   ebx, 0x111                          ; 273
| ========< 0x1800107fe      jmp   0x180011503
| --------> 0x180010803      cmp   dword [rdi], esi
| ========< 0x180010805      jl    0x180010816
| |||||||   0x180010807      sub   qword [rdi], 0x01
| ========< 0x18001080b      jnz   0x180010816
| |||||||   0x18001080d      mov   rcx, rdi
| |||||||   0x180010810      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180010816      movaps xmm0, xmm6
| |||||||   0x180010819      call  qword [sym.imp.python312.dll_PyFloat_FromDouble] ; [0x1800281c0:8]=0x2d990
| |||||||   0x18001081f      mov   rdi, rax
| |||||||   0x180010822      test  rax, rax
| ========< 0x180010825      jnz   0x180010836
| |||||||   0x180010827      mov   r12, qword [var_1c8h]
| |||||||   0x18001082c      mov   ebx, 0x111                          ; 273
| ========< 0x180010831      jmp   0x180011503
| --------> 0x180010836      mov   r8d, 0x05
| |||||||   0x18001083c      mov   rdx, rdi
| |||||||   0x18001083f      mov   rcx, r12
| |||||||   0x180010842      call  qword [sym.imp.python312.dll_PyObject_RichCompare] ; [0x180028250:8]=0x2dada
| |||||||   0x180010848      mov   rsi, rax
| |||||||   0x18001084b      test  rax, rax
| ========< 0x18001084e      jnz   0x18001085f
| |||||||   0x180010850      mov   r12, qword [var_1c8h]
| |||||||   0x180010855      mov   ebx, 0x111                          ; 273
| ========< 0x18001085a      jmp   0x180011503
| --------> 0x18001085f      cmp   dword [rdi], r13d
| ========< 0x180010862      jl    0x180010873
| |||||||   0x180010864      sub   qword [rdi], 0x01
| ========< 0x180010868      jnz   0x180010873
| |||||||   0x18001086a      mov   rcx, rdi
| |||||||   0x18001086d      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180010873      mov   rdx, qword [0x1800307c8]            ; [0x1800307c8:8]=0
| |||||||   0x18001087a      xor   eax, eax
| |||||||   0x18001087c      mov   r8, rsi
| |||||||   0x18001087f      mov   rcx, rbx
| |||||||   0x180010882      mov   edi, eax
| |||||||   0x180010884      call  qword [sym.imp.python312.dll_PyDict_SetItem] ; [0x1800283c8:8]=0x2de96
| |||||||   0x18001088a      test  eax, eax
| ========< 0x18001088c      jns   0x18001089d
| |||||||   0x18001088e      mov   r12, qword [var_1c8h]
| |||||||   0x180010893      mov   ebx, 0x111                          ; 273
| ========< 0x180010898      jmp   0x180011503
| --------> 0x18001089d      cmp   dword [rsi], edi
| ========< 0x18001089f      jl    0x1800108b0
| |||||||   0x1800108a1      sub   qword [rsi], 0x01
| ========< 0x1800108a5      jnz   0x1800108b0
| |||||||   0x1800108a7      mov   rcx, rsi
| |||||||   0x1800108aa      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x1800108b0      movaps xmm0, xmm6
| |||||||   0x1800108b3      call  qword [sym.imp.python312.dll_PyFloat_FromDouble] ; [0x1800281c0:8]=0x2d990
| |||||||   0x1800108b9      mov   rsi, rax
| |||||||   0x1800108bc      test  rax, rax
| ========< 0x1800108bf      jnz   0x1800108d0
| |||||||   0x1800108c1      mov   r12, qword [var_1c8h]
| |||||||   0x1800108c6      mov   ebx, 0x111                          ; 273
| ========< 0x1800108cb      jmp   0x180011503
| --------> 0x1800108d0      mov   r8d, 0x01
| |||||||   0x1800108d6      mov   rdx, rsi
| |||||||   0x1800108d9      mov   rcx, r12
| |||||||   0x1800108dc      call  qword [sym.imp.python312.dll_PyObject_RichCompare] ; [0x180028250:8]=0x2dada
| |||||||   0x1800108e2      mov   rdi, rax
| |||||||   0x1800108e5      test  rax, rax
| ========< 0x1800108e8      jnz   0x1800108f9
| |||||||   0x1800108ea      mov   r12, qword [var_1c8h]
| |||||||   0x1800108ef      mov   ebx, 0x111                          ; 273
| ========< 0x1800108f4      jmp   0x180011503
| --------> 0x1800108f9      cmp   dword [rsi], r13d
| ========< 0x1800108fc      jl    0x18001090d
| |||||||   0x1800108fe      sub   qword [rsi], 0x01
| ========< 0x180010902      jnz   0x18001090d
| |||||||   0x180010904      mov   rcx, rsi
| |||||||   0x180010907      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x18001090d      mov   rdx, qword [0x1800307d0]            ; [0x1800307d0:8]=0
| |||||||   0x180010914      xor   eax, eax
| |||||||   0x180010916      mov   r8, rdi
| |||||||   0x180010919      mov   rcx, rbx
| |||||||   0x18001091c      mov   esi, eax
| |||||||   0x18001091e      call  qword [sym.imp.python312.dll_PyDict_SetItem] ; [0x1800283c8:8]=0x2de96
| |||||||   0x180010924      test  eax, eax
| ========< 0x180010926      jns   0x180010937
| |||||||   0x180010928      mov   r12, qword [var_1c8h]
| |||||||   0x18001092d      mov   ebx, 0x111                          ; 273
| ========< 0x180010932      jmp   0x180011503
| --------> 0x180010937      cmp   dword [rdi], esi
| ========< 0x180010939      jl    0x18001094a
| |||||||   0x18001093b      sub   qword [rdi], 0x01
| ========< 0x18001093f      jnz   0x18001094a
| |||||||   0x180010941      mov   rcx, rdi
| |||||||   0x180010944      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x18001094a      movaps xmm0, xmm6
| |||||||   0x18001094d      call  qword [sym.imp.python312.dll_PyFloat_FromDouble] ; [0x1800281c0:8]=0x2d990
| |||||||   0x180010953      mov   rdi, rax
| |||||||   0x180010956      test  rax, rax
| ========< 0x180010959      jnz   0x18001096a
| |||||||   0x18001095b      mov   r12, qword [var_1c8h]
| |||||||   0x180010960      mov   ebx, 0x111                          ; 273
| ========< 0x180010965      jmp   0x180011503
| --------> 0x18001096a      mov   r8d, 0x03
| |||||||   0x180010970      mov   rdx, rdi
| |||||||   0x180010973      mov   rcx, r12
| |||||||   0x180010976      call  qword [sym.imp.python312.dll_PyObject_RichCompare] ; [0x180028250:8]=0x2dada
| |||||||   0x18001097c      mov   rsi, rax
| |||||||   0x18001097f      test  rax, rax
| ========< 0x180010982      jnz   0x180010993
| |||||||   0x180010984      mov   r12, qword [var_1c8h]
| |||||||   0x180010989      mov   ebx, 0x111                          ; 273
| ========< 0x18001098e      jmp   0x180011503
| --------> 0x180010993      cmp   dword [rdi], r13d
| ========< 0x180010996      jl    0x1800109a7
| |||||||   0x180010998      sub   qword [rdi], 0x01
| ========< 0x18001099c      jnz   0x1800109a7
| |||||||   0x18001099e      mov   rcx, rdi
| |||||||   0x1800109a1      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x1800109a7      mov   rdx, qword [0x1800307d8]            ; [0x1800307d8:8]=0
| |||||||   0x1800109ae      xor   eax, eax
| |||||||   0x1800109b0      mov   r8, rsi
| |||||||   0x1800109b3      mov   rcx, rbx
| |||||||   0x1800109b6      mov   edi, eax
| |||||||   0x1800109b8      call  qword [sym.imp.python312.dll_PyDict_SetItem] ; [0x1800283c8:8]=0x2de96
| |||||||   0x1800109be      test  eax, eax
| ========< 0x1800109c0      jns   0x1800109d1
| |||||||   0x1800109c2      mov   r12, qword [var_1c8h]
| |||||||   0x1800109c7      mov   ebx, 0x111                          ; 273
| ========< 0x1800109cc      jmp   0x180011503
| --------> 0x1800109d1      cmp   dword [rsi], edi
| ========< 0x1800109d3      jl    0x1800109e4
| |||||||   0x1800109d5      sub   qword [rsi], 0x01
| ========< 0x1800109d9      jnz   0x1800109e4
| |||||||   0x1800109db      mov   rcx, rsi
| |||||||   0x1800109de      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x1800109e4      movaps xmm0, xmm6
| |||||||   0x1800109e7      call  qword [sym.imp.python312.dll_PyFloat_FromDouble] ; [0x1800281c0:8]=0x2d990
| |||||||   0x1800109ed      mov   rsi, rax
| |||||||   0x1800109f0      test  rax, rax
| ========< 0x1800109f3      jnz   0x180010a04
| |||||||   0x1800109f5      mov   r12, qword [var_1c8h]
| |||||||   0x1800109fa      mov   ebx, 0x111                          ; 273
| ========< 0x1800109ff      jmp   0x180011503
| --------> 0x180010a04      mov   r8d, 0x02
| |||||||   0x180010a0a      mov   rdx, rsi
| |||||||   0x180010a0d      mov   rcx, r12
| |||||||   0x180010a10      call  qword [sym.imp.python312.dll_PyObject_RichCompare] ; [0x180028250:8]=0x2dada
| |||||||   0x180010a16      mov   rdi, rax
| |||||||   0x180010a19      test  rax, rax
| ========< 0x180010a1c      jnz   0x180010a2d
| |||||||   0x180010a1e      mov   r12, qword [var_1c8h]
| |||||||   0x180010a23      mov   ebx, 0x111                          ; 273
| ========< 0x180010a28      jmp   0x180011503
| --------> 0x180010a2d      cmp   dword [rsi], r13d
| ========< 0x180010a30      jl    0x180010a41
| |||||||   0x180010a32      sub   qword [rsi], 0x01
| ========< 0x180010a36      jnz   0x180010a41
| |||||||   0x180010a38      mov   rcx, rsi
| |||||||   0x180010a3b      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180010a41      mov   rdx, qword [0x1800307b0]            ; [0x1800307b0:8]=0
| |||||||   0x180010a48      xor   r12d, r12d
| |||||||   0x180010a4b      mov   r8, rdi
| |||||||   0x180010a4e      mov   rcx, rbx
| |||||||   0x180010a51      mov   esi, r12d
| |||||||   0x180010a54      call  qword [sym.imp.python312.dll_PyDict_SetItem] ; [0x1800283c8:8]=0x2de96
| |||||||   0x180010a5a      test  eax, eax
| ========< 0x180010a5c      jns   0x180010a6d
| |||||||   0x180010a5e      mov   r12, qword [var_1c8h]
| |||||||   0x180010a63      mov   ebx, 0x111                          ; 273
| ========< 0x180010a68      jmp   0x180011503
| --------> 0x180010a6d      cmp   dword [rdi], r12d
| ========< 0x180010a70      jl    0x180010a81
| |||||||   0x180010a72      sub   qword [rdi], 0x01
| ========< 0x180010a76      jnz   0x180010a81
| |||||||   0x180010a78      mov   rcx, rdi
| |||||||   0x180010a7b      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180010a81      mov   rcx, qword [0x180030f20]            ; [0x180030f20:8]=0
| |||||||   0x180010a88      mov   rdi, r12
| |||||||   0x180010a8b      mov   qword [var_1d0h], rbx
| |||||||   0x180010a90      call  0x180020950
| |||||||   0x180010a95      mov   rsi, rax
| |||||||   0x180010a98      test  rax, rax
| ========< 0x180010a9b      jnz   0x180010aa7
| |||||||   0x180010a9d      mov   ebx, 0x112                          ; 274
| ========< 0x180010aa2      jmp   0x180011cda
| --------> 0x180010aa7      mov   rax, qword [rax+0x08]
| |||||||   0x180010aab      mov   rcx, rsi
| |||||||   0x180010aae      mov   rdx, qword [0x180030928]            ; [0x180030928:8]=0
| |||||||   0x180010ab5      mov   r8, qword [rax+0x90]
| |||||||   0x180010abc      test  r8, r8
| ========< 0x180010abf      jz    0x180010ac6
| |||||||   0x180010ac1      call  r8
| ========< 0x180010ac4      jmp   0x180010acc
| --------> 0x180010ac6      call  qword [sym.imp.python312.dll_PyObject_GetAttr] ; [0x180028168:8]=0x2d8b6
| |||||||   ; CODE XREF from fcn.18000ffd0 @ 0x180010ac4
| --------> 0x180010acc      mov   rbx, rax
| |||||||   0x180010acf      mov   r15, rax
| |||||||   0x180010ad2      test  rax, rax
| ========< 0x180010ad5      jnz   0x180010ae8
| |||||||   0x180010ad7      mov   r14, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
| |||||||   0x180010ade      mov   ebx, 0x112                          ; 274
| ========< 0x180010ae3      jmp   0x180011a27
| --------> 0x180010ae8      cmp   dword [rsi], edi
| ========< 0x180010aea      jl    0x180010afb
| |||||||   0x180010aec      sub   qword [rsi], 0x01
| ========< 0x180010af0      jnz   0x180010afb
| |||||||   0x180010af2      mov   rcx, rsi
| |||||||   0x180010af5      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180010afb      mov   rcx, qword [var_218h]
| |||||||   0x180010b00      call  qword [sym.imp.python312.dll_PyObject_Size] ; [0x180028578:8]=0x2e318
| |||||||   0x180010b06      mov   r12, rax
| |||||||   0x180010b09      cmp   rax, 0xffffffffffffffff
| ========< 0x180010b0d      jnz   0x180010b19
| |||||||   0x180010b0f      mov   ebx, 0x112                          ; 274
| ========< 0x180010b14      jmp   0x180011b9e
| --------> 0x180010b19      test  r12, r12
| |||||||   0x180010b1c      mov   rcx, r12
| |||||||   0x180010b1f      cmovs rcx, rdi
| |||||||   0x180010b23      call  qword [sym.imp.python312.dll_PyList_New] ; [0x180028348:8]=0x2dd4a ; "J\xdd\U00000002"
| |||||||   0x180010b29      mov   rsi, rax
| |||||||   0x180010b2c      test  rax, rax
| ========< 0x180010b2f      jnz   0x180010b3b
| |||||||   0x180010b31      mov   ebx, 0x112                          ; 274
| ========< 0x180010b36      jmp   0x180011b9e
| --------> 0x180010b3b      xor   eax, eax
| |||||||   0x180010b3d      mov   edx, eax
| |||||||   0x180010b3f      test  r12, r12
| ========< 0x180010b42      jle   0x180010b77
| |||||||   0x180010b44      nop   dword [rax], eax
| |||||||   0x180010b48      nop   dword [rax+rax*1], eax
| --------> 0x180010b50      mov   rcx, qword [sym.imp.python312.dll__Py_FalseStruct] ; [0x180028260:8]=0x2db02
| |||||||   0x180010b57      mov   eax, dword [rcx]
| |||||||   0x180010b59      add   eax, 0x01
| ========< 0x180010b5c      jz    0x180010b67
| |||||||   0x180010b5e      mov   dword [rcx], eax
| |||||||   0x180010b60      mov   rcx, qword [sym.imp.python312.dll__Py_FalseStruct] ; [0x180028260:8]=0x2db02
| --------> 0x180010b67      mov   rax, qword [rsi+0x18]
| |||||||   0x180010b6b      mov   qword [rax+rdx*8], rcx
| |||||||   0x180010b6f      inc   rdx
| |||||||   0x180010b72      cmp   rdx, r12
| ========< 0x180010b75      jl    0x180010b50
| --------> 0x180010b77      mov   rcx, qword [var_218h]
| |||||||   0x180010b7c      mov   rdx, qword [0x180030d58]            ; [0x180030d58:8]=0
| |||||||   0x180010b83      mov   rax, qword [rcx+0x08]
| |||||||   0x180010b87      mov   r8, qword [rax+0x90]
| |||||||   0x180010b8e      test  r8, r8
| ========< 0x180010b91      jz    0x180010b98
| |||||||   0x180010b93      call  r8
| ========< 0x180010b96      jmp   0x180010b9e
| --------> 0x180010b98      call  qword [sym.imp.python312.dll_PyObject_GetAttr] ; [0x180028168:8]=0x2d8b6
| |||||||   ; CODE XREF from fcn.18000ffd0 @ 0x180010b96
| --------> 0x180010b9e      mov   r13, rax
| |||||||   0x180010ba1      test  rax, rax
| ========< 0x180010ba4      jnz   0x180010bb7
| |||||||   0x180010ba6      mov   r14, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
| |||||||   0x180010bad      mov   ebx, 0x112                          ; 274
| ========< 0x180010bb2      jmp   0x180011a27
| --------> 0x180010bb7      mov   rax, qword [sym.imp.python312.dll_PyMethod_Type] ; [0x180028290:8]=0x2db7e ; "~\xdb\U00000002"
| |||||||   0x180010bbe      mov   r12d, 0x01
| |||||||   0x180010bc4      cmp   qword [rbx+0x08], rax
| ========< 0x180010bc8      jnz   0x180010c00
| |||||||   0x180010bca      mov   rdi, qword [rbx+0x18]
| |||||||   0x180010bce      mov   r15, qword [rbx+0x10]
| |||||||   0x180010bd2      mov   eax, dword [rdi]
| |||||||   0x180010bd4      add   eax, r12d
| ========< 0x180010bd7      jz    0x180010bdb
| |||||||   0x180010bd9      mov   dword [rdi], eax
| --------> 0x180010bdb      mov   eax, dword [r15]
| |||||||   0x180010bde      add   eax, r12d
| ========< 0x180010be1      jz    0x180010be6
| |||||||   0x180010be3      mov   dword [r15], eax
| --------> 0x180010be6      cmp   dword [rbx], 0x00
| ========< 0x180010be9      jl    0x180010bf9
| |||||||   0x180010beb      sub   qword [rbx], r12
| ========< 0x180010bee      jnz   0x180010bf9
| |||||||   0x180010bf0      mov   rcx, rbx
| |||||||   0x180010bf3      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180010bf9      xor   ebx, ebx
| |||||||   0x180010bfb      mov   r12d, ebx
| ========< 0x180010bfe      jmp   0x180010c02
| --------> 0x180010c00      xor   ebx, ebx
| |||||||   ; CODE XREF from fcn.18000ffd0 @ 0x180010bfe
| --------> 0x180010c02      xor   eax, eax
| |||||||   0x180010c04      mov   qword [arg_70h], rdi
| |||||||   0x180010c08      mov   ecx, 0x01
| |||||||   0x180010c0d      mov   qword [arg_80h], rax
| |||||||   0x180010c14      mov   qword [arg_78h], rsi
| |||||||   0x180010c18      call  qword [sym.imp.python312.dll_PyTuple_New] ; [0x180028190:8]=0x2d916
| |||||||   0x180010c1e      mov   qword [var_208h], rax
| |||||||   0x180010c23      mov   rcx, rax
| |||||||   0x180010c26      test  rax, rax
| ========< 0x180010c29      jnz   0x180010c3c
| |||||||   0x180010c2b      mov   r14, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
| |||||||   0x180010c32      mov   ebx, 0x112                          ; 274
| ========< 0x180010c37      jmp   0x180011a27
| --------> 0x180010c3c      mov   rax, qword [0x180030d58]            ; [0x180030d58:8]=0
| |||||||   0x180010c43      mov   qword [rcx+0x18], rax
| |||||||   0x180010c47      mov   edx, dword [rax]
| |||||||   0x180010c49      add   edx, 0x01
| ========< 0x180010c4c      jz    0x180010c50
| |||||||   0x180010c4e      mov   dword [rax], edx
| --------> 0x180010c50      mov   r9, rcx
| |||||||   0x180010c53      mov   qword [arg_80h], r13
| |||||||   0x180010c5a      mov   rax, r12
| |||||||   0x180010c5d      lea   rdx, qword [arg_70h]
| |||||||   0x180010c61      neg   rax
| |||||||   0x180010c64      lea   rdx, qword [rdx+r12*8]
| |||||||   0x180010c68      shl   rax, 0x3f
| |||||||   0x180010c6c      mov   r8d, 0x02
| |||||||   0x180010c72      sub   r8, r12
| |||||||   0x180010c75      mov   rcx, r15
| |||||||   0x180010c78      or    r8, rax
| |||||||   0x180010c7b      call  qword [sym.imp.python312.dll_PyObject_Vectorcall] ; [0x180028328:8]=0x2dd02
| |||||||   0x180010c81      mov   r12, rax
| |||||||   0x180010c84      test  rdi, rdi
| ========< 0x180010c87      jz    0x180010c9d
| |||||||   0x180010c89      cmp   dword [rdi], 0x00
| ========< 0x180010c8c      jl    0x180010c9d
| |||||||   0x180010c8e      sub   qword [rdi], 0x01
| ========< 0x180010c92      jnz   0x180010c9d
| |||||||   0x180010c94      mov   rcx, rdi
| |||||||   0x180010c97      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180010c9d      cmp   dword [rsi], 0x00
| |||||||   0x180010ca0      mov   rdi, rbx
| ========< 0x180010ca3      jl    0x180010cb4
| |||||||   0x180010ca5      sub   qword [rsi], 0x01
| ========< 0x180010ca9      jnz   0x180010cb4
| |||||||   0x180010cab      mov   rcx, rsi
| |||||||   0x180010cae      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180010cb4      cmp   dword [r13], 0x00
| |||||||   0x180010cb9      mov   rsi, rbx
| ========< 0x180010cbc      jl    0x180010cce
| |||||||   0x180010cbe      sub   qword [r13], 0x01
| ========< 0x180010cc3      jnz   0x180010cce
| |||||||   0x180010cc5      mov   rcx, r13
| |||||||   0x180010cc8      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180010cce      mov   rcx, qword [var_208h]
| |||||||   0x180010cd3      mov   r13, rbx
| |||||||   0x180010cd6      cmp   dword [rcx], 0x00
| ========< 0x180010cd9      jl    0x180010ce7
| |||||||   0x180010cdb      sub   qword [rcx], 0x01
| ========< 0x180010cdf      jnz   0x180010ce7
| |||||||   0x180010ce1      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180010ce7      cmp   dword [r15], 0x00
| |||||||   0x180010ceb      mov   qword [var_208h], rbx
| ========< 0x180010cf0      jl    0x180010d01
| |||||||   0x180010cf2      sub   qword [r15], 0x01
| ========< 0x180010cf6      jnz   0x180010d01
| |||||||   0x180010cf8      mov   rcx, r15
| |||||||   0x180010cfb      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180010d01      test  r12, r12
| ========< 0x180010d04      jnz   0x180010d10
| |||||||   0x180010d06      mov   ebx, 0x112                          ; 274
| ========< 0x180010d0b      jmp   0x180011cda
| --------> 0x180010d10      mov   rbx, qword [var_1d0h]
| |||||||   0x180010d15      mov   rdx, qword [var_80h]
| |||||||   0x180010d19      mov   rcx, rbx
| |||||||   0x180010d1c      call  qword [sym.imp.python312.dll_PyDict_GetItemWithError] ; [0x180028150:8]=0x2d86e ; "n\xd8\U00000002"
| |||||||   0x180010d22      mov   r15, rax
| |||||||   0x180010d25      test  rax, rax
| ========< 0x180010d28      jnz   0x180010d47
| |||||||   0x180010d2a      call  qword [sym.imp.python312.dll_PyErr_Occurred] ; [0x1800285f8:8]=0x2d6c6
| |||||||   0x180010d30      test  rax, rax
| ========< 0x180010d33      jz    0x180010d44
| |||||||   0x180010d35      xor   eax, eax
| |||||||   0x180010d37      mov   ebx, 0x112                          ; 274
| |||||||   0x180010d3c      mov   r15d, eax
| ========< 0x180010d3f      jmp   0x180011503
| --------> 0x180010d44      mov   r15, r12
| --------> 0x180010d47      mov   eax, dword [r15]
| |||||||   0x180010d4a      add   eax, 0x01
| ========< 0x180010d4d      jz    0x180010d52
| |||||||   0x180010d4f      mov   dword [r15], eax
| --------> 0x180010d52      test  r15, r15
| ========< 0x180010d55      jnz   0x180010d61
| |||||||   0x180010d57      mov   ebx, 0x112                          ; 274
| ========< 0x180010d5c      jmp   0x180011503
| --------> 0x180010d61      cmp   dword [r12], 0x00
| ========< 0x180010d66      jl    0x180011d4e
| |||||||   0x180010d6c      sub   qword [r12], 0x01
| ========< 0x180010d71      jnz   0x180011d4e
| |||||||   0x180010d77      mov   rcx, r12
| |||||||   0x180010d7a      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| ========< 0x180010d80      jmp   0x180011d4e
| --------> 0x180010d85      mov   rcx, qword [var_78h]
| |||||||   0x180010d89      call  0x1800262b0
| |||||||   0x180010d8e      test  eax, eax
| ========< 0x180010d90      jns   0x180010d9c
| |||||||   0x180010d92      mov   ebx, 0x113                          ; 275
| ========< 0x180010d97      jmp   0x180011cda
| --------> 0x180010d9c      jz    0x180010e19
| |||||||   0x180010d9e      mov   rax, qword [sym.imp.python312.dll_PyFloat_Type] ; [0x180028278:8]=0x2db40 ; "@\xdb\U00000002"
| |||||||   0x180010da5      cmp   qword [r14+0x08], rax
| ========< 0x180010da9      jnz   0x180010ddd
| |||||||   0x180010dab      mov   eax, dword [r14]
| |||||||   0x180010dae      add   eax, 0x01
| ========< 0x180010db1      jz    0x180010db6
| |||||||   0x180010db3      mov   dword [r14], eax
| --------> 0x180010db6      mov   r15, r14
| --------> 0x180010db9      mov   r8d, 0x02
| |||||||   0x180010dbf      mov   rdx, r15
| |||||||   0x180010dc2      mov   rcx, rsi
| |||||||   0x180010dc5      call  qword [sym.imp.python312.dll_PyObject_RichCompare] ; [0x180028250:8]=0x2dada
| |||||||   0x180010dcb      mov   rbx, rax
| |||||||   0x180010dce      test  rax, rax
| ========< 0x180010dd1      jnz   0x180010df7
| |||||||   0x180010dd3      mov   ebx, 0x114                          ; 276
| ========< 0x180010dd8      jmp   0x180011b9e
| --------> 0x180010ddd      mov   rcx, r14
| |||||||   0x180010de0      call  0x180020e80
| |||||||   0x180010de5      mov   r15, rax
| |||||||   0x180010de8      test  rax, rax
| ========< 0x180010deb      jnz   0x180010db9
| |||||||   0x180010ded      mov   ebx, 0x114                          ; 276
| ========< 0x180010df2      jmp   0x180011cda
| --------> 0x180010df7      cmp   dword [r15], edi
| ========< 0x180010dfa      jl    0x180010e0b
| |||||||   0x180010dfc      sub   qword [r15], 0x01
| ========< 0x180010e00      jnz   0x180010e0b
| |||||||   0x180010e02      mov   rcx, r15
| |||||||   0x180010e05      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180010e0b      mov   r15, rbx
| |||||||   0x180010e0e      mov   r13, rsi
| |||||||   0x180010e11      mov   rbx, rdi
| ========< 0x180010e14      jmp   0x180011d58
| ------`-> 0x180010e19      mov   esi, 0x02
| ||||||    ; CODE XREF from fcn.18000ffd0 @ 0x180010400
| --------> 0x180010e1e      mov   rbx, qword [var_218h]
| ||||||    0x180010e23      mov   eax, dword [rbx]
| ||||||    0x180010e25      add   eax, 0x01
| ||||||,=< 0x180010e28      jz    0x180010e2c
| |||||||   0x180010e2a      mov   dword [rbx], eax
| ||||||`-> 0x180010e2c      mov   rax, qword [sym.imp.python312.dll_PyUnicode_Type] ; [0x1800283d8:8]=0x2deb6
| ||||||    0x180010e33      lea   rdx, qword [var_20h]
| ||||||    0x180010e37      mov   rcx, qword [0x180030aa0]            ; [0x180030aa0:8]=0
| ||||||    0x180010e3e      mov   rdi, 0x8000000000000002
| ||||||    0x180010e48      mov   r8, rdi
| ||||||    0x180010e4b      mov   qword [var_20h], rbx
| ||||||    0x180010e4f      xor   r9d, r9d
| ||||||    0x180010e52      mov   qword [var_18h], rax
| ||||||    0x180010e56      call  qword [sym.imp.python312.dll_PyObject_VectorcallMethod] ; [0x1800283f8:8]=0x2df22 ; "\"\xdf\U00000002"
| ||||||    0x180010e5c      mov   rcx, rax
| ||||||    0x180010e5f      mov   qword [var_208h], rax
| ||||||    0x180010e64      cmp   dword [rbx], r13d
| ||||||,=< 0x180010e67      jl    0x180010e7d
| |||||||   0x180010e69      sub   qword [rbx], 0x01
| ========< 0x180010e6d      jnz   0x180010e7d
| |||||||   0x180010e6f      mov   rcx, rbx
| |||||||   0x180010e72      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| |||||||   0x180010e78      mov   rcx, qword [var_208h]
| ------`-> 0x180010e7d      xor   edx, edx
| ||||||    0x180010e7f      test  rcx, rcx
| ||||||,=< 0x180010e82      jnz   0x180010eae
| |||||||   0x180010e84      mov   rdi, r12
| |||||||   0x180010e87      mov   rax, qword [var_1d8h]
| |||||||   0x180010e8c      mov   ebx, 0x116                          ; 278
| |||||||   0x180010e91      mov   qword [var_1d8h], rax
| |||||||   0x180010e96      mov   qword [var_80h], rdx
| |||||||   0x180010e9a      mov   qword [var_1d0h], rdx
| |||||||   0x180010e9f      mov   qword [var_1e8h], rdx
| |||||||   0x180010ea4      mov   qword [var_200h], rdx
| ========< 0x180010ea9      jmp   0x180011a18
| ||||||`-> 0x180010eae      mov   eax, dword [rcx]
| ||||||    0x180010eb0      add   eax, 0x01
| ||||||,=< 0x180010eb3      jz    0x180010eb7
| |||||||   0x180010eb5      mov   dword [rcx], eax
| ||||||`-> 0x180010eb7      mov   rax, qword [0x180030778]            ; [0x180030778:8]=0
| ||||||    0x180010ebe      lea   rdx, qword [var_10h]
| ||||||    0x180010ec2      mov   qword [var_10h], rcx
| ||||||    0x180010ec6      xor   r9d, r9d
| ||||||    0x180010ec9      mov   rcx, qword [0x180030ca8]            ; [0x180030ca8:8]=0
| ||||||    0x180010ed0      mov   r8, rdi
| ||||||    0x180010ed3      mov   qword [var_8h], rax
| ||||||    0x180010ed7      call  qword [sym.imp.python312.dll_PyObject_VectorcallMethod] ; [0x1800283f8:8]=0x2df22 ; "\"\xdf\U00000002"
| ||||||    0x180010edd      mov   rbx, qword [var_208h]
| ||||||    0x180010ee2      mov   rdi, rax
| ||||||    0x180010ee5      cmp   dword [rbx], r13d
| ||||||,=< 0x180010ee8      jl    0x180010ef9
| |||||||   0x180010eea      sub   qword [rbx], 0x01
| ========< 0x180010eee      jnz   0x180010ef9
| |||||||   0x180010ef0      mov   rcx, rbx
| |||||||   0x180010ef3      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| ------`-> 0x180010ef9      xor   edx, edx
| ||||||    0x180010efb      cmp   dword [rbx], edx
| ||||||,=< 0x180010efd      jl    0x180010f10
| |||||||   0x180010eff      sub   qword [rbx], 0x01
| ========< 0x180010f03      jnz   0x180010f10
| |||||||   0x180010f05      mov   rcx, rbx
| |||||||   0x180010f08      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| |||||||   0x180010f0e      xor   edx, edx
| ------`-> 0x180010f10      mov   qword [var_208h], rdx
| ||||||    0x180010f15      test  rdi, rdi
| ||||||,=< 0x180010f18      jnz   0x180010f27
| |||||||   0x180010f1a      mov   ebx, 0x116                          ; 278
| |||||||   0x180010f1f      mov   rdi, r12
| ========< 0x180010f22      jmp   0x180011a18
| ||||||`-> 0x180010f27      mov   eax, dword [r14]
| ||||||    0x180010f2a      mov   qword [var_1e8h], rdi
| ||||||    0x180010f2f      add   eax, 0x01
| ||||||,=< 0x180010f32      jz    0x180010f37
| |||||||   0x180010f34      mov   dword [r14], eax
| ||||||`-> 0x180010f37      mov   rax, qword [0x1800307e0]            ; [0x1800307e0:8]=0
| ||||||    0x180010f3e      lea   rdx, qword [rbp]
| ||||||    0x180010f42      mov   rcx, qword [0x1800310c8]            ; [0x1800310c8:8]=0
| ||||||    0x180010f49      xor   r9d, r9d
| ||||||    0x180010f4c      mov   r8, 0x8000000000000002
| ||||||    0x180010f56      mov   qword [arg_8h], rax
| ||||||    0x180010f5a      mov   qword [rbp], r14
| ||||||    0x180010f5e      call  qword [sym.imp.python312.dll_PyObject_VectorcallMethod] ; [0x1800283f8:8]=0x2df22 ; "\"\xdf\U00000002"
| ||||||    0x180010f64      mov   rbx, rax
| ||||||    0x180010f67      mov   qword [var_1c8h], rax
| ||||||    0x180010f6c      cmp   dword [r14], r13d
| ||||||,=< 0x180010f6f      jl    0x180010f80
| |||||||   0x180010f71      sub   qword [r14], 0x01
| ========< 0x180010f75      jnz   0x180010f80
| |||||||   0x180010f77      mov   rcx, r14
| |||||||   0x180010f7a      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| ------`-> 0x180010f80      xor   eax, eax
| ||||||    0x180010f82      mov   qword [var_208h], rax
| ||||||    0x180010f87      test  rbx, rbx
| ||||||,=< 0x180010f8a      jnz   0x180010f99
| |||||||   0x180010f8c      mov   ebx, 0x117                          ; 279
| |||||||   0x180010f91      mov   rdi, r12
| ========< 0x180010f94      jmp   0x180011a18
| ||||||`-> 0x180010f99      mov   rcx, rbx
| ||||||    0x180010f9c      call  0x1800262b0
| ||||||    0x180010fa1      mov   edi, eax
| ||||||    0x180010fa3      test  eax, eax
| ||||||,=< 0x180010fa5      jns   0x180010fbc
| |||||||   0x180010fa7      mov   rsi, r12
| |||||||   0x180010faa      mov   rdi, r12
| |||||||   0x180010fad      mov   r12, qword [var_1c8h]
| |||||||   0x180010fb2      mov   ebx, 0x117                          ; 279
| ========< 0x180010fb7      jmp   0x180011503
| ||||||`-> 0x180010fbc      cmp   dword [rbx], r13d
| ||||||,=< 0x180010fbf      jl    0x180010fd0
| |||||||   0x180010fc1      sub   qword [rbx], 0x01
| ========< 0x180010fc5      jnz   0x180010fd0
| |||||||   0x180010fc7      mov   rcx, rbx
| |||||||   0x180010fca      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| ------`-> 0x180010fd0      test  edi, edi
| ||||||,=< 0x180010fd2      jz    0x180011160
| |||||||   0x180010fd8      mov   rdi, qword [var_1e8h]
| |||||||   0x180010fdd      mov   rdx, qword [0x1800310e0]            ; [0x1800310e0:8]=0
| |||||||   0x180010fe4      mov   rcx, rdi
| |||||||   0x180010fe7      mov   rax, qword [rdi+0x08]
| |||||||   0x180010feb      mov   r8, qword [rax+0x90]
| |||||||   0x180010ff2      test  r8, r8
| ========< 0x180010ff5      jz    0x180010ffc
| |||||||   0x180010ff7      call  r8
| ========< 0x180010ffa      jmp   0x180011002
| --------> 0x180010ffc      call  qword [sym.imp.python312.dll_PyObject_GetAttr] ; [0x180028168:8]=0x2d8b6
| |||||||   ; CODE XREF from fcn.18000ffd0 @ 0x180010ffa
| --------> 0x180011002      mov   r15, rax
| |||||||   0x180011005      test  rax, rax
| ========< 0x180011008      jnz   0x180011017
| |||||||   0x18001100a      mov   ebx, 0x118                          ; 280
| |||||||   0x18001100f      mov   rdi, r12
| ========< 0x180011012      jmp   0x180011a18
| --------> 0x180011017      mov   eax, dword [r15]
| |||||||   0x18001101a      mov   qword [var_208h], r15
| |||||||   0x18001101f      add   eax, 0x01
| ========< 0x180011022      jz    0x180011027
| |||||||   0x180011024      mov   dword [r15], eax
| --------> 0x180011027      mov   r8, qword [r14+0x08]
| |||||||   0x18001102b      mov   rax, qword [r8+0x70]
| |||||||   0x18001102f      test  rax, rax
| ========< 0x180011032      jz    0x180011136
| |||||||   0x180011038      mov   r9, qword [rax+0x08]
| |||||||   0x18001103c      test  r9, r9
| ========< 0x18001103f      jz    0x180011136
| |||||||   0x180011045      mov   rdx, qword [0x180030640]            ; [0x180030640:8]=0
| |||||||   0x18001104c      mov   rcx, r14
| |||||||   0x18001104f      call  r9
| |||||||   0x180011052      mov   r13, rax
| |||||||   0x180011055      test  rax, rax
| ========< 0x180011058      jz    0x180011153
| |||||||   0x18001105e      mov   rcx, qword [0x1800310c8]            ; [0x1800310c8:8]=0
| |||||||   0x180011065      lea   rdx, qword [var_1f8h]
| |||||||   0x18001106a      xor   r9d, r9d
| |||||||   0x18001106d      mov   qword [var_1f8h], r15
| |||||||   0x180011072      mov   r8, 0x8000000000000002
| |||||||   0x18001107c      mov   qword [var_1f0h], rax
| |||||||   0x180011081      call  qword [sym.imp.python312.dll_PyObject_VectorcallMethod] ; [0x1800283f8:8]=0x2df22 ; "\"\xdf\U00000002"
| |||||||   0x180011087      cmp   dword [r15], 0x00
| |||||||   0x18001108b      mov   rbx, rax
| |||||||   0x18001108e      mov   qword [var_1c8h], rax
| ========< 0x180011093      jl    0x1800110a4
| |||||||   0x180011095      sub   qword [r15], 0x01
| ========< 0x180011099      jnz   0x1800110a4
| |||||||   0x18001109b      mov   rcx, r15
| |||||||   0x18001109e      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x1800110a4      xor   edx, edx
| |||||||   0x1800110a6      mov   qword [var_208h], rdx
| |||||||   0x1800110ab      cmp   dword [r13], edx
| ========< 0x1800110af      jl    0x1800110c3
| |||||||   0x1800110b1      sub   qword [r13], 0x01
| ========< 0x1800110b6      jnz   0x1800110c3
| |||||||   0x1800110b8      mov   rcx, r13
| |||||||   0x1800110bb      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| |||||||   0x1800110c1      xor   edx, edx
| --------> 0x1800110c3      cmp   dword [r15], 0x00
| |||||||   0x1800110c7      mov   r13, rdx
| ========< 0x1800110ca      jl    0x1800110dd
| |||||||   0x1800110cc      sub   qword [r15], 0x01
| ========< 0x1800110d0      jnz   0x1800110dd
| |||||||   0x1800110d2      mov   rcx, r15
| |||||||   0x1800110d5      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| |||||||   0x1800110db      xor   edx, edx
| --------> 0x1800110dd      mov   r15, rdx
| |||||||   0x1800110e0      test  rbx, rbx
| ========< 0x1800110e3      jnz   0x1800110f2
| |||||||   0x1800110e5      mov   ebx, 0x118                          ; 280
| |||||||   0x1800110ea      mov   rdi, r12
| ========< 0x1800110ed      jmp   0x180011a18
| --------> 0x1800110f2      mov   rcx, rbx
| |||||||   0x1800110f5      call  qword [sym.imp.python312.dll_PyNumber_Invert] ; [0x180028350:8]=0x2dd58 ; "X\xdd\U00000002"
| |||||||   0x1800110fb      mov   r15, rax
| |||||||   0x1800110fe      test  rax, rax
| ========< 0x180011101      jnz   0x180011118
| |||||||   0x180011103      mov   rsi, r12
| |||||||   0x180011106      mov   rdi, r12
| |||||||   0x180011109      mov   r12, qword [var_1c8h]
| |||||||   0x18001110e      mov   ebx, 0x118                          ; 280
| ========< 0x180011113      jmp   0x180011503
| --------> 0x180011118      cmp   dword [rbx], 0x00
| ========< 0x18001111b      jl    0x18001112c
| |||||||   0x18001111d      sub   qword [rbx], 0x01
| ========< 0x180011121      jnz   0x18001112c
| |||||||   0x180011123      mov   rcx, rbx
| |||||||   0x180011126      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x18001112c      mov   rbx, qword [var_1d0h]
| ========< 0x180011131      jmp   0x180011d53
| --------> 0x180011136      mov   rcx, qword [sym.imp.python312.dll_PyExc_TypeError] ; [0x180028490:8]=0x2e0c0
| |||||||   0x18001113d      lea   rdx, qword str..200s__object_is_unsliceable ; 0x18002a2e8 ; "'%.200s' object is unsliceable"
| |||||||   0x180011144      mov   r8, qword [r8+0x18]
| |||||||   0x180011148      mov   rcx, qword [rcx]
| |||||||   0x18001114b      call  qword [sym.imp.python312.dll_PyErr_Format] ; [0x180028240:8]=0x2dabc
| |||||||   0x180011151      xor   eax, eax
| --------> 0x180011153      mov   ebx, 0x118                          ; 280
| |||||||   0x180011158      mov   rdi, r12
| ========< 0x18001115b      jmp   0x180011a18
| ||||||`-> 0x180011160      mov   eax, dword [r14]
| ||||||    0x180011163      add   eax, 0x01
| ||||||,=< 0x180011166      jz    0x18001116b
| |||||||   0x180011168      mov   dword [r14], eax
| ||||||`-> 0x18001116b      mov   rax, qword [0x1800307e8]            ; [0x1800307e8:8]=0
| ||||||    0x180011172      lea   rdx, qword [var_1c8h]
| ||||||    0x180011177      mov   rcx, qword [0x1800310c8]            ; [0x1800310c8:8]=0
| ||||||    0x18001117e      xor   r9d, r9d
| ||||||    0x180011181      mov   r8, 0x8000000000000002
| ||||||    0x18001118b      mov   qword [var_1c0h], rax
| ||||||    0x180011190      mov   qword [var_1c8h], r14
| ||||||    0x180011195      call  qword [sym.imp.python312.dll_PyObject_VectorcallMethod] ; [0x1800283f8:8]=0x2df22 ; "\"\xdf\U00000002"
| ||||||    0x18001119b      mov   r15, rax
| ||||||    0x18001119e      cmp   dword [r14], r13d
| ||||||,=< 0x1800111a1      jl    0x1800111b2
| |||||||   0x1800111a3      sub   qword [r14], 0x01
| ========< 0x1800111a7      jnz   0x1800111b2
| |||||||   0x1800111a9      mov   rcx, r14
| |||||||   0x1800111ac      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| ------`-> 0x1800111b2      test  r15, r15
| ||||||,=< 0x1800111b5      jnz   0x1800111c4
| |||||||   0x1800111b7      mov   ebx, 0x119                          ; 281
| |||||||   0x1800111bc      mov   rdi, r12
| ========< 0x1800111bf      jmp   0x180011a18
| ||||||`-> 0x1800111c4      mov   rcx, r15
| ||||||    0x1800111c7      call  0x1800262b0
| ||||||    0x1800111cc      mov   ebx, eax
| ||||||    0x1800111ce      test  eax, eax
| ||||||,=< 0x1800111d0      jns   0x1800111df
| |||||||   0x1800111d2      mov   ebx, 0x119                          ; 281
| |||||||   0x1800111d7      mov   rdi, r12
| ========< 0x1800111da      jmp   0x180011a18
| ||||||`-> 0x1800111df      cmp   dword [r15], r13d
| ||||||,=< 0x1800111e2      jl    0x1800111f3
| |||||||   0x1800111e4      sub   qword [r15], 0x01
| ========< 0x1800111e8      jnz   0x1800111f3
| |||||||   0x1800111ea      mov   rcx, r15
| |||||||   0x1800111ed      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| ------`-> 0x1800111f3      xor   edi, edi
| ||||||    0x1800111f5      mov   r15d, edi
| ||||||    0x1800111f8      test  ebx, ebx
| ||||||,=< 0x1800111fa      jz    0x18001152e
| |||||||   0x180011200      mov   rcx, qword [var_1e8h]
| |||||||   0x180011205      mov   rdx, qword [0x1800310e0]            ; [0x1800310e0:8]=0
| |||||||   0x18001120c      mov   rax, qword [rcx+0x08]
| |||||||   0x180011210      mov   r8, qword [rax+0x90]
| |||||||   0x180011217      test  r8, r8
| ========< 0x18001121a      jz    0x180011221
| |||||||   0x18001121c      call  r8
| ========< 0x18001121f      jmp   0x180011227
| --------> 0x180011221      call  qword [sym.imp.python312.dll_PyObject_GetAttr] ; [0x180028168:8]=0x2d8b6
| |||||||   ; CODE XREF from fcn.18000ffd0 @ 0x18001121f
| --------> 0x180011227      mov   r13, rax
| |||||||   0x18001122a      test  rax, rax
| ========< 0x18001122d      jnz   0x18001123c
| |||||||   0x18001122f      mov   ebx, 0x11a                          ; 282
| |||||||   0x180011234      mov   rdi, r12
| ========< 0x180011237      jmp   0x180011a18
| --------> 0x18001123c      mov   eax, dword [r13]
| |||||||   0x180011240      mov   r12, r13
| |||||||   0x180011243      add   eax, 0x01
| ========< 0x180011246      jz    0x18001124c
| |||||||   0x180011248      mov   dword [r13], eax
| --------> 0x18001124c      mov   rcx, qword [0x180030f78]            ; [0x180030f78:8]=0
| |||||||   0x180011253      mov   rsi, rdi
| |||||||   0x180011256      call  0x180020950
| |||||||   0x18001125b      mov   rdi, rax
| |||||||   0x18001125e      test  rax, rax
| ========< 0x180011261      jz    0x1800114fe
| |||||||   0x180011267      mov   rax, qword [rax+0x08]
| |||||||   0x18001126b      mov   rcx, rdi
| |||||||   0x18001126e      mov   rdx, qword [0x180030c38]            ; [0x180030c38:8]=0
| |||||||   0x180011275      mov   r8, qword [rax+0x90]
| |||||||   0x18001127c      test  r8, r8
| ========< 0x18001127f      jz    0x180011286
| |||||||   0x180011281      call  r8
| ========< 0x180011284      jmp   0x18001128c
| --------> 0x180011286      call  qword [sym.imp.python312.dll_PyObject_GetAttr] ; [0x180028168:8]=0x2d8b6
| |||||||   ; CODE XREF from fcn.18000ffd0 @ 0x180011284
| --------> 0x18001128c      mov   qword [var_218h], rax
| |||||||   0x180011291      mov   rbx, rax
| |||||||   0x180011294      mov   qword [var_200h], rax
| |||||||   0x180011299      test  rax, rax
| ========< 0x18001129c      jz    0x1800114fe
| |||||||   0x1800112a2      cmp   dword [rdi], esi
| ========< 0x1800112a4      jl    0x1800112b5
| |||||||   0x1800112a6      sub   qword [rdi], 0x01
| ========< 0x1800112aa      jnz   0x1800112b5
| |||||||   0x1800112ac      mov   rcx, rdi
| |||||||   0x1800112af      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x1800112b5      mov   r8, qword [r14+0x08]
| |||||||   0x1800112b9      mov   rax, qword [r8+0x70]
| |||||||   0x1800112bd      test  rax, rax
| ========< 0x1800112c0      jz    0x1800114df
| |||||||   0x1800112c6      mov   r9, qword [rax+0x08]
| |||||||   0x1800112ca      test  r9, r9
| ========< 0x1800112cd      jz    0x1800114df
| |||||||   0x1800112d3      mov   rdx, qword [0x180030648]            ; [0x180030648:8]=0
| |||||||   0x1800112da      mov   rcx, r14
| |||||||   0x1800112dd      call  r9
| |||||||   0x1800112e0      mov   rdi, rax
| |||||||   0x1800112e3      test  rax, rax
| ========< 0x1800112e6      jz    0x1800114fe
| |||||||   0x1800112ec      mov   rcx, qword [var_218h]
| |||||||   0x1800112f1      mov   edx, 0x01
| |||||||   0x1800112f6      mov   rax, qword [sym.imp.python312.dll_PyMethod_Type] ; [0x180028290:8]=0x2db7e ; "~\xdb\U00000002"
| |||||||   0x1800112fd      cmp   qword [rcx+0x08], rax
| ========< 0x180011301      jnz   0x18001132f
| |||||||   0x180011303      mov   rsi, qword [rcx+0x18]
| |||||||   0x180011307      mov   rbx, qword [rcx+0x10]
| |||||||   0x18001130b      mov   eax, dword [rsi]
| |||||||   0x18001130d      add   eax, edx
| ========< 0x18001130f      jz    0x180011313
| |||||||   0x180011311      mov   dword [rsi], eax
| --------> 0x180011313      mov   eax, dword [rbx]
| |||||||   0x180011315      add   eax, edx
| ========< 0x180011317      jz    0x18001131b
| |||||||   0x180011319      mov   dword [rbx], eax
| --------> 0x18001131b      cmp   dword [rcx], r15d
| ========< 0x18001131e      jl    0x18001132b
| |||||||   0x180011320      sub   qword [rcx], rdx
| ========< 0x180011323      jnz   0x18001132b
| |||||||   0x180011325      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x18001132b      xor   eax, eax
| |||||||   0x18001132d      mov   edx, eax
| --------> 0x18001132f      mov   rax, rdx
| |||||||   0x180011332      mov   qword [arg_10h], rsi
| |||||||   0x180011336      neg   rax
| |||||||   0x180011339      mov   qword [arg_18h], rdi
| |||||||   0x18001133d      shl   rax, 0x3f
| |||||||   0x180011341      mov   r8d, 0x02
| |||||||   0x180011347      sub   r8, rdx
| |||||||   0x18001134a      xor   r9d, r9d
| |||||||   0x18001134d      or    r8, rax
| |||||||   0x180011350      mov   rcx, rbx
| |||||||   0x180011353      lea   rax, qword [arg_10h]
| |||||||   0x180011357      lea   rdx, qword [rax+rdx*8]
| |||||||   0x18001135b      call  0x18001fee0
| |||||||   0x180011360      mov   qword [var_208h], rax
| |||||||   0x180011365      test  rsi, rsi
| ========< 0x180011368      jz    0x18001137e
| |||||||   0x18001136a      cmp   dword [rsi], r15d
| ========< 0x18001136d      jl    0x18001137e
| |||||||   0x18001136f      sub   qword [rsi], 0x01
| ========< 0x180011373      jnz   0x18001137e
| |||||||   0x180011375      mov   rcx, rsi
| |||||||   0x180011378      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x18001137e      xor   esi, esi
| |||||||   0x180011380      cmp   dword [rdi], esi
| ========< 0x180011382      jl    0x180011393
| |||||||   0x180011384      sub   qword [rdi], 0x01
| ========< 0x180011388      jnz   0x180011393
| |||||||   0x18001138a      mov   rcx, rdi
| |||||||   0x18001138d      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180011393      xor   edi, edi
| |||||||   0x180011395      cmp   dword [rbx], esi
| ========< 0x180011397      jl    0x1800113a8
| |||||||   0x180011399      sub   qword [rbx], 0x01
| ========< 0x18001139d      jnz   0x1800113a8
| |||||||   0x18001139f      mov   rcx, rbx
| |||||||   0x1800113a2      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x1800113a8      mov   rcx, qword [var_208h]
| |||||||   0x1800113ad      xor   ebx, ebx
| |||||||   0x1800113af      mov   qword [var_200h], rbx
| |||||||   0x1800113b4      test  rcx, rcx
| ========< 0x1800113b7      jz    0x1800114fe
| |||||||   0x1800113bd      mov   qword [arg_90h], rcx
| |||||||   0x1800113c4      xor   eax, eax
| |||||||   0x1800113c6      mov   ecx, 0x01
| |||||||   0x1800113cb      mov   qword [arg_98h], rax
| |||||||   0x1800113d2      mov   qword [arg_88h], r13
| |||||||   0x1800113d9      call  qword [sym.imp.python312.dll_PyTuple_New] ; [0x180028190:8]=0x2d916
| |||||||   0x1800113df      mov   qword [var_200h], rax
| |||||||   0x1800113e4      mov   rdx, rax
| |||||||   0x1800113e7      test  rax, rax
| ========< 0x1800113ea      jz    0x1800114fe
| |||||||   0x1800113f0      mov   rax, qword [0x180030af0]            ; [0x180030af0:8]=0
| |||||||   0x1800113f7      mov   r8, qword [sym.imp.python312.dll__Py_FalseStruct] ; [0x180028260:8]=0x2db02
| |||||||   0x1800113fe      mov   qword [rdx+0x18], rax
| |||||||   0x180011402      mov   ecx, dword [rax]
| |||||||   0x180011404      add   ecx, 0x01
| ========< 0x180011407      jz    0x18001140b
| |||||||   0x180011409      mov   dword [rax], ecx
| --------> 0x18001140b      mov   rcx, qword [0x180030b70]            ; [0x180030b70:8]=0
| |||||||   0x180011412      mov   r9, rdx
| |||||||   0x180011415      mov   qword [arg_98h], r8
| |||||||   0x18001141c      lea   rdx, qword [arg_88h]
| |||||||   0x180011423      mov   r8, 0x8000000000000002
| |||||||   0x18001142d      call  qword [sym.imp.python312.dll_PyObject_VectorcallMethod] ; [0x1800283f8:8]=0x2df22 ; "\"\xdf\U00000002"
| |||||||   0x180011433      mov   r15, rax
| |||||||   0x180011436      cmp   dword [r13], ebx
| ========< 0x18001143a      jl    0x18001144c
| |||||||   0x18001143c      sub   qword [r13], 0x01
| ========< 0x180011441      jnz   0x18001144c
| |||||||   0x180011443      mov   rcx, r13
| |||||||   0x180011446      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x18001144c      mov   rcx, qword [var_208h]
| |||||||   0x180011451      cmp   dword [rcx], ebx
| ========< 0x180011453      jl    0x180011461
| |||||||   0x180011455      sub   qword [rcx], 0x01
| ========< 0x180011459      jnz   0x180011461
| |||||||   0x18001145b      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180011461      mov   rdx, qword [var_200h]
| |||||||   0x180011466      mov   qword [var_208h], rbx
| |||||||   0x18001146b      cmp   dword [rdx], ebx
| ========< 0x18001146d      jl    0x18001147e
| |||||||   0x18001146f      sub   qword [rdx], 0x01
| ========< 0x180011473      jnz   0x18001147e
| |||||||   0x180011475      mov   rcx, rdx
| |||||||   0x180011478      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x18001147e      mov   qword [var_200h], rbx
| |||||||   0x180011483      cmp   dword [r13], ebx
| ========< 0x180011487      jl    0x180011499
| |||||||   0x180011489      sub   qword [r13], 0x01
| ========< 0x18001148e      jnz   0x180011499
| |||||||   0x180011490      mov   rcx, r13
| |||||||   0x180011493      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180011499      test  r15, r15
| ========< 0x18001149c      jnz   0x1800114a8
| |||||||   0x18001149e      mov   ebx, 0x11a                          ; 282
| ========< 0x1800114a3      jmp   0x180011cda
| --------> 0x1800114a8      mov   rcx, r15
| |||||||   0x1800114ab      call  qword [sym.imp.python312.dll_PyNumber_Invert] ; [0x180028350:8]=0x2dd58 ; "X\xdd\U00000002"
| |||||||   0x1800114b1      mov   r13, rax
| |||||||   0x1800114b4      test  rax, rax
| ========< 0x1800114b7      jnz   0x1800114c3
| |||||||   0x1800114b9      mov   ebx, 0x11a                          ; 282
| ========< 0x1800114be      jmp   0x180011b9e
| --------> 0x1800114c3      cmp   dword [r15], ebx
| ========< 0x1800114c6      jl    0x1800114d7
| |||||||   0x1800114c8      sub   qword [r15], 0x01
| ========< 0x1800114cc      jnz   0x1800114d7
| |||||||   0x1800114ce      mov   rcx, r15
| |||||||   0x1800114d1      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x1800114d7      mov   r15, r13
| ========< 0x1800114da      jmp   0x180011d4e
| --------> 0x1800114df      mov   rcx, qword [sym.imp.python312.dll_PyExc_TypeError] ; [0x180028490:8]=0x2e0c0
| |||||||   0x1800114e6      lea   rdx, qword str..200s__object_is_unsliceable ; 0x18002a2e8 ; "'%.200s' object is unsliceable"
| |||||||   0x1800114ed      mov   r8, qword [r8+0x18]
| |||||||   0x1800114f1      mov   rcx, qword [rcx]
| |||||||   0x1800114f4      call  qword [sym.imp.python312.dll_PyErr_Format] ; [0x180028240:8]=0x2dabc
| |||||||   0x1800114fa      xor   eax, eax
| |||||||   0x1800114fc      mov   edi, eax
| --------> 0x1800114fe      mov   ebx, 0x11a                          ; 282
| |||||||   ; XREFS(25)
| --------> 0x180011503      cmp   dword [r12], 0x00
| |||||||   0x180011508      mov   r14, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
| ========< 0x18001150f      jl    0x180011a22
| |||||||   0x180011515      sub   qword [r12], 0x01
| ========< 0x18001151a      jnz   0x180011a22
| |||||||   0x180011520      mov   rcx, r12
| |||||||   0x180011523      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| ========< 0x180011529      jmp   0x180011a22
| ||||||`-> 0x18001152e      mov   eax, dword [r14]
| ||||||    0x180011531      add   eax, 0x01
| ||||||,=< 0x180011534      jz    0x180011539
| |||||||   0x180011536      mov   dword [r14], eax
| ||||||`-> 0x180011539      mov   rax, qword [0x1800307f0]            ; [0x1800307f0:8]=0
| ||||||    0x180011540      lea   rdx, qword [arg_20h]
| ||||||    0x180011544      mov   rcx, qword [0x1800310c8]            ; [0x1800310c8:8]=0
| ||||||    0x18001154b      xor   r9d, r9d
| ||||||    0x18001154e      mov   r8, 0x8000000000000002
| ||||||    0x180011558      mov   qword [arg_28h], rax
| ||||||    0x18001155c      mov   qword [arg_20h], r14
| ||||||    0x180011560      call  qword [sym.imp.python312.dll_PyObject_VectorcallMethod] ; [0x1800283f8:8]=0x2df22 ; "\"\xdf\U00000002"
| ||||||    0x180011566      mov   r13, rax
| ||||||    0x180011569      cmp   dword [r14], edi
| ||||||,=< 0x18001156c      jl    0x18001157d
| |||||||   0x18001156e      sub   qword [r14], 0x01
| ========< 0x180011572      jnz   0x18001157d
| |||||||   0x180011574      mov   rcx, r14
| |||||||   0x180011577      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| ------`-> 0x18001157d      test  r13, r13
| ||||||,=< 0x180011580      jnz   0x18001158f
| |||||||   0x180011582      mov   ebx, 0x11b                          ; 283
| |||||||   0x180011587      mov   rdi, r12
| ========< 0x18001158a      jmp   0x180011a18
| ||||||`-> 0x18001158f      mov   rcx, r13
| ||||||    0x180011592      call  0x1800262b0
| ||||||    0x180011597      mov   ebx, eax
| ||||||    0x180011599      test  eax, eax
| ||||||,=< 0x18001159b      jns   0x1800115aa
| |||||||   0x18001159d      mov   ebx, 0x11b                          ; 283
| |||||||   0x1800115a2      mov   rdi, r12
| ========< 0x1800115a5      jmp   0x180011a18
| ||||||`-> 0x1800115aa      cmp   dword [r13], edi
| ||||||,=< 0x1800115ae      jl    0x1800115c0
| |||||||   0x1800115b0      sub   qword [r13], 0x01
| ========< 0x1800115b5      jnz   0x1800115c0
| |||||||   0x1800115b7      mov   rcx, r13
| |||||||   0x1800115ba      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| ------`-> 0x1800115c0      mov   r13, rdi
| ||||||    0x1800115c3      test  ebx, ebx
| ||||||,=< 0x1800115c5      jz    0x180011719
| |||||||   0x1800115cb      mov   rdi, qword [var_1e8h]
| |||||||   0x1800115d0      mov   rdx, qword [0x1800310e0]            ; [0x1800310e0:8]=0
| |||||||   0x1800115d7      mov   rcx, rdi
| |||||||   0x1800115da      mov   rax, qword [rdi+0x08]
| |||||||   0x1800115de      mov   r8, qword [rax+0x90]
| |||||||   0x1800115e5      test  r8, r8
| ========< 0x1800115e8      jz    0x1800115ef
| |||||||   0x1800115ea      call  r8
| ========< 0x1800115ed      jmp   0x1800115f5
| --------> 0x1800115ef      call  qword [sym.imp.python312.dll_PyObject_GetAttr] ; [0x180028168:8]=0x2d8b6
| |||||||   ; CODE XREF from fcn.18000ffd0 @ 0x1800115ed
| --------> 0x1800115f5      mov   qword [var_200h], rax
| |||||||   0x1800115fa      mov   rdx, rax
| |||||||   0x1800115fd      test  rax, rax
| ========< 0x180011600      jnz   0x18001160f
| |||||||   0x180011602      mov   ebx, 0x11c                          ; 284
| |||||||   0x180011607      mov   rdi, r12
| ========< 0x18001160a      jmp   0x180011a18
| --------> 0x18001160f      mov   eax, dword [rdx]
| |||||||   0x180011611      mov   r15, rdx
| |||||||   0x180011614      add   eax, 0x01
| ========< 0x180011617      jz    0x18001161b
| |||||||   0x180011619      mov   dword [rdx], eax
| --------> 0x18001161b      mov   r8, qword [r14+0x08]
| |||||||   0x18001161f      mov   rax, qword [r8+0x70]
| |||||||   0x180011623      test  rax, rax
| ========< 0x180011626      jz    0x1800116ea
| |||||||   0x18001162c      mov   r9, qword [rax+0x08]
| |||||||   0x180011630      test  r9, r9
| ========< 0x180011633      jz    0x1800116ea
| |||||||   0x180011639      mov   rdx, qword [0x180030648]            ; [0x180030648:8]=0
| |||||||   0x180011640      mov   rcx, r14
| |||||||   0x180011643      call  r9
| |||||||   0x180011646      mov   qword [var_208h], rax
| |||||||   0x18001164b      test  rax, rax
| ========< 0x18001164e      jz    0x18001170c
| |||||||   0x180011654      mov   rbx, qword [var_200h]
| |||||||   0x180011659      lea   rdx, qword [arg_30h]
| |||||||   0x18001165d      mov   rcx, qword [0x1800310c8]            ; [0x1800310c8:8]=0
| |||||||   0x180011664      xor   r9d, r9d
| |||||||   0x180011667      mov   r8, 0x8000000000000002
| |||||||   0x180011671      mov   qword [arg_30h], rbx
| |||||||   0x180011675      mov   qword [arg_38h], rax
| |||||||   0x180011679      call  qword [sym.imp.python312.dll_PyObject_VectorcallMethod] ; [0x1800283f8:8]=0x2df22 ; "\"\xdf\U00000002"
| |||||||   0x18001167f      cmp   dword [rbx], 0x00
| |||||||   0x180011682      mov   r13, rax
| ========< 0x180011685      jl    0x180011696
| |||||||   0x180011687      sub   qword [rbx], 0x01
| ========< 0x18001168b      jnz   0x180011696
| |||||||   0x18001168d      mov   rcx, rbx
| |||||||   0x180011690      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180011696      mov   rcx, qword [var_208h]
| |||||||   0x18001169b      xor   esi, esi
| |||||||   0x18001169d      mov   r15d, esi
| |||||||   0x1800116a0      cmp   dword [rcx], esi
| ========< 0x1800116a2      jl    0x1800116b0
| |||||||   0x1800116a4      sub   qword [rcx], 0x01
| ========< 0x1800116a8      jnz   0x1800116b0
| |||||||   0x1800116aa      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x1800116b0      mov   qword [var_208h], rsi
| |||||||   0x1800116b5      cmp   dword [rbx], esi
| ========< 0x1800116b7      jl    0x1800116c8
| |||||||   0x1800116b9      sub   qword [rbx], 0x01
| ========< 0x1800116bd      jnz   0x1800116c8
| |||||||   0x1800116bf      mov   rcx, rbx
| |||||||   0x1800116c2      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x1800116c8      mov   qword [var_200h], rsi
| |||||||   0x1800116cd      test  r13, r13
| ========< 0x1800116d0      jnz   0x1800116df
| |||||||   0x1800116d2      mov   ebx, 0x11c                          ; 284
| |||||||   0x1800116d7      mov   rdi, r12
| ========< 0x1800116da      jmp   0x180011a18
| --------> 0x1800116df      mov   r15, r13
| |||||||   0x1800116e2      mov   rbx, rsi
| ========< 0x1800116e5      jmp   0x180011d53
| --------> 0x1800116ea      mov   rcx, qword [sym.imp.python312.dll_PyExc_TypeError] ; [0x180028490:8]=0x2e0c0
| |||||||   0x1800116f1      lea   rdx, qword str..200s__object_is_unsliceable ; 0x18002a2e8 ; "'%.200s' object is unsliceable"
| |||||||   0x1800116f8      mov   r8, qword [r8+0x18]
| |||||||   0x1800116fc      mov   rcx, qword [rcx]
| |||||||   0x1800116ff      call  qword [sym.imp.python312.dll_PyErr_Format] ; [0x180028240:8]=0x2dabc
| |||||||   0x180011705      xor   eax, eax
| |||||||   0x180011707      mov   qword [var_208h], rax
| --------> 0x18001170c      mov   ebx, 0x11c                          ; 284
| |||||||   0x180011711      mov   rdi, r12
| ========< 0x180011714      jmp   0x180011a18
| ||||||`-> 0x180011719      mov   eax, dword [r14]
| ||||||    0x18001171c      add   eax, 0x01
| ||||||,=< 0x18001171f      jz    0x180011724
| |||||||   0x180011721      mov   dword [r14], eax
| ||||||`-> 0x180011724      mov   rax, qword [0x1800307f8]            ; [0x1800307f8:8]=0
| ||||||    0x18001172b      lea   rdx, qword [arg_40h]
| ||||||    0x18001172f      mov   rcx, qword [0x1800310c8]            ; [0x1800310c8:8]=0
| ||||||    0x180011736      xor   r9d, r9d
| ||||||    0x180011739      mov   r8, 0x8000000000000002
| ||||||    0x180011743      mov   qword [arg_48h], rax
| ||||||    0x180011747      mov   qword [arg_40h], r14
| ||||||    0x18001174b      call  qword [sym.imp.python312.dll_PyObject_VectorcallMethod] ; [0x1800283f8:8]=0x2df22 ; "\"\xdf\U00000002"
| ||||||    0x180011751      mov   r13, rax
| ||||||    0x180011754      cmp   dword [r14], edi
| ||||||,=< 0x180011757      jl    0x180011768
| |||||||   0x180011759      sub   qword [r14], 0x01
| ========< 0x18001175d      jnz   0x180011768
| |||||||   0x18001175f      mov   rcx, r14
| |||||||   0x180011762      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| ------`-> 0x180011768      mov   qword [var_200h], rdi
| ||||||    0x18001176d      test  r13, r13
| ||||||,=< 0x180011770      jnz   0x18001177f
| |||||||   0x180011772      mov   ebx, 0x11d                          ; 285
| |||||||   0x180011777      mov   rdi, r12
| ========< 0x18001177a      jmp   0x180011a18
| ||||||`-> 0x18001177f      mov   rcx, r13
| ||||||    0x180011782      call  0x1800262b0
| ||||||    0x180011787      mov   ebx, eax
| ||||||    0x180011789      test  eax, eax
| ||||||,=< 0x18001178b      jns   0x18001179a
| |||||||   0x18001178d      mov   ebx, 0x11d                          ; 285
| |||||||   0x180011792      mov   rdi, r12
| ========< 0x180011795      jmp   0x180011a18
| ||||||`-> 0x18001179a      cmp   dword [r13], edi
| ||||||,=< 0x18001179e      jl    0x1800117b0
| |||||||   0x1800117a0      sub   qword [r13], 0x01
| ========< 0x1800117a5      jnz   0x1800117b0
| |||||||   0x1800117a7      mov   rcx, r13
| |||||||   0x1800117aa      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| ------`-> 0x1800117b0      test  ebx, ebx
| ||||||,=< 0x1800117b2      jz    0x180011864
| |||||||   0x1800117b8      mov   r8, qword [r14+0x08]
| |||||||   0x1800117bc      mov   rax, qword [r8+0x70]
| |||||||   0x1800117c0      test  rax, rax
| ========< 0x1800117c3      jz    0x180011839
| |||||||   0x1800117c5      mov   r9, qword [rax+0x08]
| |||||||   0x1800117c9      test  r9, r9
| ========< 0x1800117cc      jz    0x180011839
| |||||||   0x1800117ce      mov   rdx, qword [0x180030648]            ; [0x180030648:8]=0
| |||||||   0x1800117d5      mov   rcx, r14
| |||||||   0x1800117d8      call  r9
| |||||||   0x1800117db      mov   r13, rax
| |||||||   0x1800117de      test  rax, rax
| ========< 0x1800117e1      jz    0x180011857
| |||||||   0x1800117e3      mov   rdi, qword [var_1e8h]
| |||||||   0x1800117e8      mov   r8d, esi
| |||||||   0x1800117eb      mov   rcx, rdi
| |||||||   0x1800117ee      mov   rdx, rax
| |||||||   0x1800117f1      call  qword [sym.imp.python312.dll_PyObject_RichCompare] ; [0x180028250:8]=0x2dada
| |||||||   0x1800117f7      mov   qword [var_200h], rax
| |||||||   0x1800117fc      mov   rdx, rax
| |||||||   0x1800117ff      test  rax, rax
| ========< 0x180011802      jnz   0x180011811
| |||||||   0x180011804      mov   ebx, 0x11e                          ; 286
| |||||||   0x180011809      mov   rdi, r12
| ========< 0x18001180c      jmp   0x180011a18
| --------> 0x180011811      cmp   dword [r13], r15d
| ========< 0x180011815      jl    0x18001182c
| |||||||   0x180011817      sub   qword [r13], 0x01
| ========< 0x18001181c      jnz   0x18001182c
| |||||||   0x18001181e      mov   rcx, r13
| |||||||   0x180011821      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| |||||||   0x180011827      mov   rdx, qword [var_200h]
| --------> 0x18001182c      mov   rbx, qword [var_1d0h]
| |||||||   0x180011831      mov   r15, rdx
| ========< 0x180011834      jmp   0x180011d53
| --------> 0x180011839      mov   rcx, qword [sym.imp.python312.dll_PyExc_TypeError] ; [0x180028490:8]=0x2e0c0
| |||||||   0x180011840      lea   rdx, qword str..200s__object_is_unsliceable ; 0x18002a2e8 ; "'%.200s' object is unsliceable"
| |||||||   0x180011847      mov   r8, qword [r8+0x18]
| |||||||   0x18001184b      mov   rcx, qword [rcx]
| |||||||   0x18001184e      call  qword [sym.imp.python312.dll_PyErr_Format] ; [0x180028240:8]=0x2dabc
| |||||||   0x180011854      mov   r13, rdi
| --------> 0x180011857      mov   ebx, 0x11e                          ; 286
| |||||||   0x18001185c      mov   rdi, r12
| ========< 0x18001185f      jmp   0x180011a18
| ||||||`-> 0x180011864      mov   eax, dword [r14]
| ||||||    0x180011867      add   eax, 0x01
| ||||||,=< 0x18001186a      jz    0x18001186f
| |||||||   0x18001186c      mov   dword [r14], eax
| ||||||`-> 0x18001186f      mov   rax, qword [0x1800307b0]            ; [0x1800307b0:8]=0
| ||||||    0x180011876      lea   rdx, qword [arg_50h]
| ||||||    0x18001187a      mov   rcx, qword [0x1800310c8]            ; [0x1800310c8:8]=0
| ||||||    0x180011881      xor   r9d, r9d
| ||||||    0x180011884      mov   r8, 0x8000000000000002
| ||||||    0x18001188e      mov   qword [arg_58h], rax
| ||||||    0x180011892      mov   qword [arg_50h], r14
| ||||||    0x180011896      call  qword [sym.imp.python312.dll_PyObject_VectorcallMethod] ; [0x1800283f8:8]=0x2df22 ; "\"\xdf\U00000002"
| ||||||    0x18001189c      mov   rdx, rax
| ||||||    0x18001189f      mov   qword [var_200h], rax
| ||||||    0x1800118a4      cmp   dword [r14], edi
| ||||||,=< 0x1800118a7      jl    0x1800118bd
| |||||||   0x1800118a9      sub   qword [r14], 0x01
| ========< 0x1800118ad      jnz   0x1800118bd
| |||||||   0x1800118af      mov   rcx, r14
| |||||||   0x1800118b2      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| |||||||   0x1800118b8      mov   rdx, qword [var_200h]
| ------`-> 0x1800118bd      mov   r13, rdi
| ||||||    0x1800118c0      test  rdx, rdx
| ||||||,=< 0x1800118c3      jnz   0x1800118d2
| |||||||   0x1800118c5      mov   ebx, 0x11f                          ; 287
| |||||||   0x1800118ca      mov   rdi, r12
| ========< 0x1800118cd      jmp   0x180011a18
| ||||||`-> 0x1800118d2      mov   rcx, rdx
| ||||||    0x1800118d5      call  0x1800262b0
| ||||||    0x1800118da      mov   ebx, eax
| ||||||    0x1800118dc      test  eax, eax
| ||||||,=< 0x1800118de      jns   0x1800118ed
| |||||||   0x1800118e0      mov   ebx, 0x11f                          ; 287
| |||||||   0x1800118e5      mov   rdi, r12
| ========< 0x1800118e8      jmp   0x180011a18
| ||||||`-> 0x1800118ed      mov   rdx, qword [var_200h]
| ||||||    0x1800118f2      cmp   dword [rdx], edi
| ||||||,=< 0x1800118f4      jl    0x180011905
| |||||||   0x1800118f6      sub   qword [rdx], 0x01
| ========< 0x1800118fa      jnz   0x180011905
| |||||||   0x1800118fc      mov   rcx, rdx
| |||||||   0x1800118ff      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| ------`-> 0x180011905      mov   qword [var_200h], rdi
| ||||||    0x18001190a      test  ebx, ebx
| ||||||,=< 0x18001190c      jz    0x1800119b8
| |||||||   0x180011912      mov   r8, qword [r14+0x08]
| |||||||   0x180011916      mov   rax, qword [r8+0x70]
| |||||||   0x18001191a      test  rax, rax
| ========< 0x18001191d      jz    0x18001198e
| |||||||   0x18001191f      mov   r9, qword [rax+0x08]
| |||||||   0x180011923      test  r9, r9
| ========< 0x180011926      jz    0x18001198e
| |||||||   0x180011928      mov   rdx, qword [0x180030648]            ; [0x180030648:8]=0
| |||||||   0x18001192f      mov   rcx, r14
| |||||||   0x180011932      call  r9
| |||||||   0x180011935      mov   qword [var_200h], rax
| |||||||   0x18001193a      mov   rdx, rax
| |||||||   0x18001193d      test  rax, rax
| ========< 0x180011940      jz    0x1800119ae
| |||||||   0x180011942      mov   rdi, qword [var_1e8h]
| |||||||   0x180011947      mov   r8d, esi
| |||||||   0x18001194a      mov   rcx, rdi
| |||||||   0x18001194d      call  qword [sym.imp.python312.dll_PyObject_RichCompare] ; [0x180028250:8]=0x2dada
| |||||||   0x180011953      mov   r13, rax
| |||||||   0x180011956      test  rax, rax
| ========< 0x180011959      jnz   0x180011968
| |||||||   0x18001195b      mov   ebx, 0x120                          ; 288
| |||||||   0x180011960      mov   rdi, r12
| ========< 0x180011963      jmp   0x180011a18
| --------> 0x180011968      mov   rdx, qword [var_200h]
| |||||||   0x18001196d      cmp   dword [rdx], r15d
| ========< 0x180011970      jl    0x180011981
| |||||||   0x180011972      sub   qword [rdx], 0x01
| ========< 0x180011976      jnz   0x180011981
| |||||||   0x180011978      mov   rcx, rdx
| |||||||   0x18001197b      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180011981      mov   rbx, qword [var_1d0h]
| |||||||   0x180011986      mov   r15, r13
| ========< 0x180011989      jmp   0x180011d53
| --------> 0x18001198e      mov   rcx, qword [sym.imp.python312.dll_PyExc_TypeError] ; [0x180028490:8]=0x2e0c0
| |||||||   0x180011995      lea   rdx, qword str..200s__object_is_unsliceable ; 0x18002a2e8 ; "'%.200s' object is unsliceable"
| |||||||   0x18001199c      mov   r8, qword [r8+0x18]
| |||||||   0x1800119a0      mov   rcx, qword [rcx]
| |||||||   0x1800119a3      call  qword [sym.imp.python312.dll_PyErr_Format] ; [0x180028240:8]=0x2dabc
| |||||||   0x1800119a9      mov   qword [var_200h], rdi
| --------> 0x1800119ae      mov   ebx, 0x120                          ; 288
| |||||||   0x1800119b3      mov   rdi, r12
| ========< 0x1800119b6      jmp   0x180011a18
| ||||||`-> 0x1800119b8      mov   rcx, qword [var_1e8h]
| ||||||    0x1800119bd      mov   rdx, qword [0x1800310e0]            ; [0x1800310e0:8]=0
| ||||||    0x1800119c4      mov   rax, qword [rcx+0x08]
| ||||||    0x1800119c8      mov   r8, qword [rax+0x90]
| ||||||    0x1800119cf      test  r8, r8
| ||||||,=< 0x1800119d2      jz    0x1800119d9
| |||||||   0x1800119d4      call  r8
| ========< 0x1800119d7      jmp   0x1800119df
| ||||||`-> 0x1800119d9      call  qword [sym.imp.python312.dll_PyObject_GetAttr] ; [0x180028168:8]=0x2d8b6
| ||||||    ; CODE XREF from fcn.18000ffd0 @ 0x1800119d7
| --------> 0x1800119df      mov   qword [var_208h], rax
| ||||||    0x1800119e4      mov   rcx, rax
| ||||||    0x1800119e7      test  rax, rax
| ||||||,=< 0x1800119ea      jnz   0x1800119f1
| |||||||   0x1800119ec      mov   rdi, r12
| ========< 0x1800119ef      jmp   0x180011a13
| ||||||`-> 0x1800119f1      mov   eax, dword [rcx]
| ||||||    0x1800119f3      mov   qword [var_200h], rcx
| ||||||    0x1800119f8      add   eax, 0x01
| ||||||,=< 0x1800119fb      jz    0x1800119ff
| |||||||   0x1800119fd      mov   dword [rcx], eax
| ||||||`-> 0x1800119ff      mov   rcx, qword [0x180030f78]            ; [0x180030f78:8]=0
| ||||||    0x180011a06      call  0x180020950
| ||||||    0x180011a0b      mov   rdi, rax
| ||||||    0x180011a0e      test  rax, rax
| ||||||,=< 0x180011a11      jnz   0x180011a49
| |||||||   ; CODE XREF from fcn.18000ffd0 @ 0x1800119ef
| --------> 0x180011a13      mov   ebx, 0x122                          ; 290
| |||||||   ; XREFS(22)
| --------> 0x180011a18      mov   r14, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
| |||||||   0x180011a1f      mov   rsi, r12
| |||||||   ; CODE XREF from fcn.18000ffd0 @ 0x180011529
| --------> 0x180011a22      test  rsi, rsi
| ========< 0x180011a25      jz    0x180011a3b
| |||||||   ; CODE XREFS from fcn.18000ffd0 @ 0x180010188, 0x180010ae3, 0x180010bb2, 0x180010c37
| --`-----> 0x180011a27      cmp   dword [rsi], 0x00
| ||,=====< 0x180011a2a      jl    0x180011a3b
| |||||||   0x180011a2c      sub   qword [rsi], 0x01
| ========< 0x180011a30      jnz   0x180011a3b
| |||||||   0x180011a32      mov   rcx, rsi
| |||||||   0x180011a35      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --`-----> 0x180011a3b      test  r15, r15
| ||,=====< 0x180011a3e      jz    0x180011bba
| ========< 0x180011a44      jmp   0x180011ba5
| ||||||`-> 0x180011a49      mov   rax, qword [rax+0x08]
| ||||||    0x180011a4d      mov   rcx, rdi
| ||||||    0x180011a50      mov   rdx, qword [0x180030c38]            ; [0x180030c38:8]=0
| ||||||    0x180011a57      mov   r8, qword [rax+0x90]
| ||||||    0x180011a5e      test  r8, r8
| ||||||,=< 0x180011a61      jz    0x180011a68
| |||||||   0x180011a63      call  r8
| ========< 0x180011a66      jmp   0x180011a6e
| ||||||`-> 0x180011a68      call  qword [sym.imp.python312.dll_PyObject_GetAttr] ; [0x180028168:8]=0x2d8b6
| ||||||    ; CODE XREF from fcn.18000ffd0 @ 0x180011a66
| --------> 0x180011a6e      mov   rbx, rax
| ||||||    0x180011a71      mov   rsi, rax
| ||||||    0x180011a74      test  rax, rax
| ||||||,=< 0x180011a77      jnz   0x180011a8a
| |||||||   0x180011a79      mov   r14, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
| |||||||   0x180011a80      mov   ebx, 0x122                          ; 290
| ========< 0x180011a85      jmp   0x180011bbf
| ||||||`-> 0x180011a8a      cmp   dword [rdi], r13d
| ||||||,=< 0x180011a8d      jl    0x180011a9e
| |||||||   0x180011a8f      sub   qword [rdi], 0x01
| ========< 0x180011a93      jnz   0x180011a9e
| |||||||   0x180011a95      mov   rcx, rdi
| |||||||   0x180011a98      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| ------`-> 0x180011a9e      mov   rax, qword [sym.imp.python312.dll_PyMethod_Type] ; [0x180028290:8]=0x2db7e ; "~\xdb\U00000002"
| ||||||    0x180011aa5      mov   rdi, r15
| ||||||    0x180011aa8      mov   ecx, 0x01
| ||||||    0x180011aad      cmp   qword [rbx+0x08], rax
| ||||||,=< 0x180011ab1      jnz   0x180011ae6
| |||||||   0x180011ab3      mov   r12, qword [rbx+0x18]
| |||||||   0x180011ab7      mov   rsi, qword [rbx+0x10]
| |||||||   0x180011abb      mov   eax, dword [r12]
| |||||||   0x180011abf      add   eax, ecx
| ========< 0x180011ac1      jz    0x180011ac7
| |||||||   0x180011ac3      mov   dword [r12], eax
| --------> 0x180011ac7      mov   eax, dword [rsi]
| |||||||   0x180011ac9      add   eax, ecx
| ========< 0x180011acb      jz    0x180011acf
| |||||||   0x180011acd      mov   dword [rsi], eax
| --------> 0x180011acf      cmp   dword [rbx], edi
| ========< 0x180011ad1      jl    0x180011ae1
| |||||||   0x180011ad3      sub   qword [rbx], rcx
| ========< 0x180011ad6      jnz   0x180011ae1
| |||||||   0x180011ad8      mov   rcx, rbx
| |||||||   0x180011adb      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --------> 0x180011ae1      mov   rcx, r15
| ========< 0x180011ae4      jmp   0x180011ae9
| ||||||`-> 0x180011ae6      mov   r12, rdi
| ||||||    ; CODE XREF from fcn.18000ffd0 @ 0x180011ae4
| --------> 0x180011ae9      mov   rax, rcx
| ||||||    0x180011aec      mov   qword [arg_60h], r12
| ||||||    0x180011af0      neg   rax
| ||||||    0x180011af3      mov   qword [arg_68h], r14
| ||||||    0x180011af7      shl   rax, 0x3f
| ||||||    0x180011afb      lea   rdx, qword [arg_60h]
| ||||||    0x180011aff      lea   rdx, qword [rdx+rcx*8]
| ||||||    0x180011b03      mov   r8d, 0x02
| ||||||    0x180011b09      sub   r8, rcx
| ||||||    0x180011b0c      xor   r9d, r9d
| ||||||    0x180011b0f      or    r8, rax
| ||||||    0x180011b12      mov   rcx, rsi
| ||||||    0x180011b15      call  0x18001fee0
| ||||||    0x180011b1a      mov   r15, rax
| ||||||    0x180011b1d      test  r12, r12
| ||||||,=< 0x180011b20      jz    0x180011b38
| |||||||   0x180011b22      cmp   dword [r12], edi
| ========< 0x180011b26      jl    0x180011b38
| |||||||   0x180011b28      sub   qword [r12], 0x01
| ========< 0x180011b2d      jnz   0x180011b38
| |||||||   0x180011b2f      mov   rcx, r12
| |||||||   0x180011b32      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| ------`-> 0x180011b38      cmp   dword [rsi], edi
| ||||||,=< 0x180011b3a      jl    0x180011b4b
| |||||||   0x180011b3c      sub   qword [rsi], 0x01
| ========< 0x180011b40      jnz   0x180011b4b
| |||||||   0x180011b42      mov   rcx, rsi
| |||||||   0x180011b45      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| ------`-> 0x180011b4b      test  r15, r15
| ||||||,=< 0x180011b4e      jnz   0x180011b66
| |||||||   0x180011b50      mov   r14, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
| |||||||   0x180011b57      mov   ebx, 0x122                          ; 290
| |||||||   0x180011b5c      mov   rcx, qword [var_208h]
| ========< 0x180011b61      jmp   0x180011bf9
| ||||||`-> 0x180011b66      mov   r12, qword [var_208h]
| ||||||    0x180011b6b      xor   eax, eax
| ||||||    0x180011b6d      mov   ecx, 0x01
| ||||||    0x180011b72      mov   qword [arg_a0h], r12
| ||||||    0x180011b79      mov   qword [arg_b0h], rax
| ||||||    0x180011b80      mov   qword [arg_a8h], r15
| ||||||    0x180011b87      call  qword [sym.imp.python312.dll_PyTuple_New] ; [0x180028190:8]=0x2d916
| ||||||    0x180011b8d      mov   rbx, rax
| ||||||    0x180011b90      test  rax, rax
| ||||||,=< 0x180011b93      jnz   0x180011c36
| |||||||   0x180011b99      mov   ebx, 0x122                          ; 290
| |||||||   ; CODE XREFS from fcn.18000ffd0 @ 0x1800102cd, 0x180010b14, 0x180010b36, 0x180010dd8, 0x1800114be
| --------> 0x180011b9e      mov   r14, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
| |||||||   ; CODE XREF from fcn.18000ffd0 @ 0x180011a44
| --------> 0x180011ba5      cmp   dword [r15], 0x00
| ========< 0x180011ba9      jl    0x180011bba
| |||||||   0x180011bab      sub   qword [r15], 0x01
| ========< 0x180011baf      jnz   0x180011bba
| |||||||   0x180011bb1      mov   rcx, r15
| |||||||   0x180011bb4      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --`-----> 0x180011bba      test  rdi, rdi
| ||,=====< 0x180011bbd      jz    0x180011bd3
| |||||||   ; CODE XREF from fcn.18000ffd0 @ 0x180011a85
| --------> 0x180011bbf      cmp   dword [rdi], 0x00
| ========< 0x180011bc2      jl    0x180011bd3
| |||||||   0x180011bc4      sub   qword [rdi], 0x01
| ========< 0x180011bc8      jnz   0x180011bd3
| |||||||   0x180011bca      mov   rcx, rdi
| |||||||   0x180011bcd      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --`-----> 0x180011bd3      test  r13, r13
| ||,=====< 0x180011bd6      jz    0x180011bef
| |||||||   0x180011bd8      cmp   dword [r13], 0x00
| ========< 0x180011bdd      jl    0x180011bef
| |||||||   0x180011bdf      sub   qword [r13], 0x01
| ========< 0x180011be4      jnz   0x180011bef
| |||||||   0x180011be6      mov   rcx, r13
| |||||||   0x180011be9      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --`-----> 0x180011bef      mov   rcx, qword [var_208h]
| || ||||   0x180011bf4      test  rcx, rcx
| ||,=====< 0x180011bf7      jz    0x180011c0a
| |||||||   ; CODE XREF from fcn.18000ffd0 @ 0x180011b61
| --------> 0x180011bf9      cmp   dword [rcx], 0x00
| ========< 0x180011bfc      jl    0x180011c0a
| |||||||   0x180011bfe      sub   qword [rcx], 0x01
| ========< 0x180011c02      jnz   0x180011c0a
| |||||||   0x180011c04      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| --`-----> 0x180011c0a      mov   rcx, qword [var_200h]
| || ||||   0x180011c0f      test  rcx, rcx
| ||,=====< 0x180011c12      jz    0x180011ce1
| |||||||   0x180011c18      cmp   dword [rcx], 0x00
| ========< 0x180011c1b      jl    0x180011ce1
| |||||||   0x180011c21      sub   qword [rcx], 0x01
| ========< 0x180011c25      jnz   0x180011ce1
| |||||||   0x180011c2b      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| ========< 0x180011c31      jmp   0x180011ce1
| ||||||`-> 0x180011c36      mov   rax, qword [0x180030af0]            ; [0x180030af0:8]=0
| ||||||    0x180011c3d      mov   rdx, qword [sym.imp.python312.dll__Py_FalseStruct] ; [0x180028260:8]=0x2db02
| ||||||    0x180011c44      mov   qword [rbx+0x18], rax
| ||||||    0x180011c48      mov   ecx, dword [rax]
| ||||||    0x180011c4a      add   ecx, 0x01
| ||||||,=< 0x180011c4d      jz    0x180011c51
| |||||||   0x180011c4f      mov   dword [rax], ecx
| ||||||`-> 0x180011c51      mov   rcx, qword [0x180030b70]            ; [0x180030b70:8]=0
| ||||||    0x180011c58      mov   r9, rbx
| ||||||    0x180011c5b      mov   qword [arg_b0h], rdx
| ||||||    0x180011c62      mov   r8, 0x8000000000000002
| ||||||    0x180011c6c      lea   rdx, qword [arg_a0h]
| ||||||    0x180011c73      call  qword [sym.imp.python312.dll_PyObject_VectorcallMethod] ; [0x1800283f8:8]=0x2df22 ; "\"\xdf\U00000002"
| ||||||    0x180011c79      mov   rdi, rax
| ||||||    0x180011c7c      cmp   dword [r12], r13d
| ||||||,=< 0x180011c80      jl    0x180011c92
| |||||||   0x180011c82      sub   qword [r12], 0x01
| ========< 0x180011c87      jnz   0x180011c92
| |||||||   0x180011c89      mov   rcx, r12
| |||||||   0x180011c8c      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| ------`-> 0x180011c92      cmp   dword [r15], r13d
| ||||||,=< 0x180011c95      jl    0x180011ca6
| |||||||   0x180011c97      sub   qword [r15], 0x01
| ========< 0x180011c9b      jnz   0x180011ca6
| |||||||   0x180011c9d      mov   rcx, r15
| |||||||   0x180011ca0      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| ------`-> 0x180011ca6      cmp   dword [rbx], r13d
| ||||||,=< 0x180011ca9      jl    0x180011cba
| |||||||   0x180011cab      sub   qword [rbx], 0x01
| ========< 0x180011caf      jnz   0x180011cba
| |||||||   0x180011cb1      mov   rcx, rbx
| |||||||   0x180011cb4      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| ------`-> 0x180011cba      cmp   dword [r12], r13d
| ||||||,=< 0x180011cbe      jl    0x180011cd0
| |||||||   0x180011cc0      sub   qword [r12], 0x01
| ========< 0x180011cc5      jnz   0x180011cd0
| |||||||   0x180011cc7      mov   rcx, r12
| |||||||   0x180011cca      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
| ------`-> 0x180011cd0      test  rdi, rdi
| ||||||,=< 0x180011cd3      jnz   0x180011d46
| |||||||   0x180011cd5      mov   ebx, 0x122                          ; 290
| |||||||   ; XREFS: CODE 0x180010147  CODE 0x18001026a  CODE 0x180010293
| |||||||   ; XREFS: CODE 0x1800103b1  CODE 0x1800103cb  CODE 0x1800103f4
| |||||||   ; XREFS: CODE 0x180010465  CODE 0x1800104bc  CODE 0x180010578
| |||||||   ; XREFS: CODE 0x180010598  CODE 0x1800105fd  CODE 0x1800106db
| |||||||   ; XREFS: CODE 0x180010aa2  CODE 0x180010d0b  CODE 0x180010d97
| |||||||   ; XREFS: CODE 0x180010df2  CODE 0x1800114a3
| ``-`----> 0x180011cda      mov   r14, qword [0x18002af98]            ; [0x18002af98:8]=0x1800287d0 str.modules_jet_test__core.py
|   | |||   ; CODE XREF from fcn.18000ffd0 @ 0x180011c31
| --`-----> 0x180011ce1      mov   rdi, qword [var_210h]
|     |||   ; CODE XREFS from fcn.18000ffd0 @ 0x180010098, 0x18001010b
|     ``--> 0x180011ce6      mov   rax, qword [var_1d0h]
|       |   0x180011ceb      lea   rcx, qword str.modules.jet_test._core._check_single_item ; 0x180028c28 ; "modules.jet_test._core._check_single_item"
|       |   0x180011cf2      mov   r13, qword [var_1d8h]
|       |   0x180011cf7      mov   r9, r14
|       |   0x180011cfa      mov   qword [var_1d0h], rax
|       |   0x180011cff      mov   r8d, ebx
|       |   0x180011d02      mov   rax, qword [var_80h]
|       |   0x180011d06      mov   qword [var_80h], rax
|       |   0x180011d0a      mov   rax, qword [var_78h]
|       |   0x180011d0e      mov   qword [var_78h], rax
|       |   0x180011d12      mov   rax, qword [var_1e0h]
|       |   0x180011d17      mov   qword [var_210h], rdi
|       |   0x180011d1c      mov   rdi, qword [var_1e8h]
|       |   0x180011d21      mov   qword [var_1e0h], rax
|       |   0x180011d26      call  0x1800242d0
|       |   0x180011d2b      mov   rcx, qword [var_1e0h]
|       |   0x180011d30      xor   eax, eax
|       |   0x180011d32      mov   rbx, qword [var_1d0h]
|       |   0x180011d37      mov   r15d, eax
|       |   0x180011d3a      mov   r14, qword [var_210h]
|       |   0x180011d3f      test  rcx, rcx
|      ,==< 0x180011d42      jz    0x180011d6e
|     ,===< 0x180011d44      jmp   0x180011d5d
|     ||`-> 0x180011d46      mov   rbx, qword [var_1d0h]
|     ||    0x180011d4b      mov   r15, rdi
|     ||    ; CODE XREFS from fcn.18000ffd0 @ 0x180010d80, 0x1800114da
| --------> 0x180011d4e      mov   rdi, qword [var_1e8h]
|     ||    ; CODE XREFS from fcn.18000ffd0 @ 0x180011131, 0x1800116e5, 0x180011834, 0x180011989
| --------> 0x180011d53      mov   r13, qword [var_1d8h]
|     ||    ; CODE XREF from fcn.18000ffd0 @ 0x180010e14
| --------> 0x180011d58      mov   rcx, qword [var_1e0h]
|     ||    ; CODE XREF from fcn.18000ffd0 @ 0x180011d44
|     `---> 0x180011d5d      cmp   dword [rcx], 0x00
|      |,=< 0x180011d60      jl    0x180011d6e
|      ||   0x180011d62      sub   qword [rcx], 0x01
|     ,===< 0x180011d66      jnz   0x180011d6e
|     |||   0x180011d68      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
|     ```-> 0x180011d6e      mov   rcx, qword [var_78h]
|           0x180011d72      movaps xmm6, xmmword [var_48h]
|           0x180011d7a      mov   r12, qword [var_28h]
|           0x180011d82      mov   rsi, qword [var_18h]
|           0x180011d8a      test  rcx, rcx
|       ,=< 0x180011d8d      jz    0x180011da0
|       |   0x180011d8f      cmp   dword [rcx], 0x00
|      ,==< 0x180011d92      jl    0x180011da0
|      ||   0x180011d94      sub   qword [rcx], 0x01
|     ,===< 0x180011d98      jnz   0x180011da0
|     |||   0x180011d9a      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
|     ```-> 0x180011da0      test  r13, r13
|       ,=< 0x180011da3      jz    0x180011dbc
|       |   0x180011da5      cmp   dword [r13], 0x00
|      ,==< 0x180011daa      jl    0x180011dbc
|      ||   0x180011dac      sub   qword [r13], 0x01
|     ,===< 0x180011db1      jnz   0x180011dbc
|     |||   0x180011db3      mov   rcx, r13
|     |||   0x180011db6      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
|     ```-> 0x180011dbc      mov   rcx, qword [var_80h]
|           0x180011dc0      mov   r13, qword [var_30h]
|           0x180011dc8      test  rcx, rcx
|       ,=< 0x180011dcb      jz    0x180011dde
|       |   0x180011dcd      cmp   dword [rcx], 0x00
|      ,==< 0x180011dd0      jl    0x180011dde
|      ||   0x180011dd2      sub   qword [rcx], 0x01
|     ,===< 0x180011dd6      jnz   0x180011dde
|     |||   0x180011dd8      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
|     ```-> 0x180011dde      test  rbx, rbx
|       ,=< 0x180011de1      jz    0x180011df7
|       |   0x180011de3      cmp   dword [rbx], 0x00
|      ,==< 0x180011de6      jl    0x180011df7
|      ||   0x180011de8      sub   qword [rbx], 0x01
|     ,===< 0x180011dec      jnz   0x180011df7
|     |||   0x180011dee      mov   rcx, rbx
|     |||   0x180011df1      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
|     ```-> 0x180011df7      mov   rbx, qword [arg_8h]
|           0x180011dff      test  rdi, rdi
|       ,=< 0x180011e02      jz    0x180011e18
|       |   0x180011e04      cmp   dword [rdi], 0x00
|      ,==< 0x180011e07      jl    0x180011e18
|      ||   0x180011e09      sub   qword [rdi], 0x01
|     ,===< 0x180011e0d      jnz   0x180011e18
|     |||   0x180011e0f      mov   rcx, rdi
|     |||   0x180011e12      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
|     ```-> 0x180011e18      mov   rdi, qword [var_20h]
|           0x180011e20      test  r14, r14
|       ,=< 0x180011e23      jz    0x180011e3a
|       |   0x180011e25      cmp   dword [r14], 0x00
|      ,==< 0x180011e29      jl    0x180011e3a
|      ||   0x180011e2b      sub   qword [r14], 0x01
|     ,===< 0x180011e2f      jnz   0x180011e3a
|     |||   0x180011e31      mov   rcx, r14
|     |||   0x180011e34      call  qword [sym.imp.python312.dll__Py_Dealloc] ; [0x1800282c0:8]=0x2dbec
|     ```-> 0x180011e3a      mov   rax, r15
|           0x180011e3d      mov   r15, qword [var_38h]
|           0x180011e45      mov   rcx, qword [arg_e8h]
|           0x180011e4c      xor   rcx, rsp
|           0x180011e4f      call  0x180026430
|           0x180011e54      add   rsp, 0x228
|           0x180011e5b      pop   r14
|           0x180011e5d      pop   rbp
\           0x180011e5e      ret
