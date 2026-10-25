import React from 'react'
import { Text, InlineStack, Badge } from '@shopify/polaris'
import { renderYears } from '../domain/garan.js'

// 近似渲染官方 GARAN 标签。
// 几何严格按官方 GARAN Label_colour.svg 的 viewBox 与文本位置：
//   viewBox="0 0 269.29 283.46"
//   字段名 brand  translate(6.32 74.52)
//   字段名 model  translate(196.75 74.52)
//   年数          translate(5.07 150.57)，字号 cls-3
//
// 为什么不是直接内联官方 SVG：
//   market-research/21-asset-verification.md §2.3 已推翻
//   "3 个 <text> = 3 个可编辑字段"——brand / model 的真实填写位置至今未确认。
//   所以这里只用官方几何做排版参考，并明确标注"非官方渲染"。
export default function GaranPreview({ brand, model, years, compact = false }) {
  const w = compact ? 150 : 210
  const h = (w * 283.46) / 269.29

  const brandText = (brand || '').trim() || '—'
  const modelText = (model || '').trim() || '—'
  const yearsText = years ? renderYears(years) : '—'

  return (
    <div>
      <InlineStack gap="200" blockAlign="center">
        <Text as="h3" variant="headingSm">
          标签预览
        </Text>
        <Badge tone="attention">非官方渲染示意</Badge>
      </InlineStack>
      <div className="garan-preview-wrap" style={{ marginTop: 10 }}>
        <svg
          width={w}
          height={h}
          viewBox="0 0 269.29 283.46"
          role="img"
          aria-label="GARAN 标签近似预览"
        >
          {/* 外框 */}
          <rect
            x="1"
            y="1"
            width="267.29"
            height="281.46"
            rx="4"
            fill="#ffffff"
            stroke="#1a1a1a"
            strokeWidth="2"
          />

          {/* 顶部标题区（官方为 path 绘制，此处用文字近似） */}
          <rect x="1" y="1" width="267.29" height="44" rx="4" fill="#1a1a1a" />
          <text
            x="134.6"
            y="21"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="9.5"
            fontWeight="700"
            fontFamily="Inter, sans-serif"
          >
            COMMERCIAL GUARANTEE
          </text>
          <text
            x="134.6"
            y="34"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="7.2"
            fontFamily="Inter, sans-serif"
          >
            OF DURABILITY
          </text>

          {/* 字段名：位置取自官方 translate(6.32 74.52) */}
          <text
            x="6.32"
            y="74.52"
            fill="#1a1a1a"
            fontSize="7"
            fontWeight="600"
            fontFamily="Inter, sans-serif"
            letterSpacing="0.2"
          >
            Brand/Trademark
          </text>
          <text
            x="196.75"
            y="74.52"
            fill="#1a1a1a"
            fontSize="7"
            fontWeight="600"
            fontFamily="Inter, sans-serif"
            letterSpacing="0.2"
          >
            Model identifier
          </text>

          {/* 字段值：官方未确认位置，此处按字段名下方叠放 */}
          <text
            x="6.32"
            y="90"
            fill="#1a1a1a"
            fontSize="12"
            fontWeight="700"
            fontFamily="Inter, sans-serif"
          >
            {truncate(brandText, 16)}
          </text>
          <text
            x="196.75"
            y="90"
            fill="#1a1a1a"
            fontSize="12"
            fontWeight="700"
            fontFamily="Inter, sans-serif"
          >
            {truncate(modelText, 11)}
          </text>

          {/* 分隔线 */}
          <line x1="6" y1="104" x2="263" y2="104" stroke="#1a1a1a" strokeWidth="0.8" />

          {/* 年数：位置取自官方 translate(5.07 150.57) */}
          <text
            x="5.07"
            y="128"
            fill="#1a1a1a"
            fontSize="6.5"
            fontFamily="Inter, sans-serif"
            letterSpacing="0.2"
          >
            Guarantee period (years)
          </text>
          <text
            x="5.07"
            y="160"
            fill="#1a1a1a"
            fontSize="34"
            fontWeight="800"
            fontFamily="Inter, sans-serif"
          >
            {yearsText}
          </text>

          {/* 勾号区（官方为固定 path） */}
          <circle cx="215" cy="143" r="22" fill="#1a1a1a" />
          <path
            d="M204 143 l7.5 8 L227 132"
            stroke="#ffffff"
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 底部：官方有二维码 + 24 语言说明 */}
          <rect x="6" y="196" width="52" height="52" fill="#f0f0f0" stroke="#1a1a1a" strokeWidth="0.8" />
          {qrDots(6, 196, 52)}

          <text
            x="66"
            y="206"
            fill="#1a1a1a"
            fontSize="5.4"
            fontFamily="Inter, sans-serif"
          >
            Scan for the full guarantee
          </text>
          <text
            x="66"
            y="215"
            fill="#1a1a1a"
            fontSize="5.4"
            fontFamily="Inter, sans-serif"
          >
            conditions in your language.
          </text>
          <text
            x="66"
            y="230"
            fill="#6d7175"
            fontSize="4.8"
            fontFamily="Inter, sans-serif"
          >
            Commercial guarantee of durability,
            {` ${yearsText} years.`}
          </text>
          <text
            x="66"
            y="238"
            fill="#6d7175"
            fontSize="4.8"
            fontFamily="Inter, sans-serif"
          >
            This does not affect your legal rights.
          </text>
        </svg>
      </div>
      <div className="garan-note">
        几何尺寸遵循官方素材。品牌与型号的精确位置尚未确认 —— 见
        <span className="mono">21-asset-verification.md</span> §2.3。年数按法规要求用逗号渲染。
      </div>
    </div>
  )
}

function truncate(s, n) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

// 画一个装饰性的二维码方块（不是真二维码，仅示意）
function qrDots(x0, y0, size) {
  const cells = 9
  const c = size / cells
  const out = []
  for (let r = 0; r < cells; r++) {
    for (let k = 0; k < cells; k++) {
      const isCorner =
        (r < 3 && k < 3) || (r < 3 && k >= cells - 3) || (r >= cells - 3 && k < 3)
      const on = isCorner ? true : (r * 7 + k * 5) % 3 === 0
      if (on) {
        out.push(
          <rect
            key={`${r}-${k}`}
            x={x0 + k * c}
            y={y0 + r * c}
            width={c}
            height={c}
            fill="#1a1a1a"
          />
        )
      }
    }
  }
  return out
}
