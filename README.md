# MCP Client - OpenTaiji MCP协议客户端

MCP (Model Context Protocol) 客户端实现，用于连接外部MCP服务器并调用其提供的工具。

## 模块结构

```
mcp-client/
├── types.ts           # MCP协议类型定义
├── MCPTransport.ts    # 传输层实现（stdio/SSE）
├── MCPToolRegistry.ts  # 工具注册表
├── MCPClient.ts       # 主客户端
├── mcp-actor.ts       # Actor Runtime封装类
├── index.ts           # 模块导出
└── README.md          # 使用文档
```

## 核心功能

### 1. 多服务器连接

支持同时连接多个MCP服务器，每个服务器独立管理：

```typescript
import { MCPClient } from './mcp-client';

const client = new MCPClient({
  clientInfo: {
    name: 'open-taiji',
    version: '1.0.0',
  },
});

// 连接code-review-graph服务器
await client.connect('code-review-graph', {
  command: 'uvx',
  args: ['code-review-graph', 'serve'],
});

// 可以连接更多服务器
await client.connect('another-server', {
  url: 'http://localhost:3100/sse',
  headers: { 'Authorization': 'Bearer xxx' },
});
```

### 2. 工具发现与调用

自动发现服务器提供的所有工具：

```typescript
// 获取所有可用工具
const tools = client.registry.getAllTools();
console.log('可用工具:', tools.map(t => t.name));

// 调用工具
const result = await client.callTool({
  name: 'build_or_update_graph_tool',
  arguments: {
    full_rebuild: false,
    repo_root: '/path/to/repo',
  },
});
```

### 3. 资源访问

访问MCP服务器提供的资源：

```typescript
// 读取资源
const resource = await client.readResource('file:///path/to/file');
```

### 4. 提示词支持

获取服务器提供的预定义提示词：

```typescript
// 获取提示词
const prompt = await client.getPrompt('review_changes', {
  base: 'HEAD~1',
});
```

### 5. 事件监听

监听各种事件：

```typescript
// 服务器连接状态
client.on('server:connected', (serverName) => {
  console.log(`已连接: ${serverName}`);
});

client.on('server:disconnected', (serverName) => {
  console.log(`已断开: ${serverName}`);
});

// 工具变更
client.on('tool:added', (tool, serverName) => {
  console.log(`新工具: ${tool.name} (来自 ${serverName})`);
});

client.on('tools:changed', (serverName) => {
  console.log(`工具列表已更新: ${serverName}`);
});

// 错误处理
client.on('error', (error) => {
  console.error('MCP错误:', error);
});

// 日志
client.on('log', (level, message, data) => {
  console.log(`[${level}] ${message}`, data);
});
```

### 6. 自动重连

内置自动重连机制：

```typescript
const client = new MCPClient({
  clientInfo: { name: 'app', version: '1.0.0' },
  reconnect: {
    enabled: true,
    maxRetries: 5,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
  },
});
```

### 7. 从配置文件加载

支持从 `.mcp.json` 配置文件创建客户端：

```typescript
import { createMCPClientFromConfig } from './mcp-client';

const client = await createMCPClientFromConfig(
  './.mcp.json',
  { name: 'open-taiji', version: '1.0.0' }
);
```

## Actor Runtime集成

MCP Client提供了专门的Actor封装类，可以直接在OpenTaiji Actor Runtime中使用：

### 创建MCP Actor

```typescript
import { createMCPActor } from './mcp-client';
import { system } from '../core/actor/ActorSystem';

// 创建并启动MCP Actor
const mcpActor = await createMCPActor(
  system,
  { name: 'open-taiji', version: '1.0.0' },
  {
    'code-review-graph': {
      command: 'uvx',
      args: ['code-review-graph', 'serve'],
    },
    'another-server': {
      url: 'http://localhost:3100/sse',
    },
  },
  'mcp-client-actor'
);
```

### 通过消息调用MCP工具

```typescript
import { system } from '../core/actor/ActorSystem';
import { ActorRef } from '../core/actor/ActorPath';

// 获取MCP Actor引用
const mcpActor = system.findActor('mcp-client-actor');

// 调用工具
mcpActor.tell({
  type: 'mcp:callTool',
  toolName: 'build_or_update_graph_tool',
  arguments: {
    full_rebuild: false,
    repo_root: '/path/to/repo',
  },
  replyTo: context.self,
  correlationId: 'unique-request-id-123',
});

// 处理响应
async receive(message: any): Promise<void> {
  if (message.type === 'mcp:callTool:response') {
    if (message.success) {
      console.log('工具调用成功:', message.result);
    } else {
      console.error('工具调用失败:', message.error);
    }
  }
}
```

