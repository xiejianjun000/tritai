// 类型定义
export type {
  // JSON-RPC基础类型
  JSONRPCRequest,
  JSONRPCResponse,
  JSONRPCError,
  JSONRPCNotification,
  
  // MCP方法枚举
  MCPMethod,
  
  // 工具类型
  MCPTool,
  ToolInputSchema,
  ToolInputProperty,
  ToolCallParams,
  ToolCallResult,
  ToolContent,
  
  // 资源类型
  MCPResource,
  MCPResourceTemplate,
  
  // 提示词类型
  MCPPrompt,
  PromptArgument,
  
  // 初始化类型
  ClientCapabilities,
  ServerCapabilities,
  InitializeParams,
  ProtocolAppInfo,
  InitializeResult,
  
  // 进度和日志类型
  ProgressParams,
  LogLevel,
  LogMessageParams,
  
  // 传输层类型
  TransportType,
  StdioTransportConfig,
  SSELransportConfig,
  TransportConfig,
  
  // 连接状态和重连配置
  ConnectionState,
  ReconnectConfig,
  
  // MCP配置
  MCPServerConfig,
  MCPConfig,
} from './types';

// 导出枚举
export { MCPCode, DEFAULT_PROTOCOL_VERSION, DEFAULT_RECONNECT_CONFIG } from './types';

// 导出错误类
export { MCPError } from './types';

// 传输层
export {
  MCPTransport,
  StdioTransport,
  SSETransport,
  TransportFactory,
} from './MCPTransport';

// 工具注册表
export {
  MCPToolRegistry,
  ToolExecutor,
  RegistryEntry,
} from './MCPToolRegistry';

// MCP客户端
export type { MCPClientConfig } from './MCPClient';
export { MCPClient, createMCPClientFromConfig } from './MCPClient';

// Actor封装
export { MCPActor, createMCPActor } from './mcp-actor';

// ============== 使用示例 ==============

/**
 * @example
 * ```typescript
 * import { MCPClient, MCPTool } from './mcp-client';
 * 
 * // 创建客户端
 * const client = new MCPClient({
 *   clientInfo: {
 *     name: 'my-app',
 *     version: '1.0.0',
 *   },
 * });
 * 
 * // 连接MCP服务器
 * await client.connect('code-review-graph', {
 *   command: 'uvx',
 *   args: ['code-review-graph', 'serve'],
 * });
 * 
 * // 调用工具
 * const result = await client.callTool({
 *   name: 'build_or_update_graph_tool',
 *   arguments: {
 *     full_rebuild: false,
 *     repo_root: '/path/to/repo',
 *   },
 * });
 * ```
 */
