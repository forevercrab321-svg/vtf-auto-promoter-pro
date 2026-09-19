---
name: vuln-pattern-library
description: |
  BountyOS 漏洞模式推理库。当研究一个已授权、已确认 IN_SCOPE 的目标，需要"怀疑什么漏洞 / 看什么信号 / 怎么设计最小影响测试 / 什么算证据 / 什么是假阳性 / 影响多大"时使用。
  它不是漏洞定义手册，而是把 IDOR/BOLA/BFLA、多租户隔离、认证与令牌、业务逻辑、SSRF/XXE/SSTI/SQLi 等类别拆成"可复现的研究推理链"。
  触发词：「怎么测这个目标」「这里可能有什么漏洞」「设计一个最小影响测试」「这算不算假阳性」「帮我写 hypothesis」「vulnerability pattern」「how would I test this endpoint」「is this a false positive」「what should I suspect here」。
  数据源在 src/lib/knowledge（22 个模式，附 OWASP/CWE/PortSwigger 引用）。安全边界由代码强制，此 skill 不能扩大 scope。
---

# Vulnerability Pattern Library — 推理库使用指南

> 这个 skill 是 `Book → Knowledge Distillation → Pattern Library → Hypothesis → Report`
> 流水线的**推理端点**。它教任何 agent **用**这套模式库去研究一个目标，而不是
> 把一本书塞进上下文。真正的数据在 `src/lib/knowledge/`（可被代码、API、Dashboard
> 共享的唯一事实来源）。

## 铁律（先读，不可协商）

1. **AUTHORIZED ONLY / SCOPE FIRST。** 只对 Scope Guardian 判定为 `IN_SCOPE`（GREEN）
   的目标使用。任何 `SCOPE_UNKNOWN` / `OUT_OF_SCOPE` → 停，先确认 scope。
2. **这个 skill 是"提示词"，护栏是"代码"。** `src/lib/scope-guardian.ts`、
   `src/lib/supervisor.ts`、`src/lib/types.ts` 的禁止清单在 API 层强制执行。本 skill
   **无法**扩大 scope、授权越界目标、或解除任何被禁技术。不要尝试。
3. **MINIMUM IMPACT。** 每个模式的 `test` 字段已经写成"证明边界是否成立所需的最小、
   可逆、单次"动作，且只用研究者自有账号/数据。照它做，不要加码。
4. **HUMAN CONTROL。** `requiresHumanApproval: true` 的模式，即使技术上可行，也必须先过
   人工审批门（Approvals）。绝不自行执行会读到他人数据、改数据、产生费用、发消息、
   影响可用性的动作。
5. **MINIMUM PROOF。** 能用 `200 vs 403` 证明的，就不要下载完整敏感数据。差分信号即证据。

## 模式的形状（13 个字段）

每个模式是一条**推理链**，不是定义：

```
vulnerabilityPattern   漏洞的抽象形状（与具体产品无关）
applicationContext     它通常出现在什么功能里
precondition           测试有意义的前提（通常：两个自有账号）
observation            ← 最高价值字段：什么信号让你"怀疑这里"
researchHypothesis     一个可被单次请求证伪的问题
securityBoundary       本该守住的边界（= expected secure behavior）
test                   最小影响测试设计
unexpectedBehavior     脆弱系统会做、安全系统不会做的事
rootCause              底层工程错误
exploitCondition       要造成影响还需要什么
impact                 诚实、不夸大的影响
falsePositiveConditions ← 第二高价值：什么看起来像但其实不是（减少无效报告）
detectionHeuristic     规模化时的速判规则
```

## 工作流（Agentic Protocol）

### Step 1 — 定位相关模式
- 已经映射了 attack surface → 用 `patternsForSurfaces(surfaceCategories)` 取相关模式（按重合度排序）。
- 只有一个类别/关键词 → `searchPatterns(query)` 或 `patternsByFamily(family)`。
- 想看全景 → `taxonomy()` 返回四大家族的子类树。

```ts
import { patternsForSurfaces, searchPatterns, getPattern, remediationFor } from "@/lib/knowledge";
```
（或直接调用 `GET /api/patterns?surface=API,Multi-Tenant` / `?family=Authorization` / `?q=idor`。）

### Step 2 — 生成 hypotheses（不要无脑扫描）
对每个相关模式，产出一条**可测假设**，字段直接来自模式：
`title = researchHypothesis`，`expectedSecureBehavior = securityBoundary`，
`testStrategy = test + observation + detectionHeuristic`，`humanApprovalRequired = requiresHumanApproval`。
系统里 `hypothesesFromPatterns()` 已经这么做——优先复用它，并把 `patternId` 写进 hypothesis。

### Step 3 — 设计测试（Supervisor 门控）
- 直接采用模式的 `test`。它已是最小影响版本。
- 逐条对照 `falsePositiveConditions` 预判：如果观察到的"异常"落在其中任一条，先排除。
- 把测试交给 `POST /api/tests`。9 问门会给出 `ALLOW` / `HUMAN_APPROVAL_REQUIRED` / `BLOCK`。
  不要绕过它。

### Step 4 — 验证（防假阳性）
声明发现前，逐条走 `falsePositiveConditions`，并确认：
可复现、授权上下文正确、真实的 `unexpectedBehavior`、影响不被夸大。
只有 `CONFIRMED` 才进报告流水线。

### Step 5 — 判断影响 + 引用
用模式的 `impact` 作为**上限锚点**——不要夸大。写报告时，finding → test → hypothesis 的
`patternId` 会让 `POST /api/reports` 自动带上该模式的 `remediation` 与权威引用（OWASP/CWE/
PortSwigger）到 References 段。

## 何时**不要**用某个模式
- 目标不在 scope，或技术被程序/全局禁止 → 该模式的 `test` 不执行。
- 模式的 `exploitCondition` 显然不成立（例如对象天生公开）→ 记为不适用，别硬测。
- 证明需要"扩大影响 / 读他人数据 / 改生产数据" → 走人工审批，别自行升级。

## 与 Nuwa 的分工
- **本 skill**：结构化的"测什么、怎么测、算不算真"——横向覆盖漏洞类别。
- **Nuwa（`nuwa-skill`）**：纵向的"顶级 hunter 的决策直觉"——为什么会想到去测那里。
两者互补：先用 Nuwa 蒸馏出的直觉选方向，再用本库把方向落成可执行、可引用、最小影响的测试。

## 升级
模式库是普通 TS 源码（`src/lib/knowledge/`）。新增/修订模式即编辑对应
`patterns.<family>.ts`，保持 13 字段齐全并附**公开可引用**的来源（见 `sources.ts`），
`npm run test` 会校验完整性。引用只用 OWASP / MITRE CWE / PortSwigger / 公开披露报告等
免费权威来源——不要引入受版权保护的书籍内容。