### 其他Actor消息接口

```typescript
// 连接新服务器
mcpActor.tell({
  type: 'mcp:connect',
  serverName: 'new-server',
  config: {
    command: 'uvx',
    args: ['another-mcp-server', 'serve'],
  },
  replyTo: context.self,
});

// 获取工具列表
mcpActor.tell({
  type: 'mcp:getTools',
  serverName: 'code-review-graph',
  replyTo: context.self,
});

// 获取统计信息
mcpActor.tell({
  type: 'mcp:getStats',
  replyTo: context.self,
});

// 断开服务器连接
mcpActor.tell({
  type: 'mcp:disconnect',
  serverName: 'server-to-disconnect',
  replyTo: context.self,
});

// 销毁MCP Actor
mcpActor.tell({
  type: 'mcp:destroy',
  replyTo: context.self,
});
```

## 传输层

### Stdio传输（默认）

适用于本地进程通信：

```typescript
await client.connect('server-name', {
  command: 'uvx',
  args: ['code-review-graph', 'serve'],
  env: { 'DEBUG': '1' },
  cwd: '/path/to/workdir',
});
```

### SSE传输

适用于HTTP长连接：

```typescript
await client.connect('server-name', {
  type: 'sse',
  url: 'http://localhost:3100/sse',
  headers: { 'Authorization': 'Bearer xxx' },
});
```

## 与Actor Runtime集成（手动方式）

```typescript
import { MCPClient } from './mcp-client';
import { Actor } from '../core/actor/Actor';

// 创建MCP Actor
class MCPActor extends Actor {
  private client: MCPClient;
  
  constructor(context: ActorContext) {
    super(context);
    this.client = new MCPClient({
      clientInfo: { name: 'open-taiji', version: '1.0.0' },
    });
  }
  
  async preStart(): Promise<void> {
    // 预启动时连接服务器
    await this.client.connect('code-review-graph', {
      command: 'uvx',
      args: ['code-review-graph', 'serve'],
    });
  }
  
  async receive(message: any): Promise<void> {
    if (message.type === 'callTool') {
      const result = await this.client.callTool({
        name: message.toolName,
        arguments: message.arguments,
      });
      // 处理结果
    }
  }
  
  async postStop(): Promise<void> {
    // 停止时断开连接
    await this.client.disconnectAll();
  }
}
```

## 工具注册表统计

```typescript
const stats = client.registry.getStats();
console.log('统计信息:', {
  toolCount: stats.toolCount,
  resourceCount: stats.resourceCount,
  promptCount: stats.promptCount,
  serverCount: stats.serverCount,
  toolsByServer: stats.toolsByServer,
});
```

## 断开连接

```typescript
// 断开单个服务器
await client.disconnect('code-review-graph');

// 断开所有服务器
await client.disconnectAll();

// 销毁客户端
await client.destroy();
```

## 错误处理

```typescript
import { MCPError, MCPCode } from './mcp-client';

try {
  await client.callTool({ name: 'unknown_tool', arguments: {} });
} catch (error) {
  if (error instanceof MCPError) {
    switch (error.code) {
      case MCPCode.TOOL_NOT_FOUND:
        console.log('工具不存在');
        break;
      case MCPCode.CONNECTION_TIMEOUT:
        console.log('连接超时');
        break;
      case MCPCode.CONNECTION_FAILED:
        console.log('连接失败');
        break;
    }
  }
}
```

## 与code-review-graph集成示例

```typescript
import { MCPClient } from './mcp-client';

// 创建客户端
const client = new MCPClient({
  clientInfo: { name: 'open-taiji', version: '1.0.0' },
});

// 连接到code-review-graph
await client.connect('code-review-graph', {
  command: 'uvx',
  args: ['code-review-graph', 'serve'],
  env: {},
  cwd: process.cwd(),
});

// 调用build_or_update_graph_tool
const graphResult = await client.callTool({
  name: 'build_or_update_graph_tool',
  arguments: {
    full_rebuild: false,
    repo_root: '/path/to/repo',
    base: 'HEAD~1',
  },
});

// 调用detect_changes_tool
const changesResult = await client.callTool({
  name: 'detect_changes_tool',
  arguments: {
    base: 'HEAD~1',
    include_source: true,
    max_depth: 2,
  },
});

// 获取图统计
const stats = await client.callTool({
  name: 'list_graph_stats_tool',
  arguments: {},
});

// 获取建议的问题
const questions = await client.callTool({
  name: 'get_suggested_questions_tool',
  arguments: {},
});
```
