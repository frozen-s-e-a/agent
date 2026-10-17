// 按 numFmt 把十进制字符串格式化成显示文字。全程字符串运算，不转浮点数。
// 只支持底稿里常见的几种格式：#,##0.00、0.00%、0、#,##0、0.0000 以及带负数红字/括号的两段式（取第一段）。

interface Dec {
  neg: boolean;
  int: string; // 无前导零（"0" 例外）
  frac: string;
}

function parseDec(s: string): Dec | null {
  const m = /^\s*([+-])?(\d*)(?:\.(\d*))?\s*$/.exec(s);
  if (!m || (m[2] === "" && (m[3] ?? "") === "")) return null;
  const int = (m[2] || "0").replace(/^0+(?=\d)/, "");
  return { neg: m[1] === "-", int, frac: m[3] ?? "" };
}

/** 小数点右移 n 位（乘以 10^n） */
function shift(d: Dec, n: number): Dec {
  const frac = d.frac.padEnd(n, "0");
  const int = (d.int + frac.slice(0, n)).replace(/^0+(?=\d)/, "");
  return { neg: d.neg, int, frac: frac.slice(n) };
}

/** 四舍五入到 places 位小数 */
function round(d: Dec, places: number): Dec {
  if (d.frac.length <= places) return { ...d, frac: d.frac.padEnd(places, "0") };
  const keep = d.frac.slice(0, places);
  const up = d.frac.charCodeAt(places) >= 53; // '5'
  let digits = d.int + keep;
  if (up) {
    const arr = digits.split("");
    let i = arr.length - 1;
    while (i >= 0) {
      if (arr[i] === "9") {
        arr[i] = "0";
        i--;
      } else {
        arr[i] = String(Number(arr[i]) + 1);
        break;
      }
    }
    digits = (i < 0 ? "1" : "") + arr.join("");
  }
  const int = digits.slice(0, digits.length - places) || "0";
  return { neg: d.neg, int: int.replace(/^0+(?=\d)/, ""), frac: places ? digits.slice(-places) : "" };
}

function group(int: string): string {
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function isZero(d: Dec): boolean {
  return /^0*$/.test(d.int) && /^0*$/.test(d.frac);
}

export function formatDecimal(value: string, numFmt?: string | null): string {
  const d0 = parseDec(value);
  if (!d0) return value;
  const fmt = (numFmt ?? "General").split(";")[0].replace(/\[[^\]]*\]/g, "").replace(/["\\_*]./g, "");
  if (fmt === "General" || fmt === "@" || fmt === "") return value;
  const percent = fmt.includes("%");
  const d = percent ? shift(d0, 2) : d0;
  const dot = fmt.indexOf(".");
  const places = dot < 0 ? 0 : (fmt.slice(dot + 1).match(/[0#]/g) ?? []).length;
  const r = round(d, places);
  const int = fmt.includes(",") ? group(r.int) : r.int;
  const body = places ? `${int}.${r.frac}` : int;
  const neg = r.neg && !isZero(r);
  return `${neg ? "-" : ""}${body}${percent ? "%" : ""}`;
}

/** 金额加减（用于前端展示差额等少量场景），字符串定点运算 */
export function addDecimal(a: string, b: string): string {
  const pa = parseDec(a);
  const pb = parseDec(b);
  if (!pa || !pb) return "";
  const places = Math.max(pa.frac.length, pb.frac.length);
  const toBig = (d: Dec) => BigInt((d.neg ? "-" : "") + d.int + d.frac.padEnd(places, "0"));
  const sum = toBig(pa) + toBig(pb);
  const neg = sum < 0n;
  const digits = (neg ? -sum : sum).toString().padStart(places + 1, "0");
  const int = digits.slice(0, digits.length - places);
  const frac = digits.slice(digits.length - places);
  return `${neg ? "-" : ""}${int}${places ? "." + frac : ""}`;
}
