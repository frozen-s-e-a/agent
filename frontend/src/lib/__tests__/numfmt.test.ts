import { describe, expect, it } from "vitest";
import { addDecimal, formatDecimal } from "../numfmt";

describe("formatDecimal", () => {
  it("金额千分位两位小数", () => {
    expect(formatDecimal("1835000", "#,##0.00")).toBe("1,835,000.00");
    expect(formatDecimal("-1234.5", "#,##0.00")).toBe("-1,234.50");
    expect(formatDecimal("0.005", "#,##0.00")).toBe("0.01");
    expect(formatDecimal("999.995", "#,##0.00")).toBe("1,000.00");
  });
  it("百分比不经过浮点数", () => {
    expect(formatDecimal("0.653951", "0.00%")).toBe("65.40%");
    expect(formatDecimal("0.1", "0.00%")).toBe("10.00%");
    expect(formatDecimal("1", "0.00%")).toBe("100.00%");
  });
  it("超过浮点精度的大数也不丢位", () => {
    expect(formatDecimal("12345678901234567.89", "#,##0.00")).toBe("12,345,678,901,234,567.89");
  });
  it("非数字原样返回", () => {
    expect(formatDecimal("12万", "#,##0.00")).toBe("12万");
  });
});

describe("addDecimal", () => {
  it("定点加减", () => {
    expect(addDecimal("1834500.00", "-1835000.00")).toBe("-500.00");
    expect(addDecimal("0.1", "0.2")).toBe("0.3");
  });
});
