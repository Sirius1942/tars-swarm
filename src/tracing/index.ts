import { TraceEvent } from '../core/types';

/**
 * 追踪器类 - 用于记录Agent运行过程
 */
export class Tracer {
  events: TraceEvent[] = [];
  enabled: boolean = true;
  
  constructor(enabled: boolean = true) {
    this.enabled = enabled;
  }
  
  /**
   * 添加追踪事件
   */
  addEvent(type: TraceEvent['type'], data: any): void {
    if (!this.enabled) return;
    
    this.events.push({
      timestamp: Date.now(),
      type,
      data
    });
  }
  
  /**
   * 清除所有事件
   */
  clear(): void {
    this.events = [];
  }
  
  /**
   * 获取所有事件
   */
  getEvents(): TraceEvent[] {
    return [...this.events];
  }
  
  /**
   * 导出事件为JSON字符串
   */
  exportToJson(): string {
    return JSON.stringify(this.events, null, 2);
  }
}

/**
 * 追踪可视化类 - 将追踪事件可视化
 */
export class TraceVisualizer {
  /**
   * 生成控制台友好的追踪视图
   */
  static generateConsoleView(events: TraceEvent[]): string {
    const lines: string[] = [];
    
    for (const event of events) {
      const time = new Date(event.timestamp).toISOString();
      
      switch (event.type) {
        case 'agent_start':
          lines.push(`[${time}] 🚀 Agent "${event.data.agent}" started`);
          break;
          
        case 'agent_end':
          lines.push(`[${time}] 🏁 Agent "${event.data.agent}" finished`);
          break;
          
        case 'function_call':
          lines.push(`[${time}] 📞 Function "${event.data.name}" called with args: ${JSON.stringify(event.data.arguments)}`);
          break;
          
        case 'function_return':
          if (event.data.error) {
            lines.push(`[${time}] ❌ Function "${event.data.name}" failed: ${event.data.error}`);
          } else {
            lines.push(`[${time}] ✅ Function "${event.data.name}" returned: ${JSON.stringify(event.data.result).substring(0, 100)}${JSON.stringify(event.data.result).length > 100 ? '...' : ''}`);
          }
          break;
          
        case 'handoff':
          lines.push(`[${time}] 🔄 Handoff from "${event.data.from}" to "${event.data.to}"`);
          break;
          
        case 'guardrail_check':
          if (event.data.success) {
            lines.push(`[${time}] 🛡️ ${event.data.type} passed`);
          } else {
            lines.push(`[${time}] 🚫 ${event.data.type} failed: ${event.data.errors.join(', ')}`);
          }
          break;
          
        case 'model_call':
          lines.push(`[${time}] 🤖 Model "${event.data.model}" called`);
          break;
          
        default:
          lines.push(`[${time}] ℹ️ ${event.type}: ${JSON.stringify(event.data)}`);
      }
    }
    
    return lines.join('\n');
  }
  
  /**
   * 生成HTML时间线可视化
   */
  static generateTimelineHTML(events: TraceEvent[]): string {
    // 简化版本 - 实际应用中可能需要更复杂的HTML生成
    const timelineItems = events.map(event => {
      const time = new Date(event.timestamp).toISOString();
      let icon, title, content;
      
      switch (event.type) {
        case 'agent_start':
          icon = '🚀';
          title = `Agent Start: ${event.data.agent}`;
          content = `Instructions: ${event.data.instructions?.substring(0, 100)}${event.data.instructions?.length > 100 ? '...' : ''}`;
          break;
          
        case 'agent_end':
          icon = '🏁';
          title = `Agent End: ${event.data.agent}`;
          content = '';
          break;
          
        case 'function_call':
          icon = '📞';
          title = `Function Call: ${event.data.name}`;
          content = `Arguments: ${JSON.stringify(event.data.arguments)}`;
          break;
          
        case 'function_return':
          icon = event.data.error ? '❌' : '✅';
          title = `Function Return: ${event.data.name}`;
          content = event.data.error 
            ? `Error: ${event.data.error}` 
            : `Result: ${JSON.stringify(event.data.result).substring(0, 100)}${JSON.stringify(event.data.result).length > 100 ? '...' : ''}`;
          break;
          
        case 'handoff':
          icon = '🔄';
          title = 'Handoff';
          content = `From "${event.data.from}" to "${event.data.to}"`;
          break;
          
        case 'guardrail_check':
          icon = event.data.success ? '🛡️' : '🚫';
          title = `Guardrail: ${event.data.type}`;
          content = event.data.success 
            ? 'Passed' 
            : `Failed: ${event.data.errors.join(', ')}`;
          break;
          
        case 'model_call':
          icon = '🤖';
          title = 'Model Call';
          content = `Model: ${event.data.model}`;
          break;
          
        default:
          icon = 'ℹ️';
          title = event.type;
          content = JSON.stringify(event.data);
      }
      
      return `
        <div class="timeline-item">
          <div class="timeline-icon">${icon}</div>
          <div class="timeline-content">
            <h3>${title}</h3>
            <p>${time}</p>
            <div>${content}</div>
          </div>
        </div>
      `;
    }).join('');
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Agent Trace Timeline</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .timeline { position: relative; max-width: 1200px; margin: 0 auto; }
          .timeline::after { content: ''; position: absolute; width: 2px; background-color: #333; top: 0; bottom: 0; left: 50%; margin-left: -1px; }
          .timeline-item { padding: 10px 40px; position: relative; width: 50%; box-sizing: border-box; }
          .timeline-item:nth-child(odd) { left: 0; }
          .timeline-item:nth-child(even) { left: 50%; }
          .timeline-content { padding: 20px; background-color: white; border-radius: 6px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          .timeline-icon { position: absolute; width: 30px; height: 30px; right: -15px; background-color: white; border-radius: 50%; z-index: 1; text-align: center; line-height: 30px; font-size: 20px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          .timeline-item:nth-child(even) .timeline-icon { left: -15px; }
          h3 { margin-top: 0; }
        </style>
      </head>
      <body>
        <h1>Agent Trace Timeline</h1>
        <div class="timeline">
          ${timelineItems}
        </div>
      </body>
      </html>
    `;
  }
}
