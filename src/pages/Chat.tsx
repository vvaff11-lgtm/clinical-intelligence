import type { Core, ElementDefinition } from 'cytoscape';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  ChevronLeft,
  ChevronRight,
  Minus,
  Network,
  Plus,
  PlusCircle,
  Printer,
  RefreshCw,
  Send,
  Shield,
  Trash2,
  Verified,
} from 'lucide-react';
import { CHAT_SUGGESTIONS, DEFAULT_SYSTEM_MESSAGE } from '../constants';
import { api, ApiError } from '../lib/api';
import type { ConsultationMessage, ConsultationSession, MedicalGraphData, Page } from '../types';

interface ChatProps {
  activeSessionId: number | null;
  onNavigate: (page: Page) => void;
  onSelectSession: (sessionId: number | null) => void;
  onAuthExpired: (error: unknown) => void;
}

const ALIYUN_BAILIAN_API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
const ALIYUN_MODEL_OPTIONS = ['qwen-plus', 'qwen3.6-plus', 'qwen-max', 'qwen-turbo', 'qwen-flash'];
const OLLAMA_MODEL_OPTIONS = ['deepseek-r1:1.5b', 'qwen2.5:7b', 'llama3.1:8b'];

type DisplayMessage = ConsultationMessage | {
  id: string;
  sessionId: number;
  sender: 'system';
  content: string;
  contextData: null;
  createdAt: string;
};

type ChatRenderItem =
  | { kind: 'message'; message: DisplayMessage }
  | { kind: 'answerGroup'; groupKey: string; messages: ConsultationMessage[] };

function getAnswerGroupKey(message: DisplayMessage) {
  if (message.sender !== 'system' || !message.contextData) return null;
  return String(message.contextData.rootSystemMessageId ?? message.id);
}

function getGraphNodeColor(type: string) {
  const normalizedType = type.toLowerCase();
  if (type === '*' || type === 'Node') return '#b99de0';
  if (normalizedType.includes('check') || type.includes('检查')) return '#f6bf16';
  if (normalizedType.includes('department') || type.includes('科')) return '#8fc7cc';
  if (normalizedType.includes('disease') || type.includes('疾病')) return '#8bd0f7';
  if (normalizedType.includes('drug') || type.includes('药')) return '#55aee8';
  if (normalizedType.includes('food') || type.includes('食物')) return '#c5ad9c';
  if (normalizedType.includes('producer') || type.includes('生产商')) return '#18c985';
  if (normalizedType.includes('symptom') || type.includes('症状')) return '#b08ac8';
  return '#aeb4bd';
}

function getGraphDataFromMessage(message: ConsultationMessage | undefined) {
  const graphData = message?.contextData?.graphData ?? message?.contextData?.graph_data;
  if (!graphData || typeof graphData !== 'object') return null;
  return graphData as MedicalGraphData;
}

export default function Chat({ activeSessionId, onNavigate, onSelectSession, onAuthExpired }: ChatProps) {
  const [sessions, setSessions] = useState<ConsultationSession[]>([]);
  const [messages, setMessages] = useState<ConsultationMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [queryType, setQueryType] = useState<'疾病' | '症状'>('疾病');
  const [topK, setTopK] = useState(3);
  const [modelType, setModelType] = useState<'AliyunBailian' | 'Ollama'>('AliyunBailian');
  const [modelName, setModelName] = useState('qwen-plus');
  const [llmBaseUrl, setLlmBaseUrl] = useState(ALIYUN_BAILIAN_API_URL);
  const [apiKey, setApiKey] = useState('');
  const [temperature, setTemperature] = useState(0.3);
  const [isDeletingSession, setIsDeletingSession] = useState(false);
  const [regeneratingMessageId, setRegeneratingMessageId] = useState<number | null>(null);
  const [answerVersionByGroup, setAnswerVersionByGroup] = useState<Record<string, number>>({});
  const [isMiniGraphReady, setIsMiniGraphReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const miniGraphContainerRef = useRef<HTMLDivElement>(null);
  const miniGraphRef = useRef<Core | null>(null);

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? sessions[0] ?? null,
    [sessions, activeSessionId]
  );

  const displayMessages = useMemo(
    () => [
      {
        id: 'system-default',
        sessionId: selectedSession?.id ?? 0,
        sender: 'system' as const,
        content: DEFAULT_SYSTEM_MESSAGE,
        contextData: null,
        createdAt: new Date().toISOString(),
      },
      ...messages,
    ],
    [messages, selectedSession?.id]
  );

  const renderItems = useMemo<ChatRenderItem[]>(() => {
    const groupedMessages = new Map<string, ConsultationMessage[]>();

    displayMessages.forEach((message) => {
      const groupKey = getAnswerGroupKey(message);
      if (!groupKey || typeof message.id === 'string') return;
      groupedMessages.set(groupKey, [...(groupedMessages.get(groupKey) ?? []), message]);
    });

    const renderedGroups = new Set<string>();
    return displayMessages.flatMap((message) => {
      const groupKey = getAnswerGroupKey(message);
      if (!groupKey) {
        return [{ kind: 'message' as const, message }];
      }
      if (renderedGroups.has(groupKey)) {
        return [];
      }
      renderedGroups.add(groupKey);
      return [{ kind: 'answerGroup' as const, groupKey, messages: groupedMessages.get(groupKey) ?? [] }];
    });
  }, [displayMessages]);

  const activeGraphData = useMemo<MedicalGraphData | null>(() => {
    for (const item of [...renderItems].reverse()) {
      if (item.kind === 'answerGroup') {
        const versionCount = item.messages.length;
        const selectedVersionIndex = Math.min(answerVersionByGroup[item.groupKey] ?? versionCount - 1, versionCount - 1);
        const graphData = getGraphDataFromMessage(item.messages[selectedVersionIndex]);
        if (graphData) return graphData;
      }
    }
    return null;
  }, [answerVersionByGroup, renderItems]);

  const miniGraphElements = useMemo<ElementDefinition[]>(() => {
    if (!activeGraphData) return [];

    const nodeElements = activeGraphData.nodes.map((node, index) => {
      const isPrimary = node.primary || node.id === activeGraphData.centerId || index === 0;
      return {
        data: {
          id: node.id,
          label: node.label.length > 8 ? `${node.label.slice(0, 8)}...` : node.label,
          fullLabel: node.label,
          type: node.type,
          color: getGraphNodeColor(node.type),
          size: isPrimary ? 26 : 18,
          fontSize: isPrimary ? 10 : 8,
        },
      };
    });
    const edgeElements = activeGraphData.edges.map((edge, index) => ({
      data: {
        id: `${edge.source}-${edge.target}-${edge.label}-${index}`,
        source: edge.source,
        target: edge.target,
        label: edge.label,
      },
    }));

    return [...nodeElements, ...edgeElements];
  }, [activeGraphData]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [renderItems.length, isSubmitting]);

  useEffect(() => {
    if (modelType === 'AliyunBailian') {
      setModelName('qwen-plus');
      setLlmBaseUrl(ALIYUN_BAILIAN_API_URL);
      return;
    }

    setModelName('deepseek-r1:1.5b');
    setLlmBaseUrl('http://localhost:11434/v1');
  }, [modelType]);

  useEffect(() => {
    if (!miniGraphContainerRef.current || !miniGraphElements.length) {
      miniGraphRef.current?.destroy();
      miniGraphRef.current = null;
      setIsMiniGraphReady(false);
      return;
    }

    miniGraphRef.current?.destroy();
    setIsMiniGraphReady(false);
    let cancelled = false;

    void import('cytoscape')
      .then(({ default: cytoscape }) => {
        if (cancelled || !miniGraphContainerRef.current) return;

        const cy = cytoscape({
          container: miniGraphContainerRef.current,
          elements: miniGraphElements,
          minZoom: 0.35,
          maxZoom: 3,
          wheelSensitivity: 0.18,
          boxSelectionEnabled: false,
          style: [
            {
              selector: 'node',
              style: {
                'background-color': 'data(color)',
                label: 'data(label)',
                color: '#111827',
                'font-size': 'data(fontSize)',
                'font-weight': 700,
                'text-valign': 'bottom',
                'text-halign': 'center',
                'text-margin-y': 7,
                width: 'data(size)',
                height: 'data(size)',
                'overlay-padding': 6,
              },
            },
            {
              selector: 'edge',
              style: {
                width: 1,
                'line-color': '#a7adb8',
                'curve-style': 'bezier',
                opacity: 0.52,
              },
            },
            {
              selector: 'node:selected',
              style: {
                'border-width': 4,
                'border-color': '#ffffff',
                'underlay-color': '#0046a8',
                'underlay-opacity': 0.2,
                'underlay-padding': 8,
              },
            },
            {
              selector: '.dim',
              style: {
                opacity: 0.16,
              },
            },
            {
              selector: '.highlight',
              style: {
                opacity: 1,
                width: 28,
                height: 28,
                'font-size': 10,
              },
            },
            {
              selector: 'edge.highlight',
              style: {
                width: 2,
                opacity: 0.86,
                'line-color': '#0046a8',
              },
            },
          ],
          layout: {
            name: 'circle',
            fit: true,
            padding: 28,
            avoidOverlap: true,
          },
        });

        cy.on('tap', 'node', (event) => {
          const node = event.target;
          cy.elements().addClass('dim').removeClass('highlight');
          node.closedNeighborhood().removeClass('dim').addClass('highlight');
        });

        cy.on('tap', (event) => {
          if (event.target === cy) {
            cy.elements().removeClass('dim highlight');
          }
        });

        miniGraphRef.current = cy;
        requestAnimationFrame(() => {
          if (cancelled) return;
          cy.resize();
          cy.fit(undefined, 28);
          setIsMiniGraphReady(true);
        });
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : '医学图谱初始化失败');
        setIsMiniGraphReady(false);
      });

    return () => {
      cancelled = true;
      miniGraphRef.current?.destroy();
      miniGraphRef.current = null;
    };
  }, [miniGraphElements]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const response = await api.listConsultations();
        let items = response.items;
        if (!items.length) {
          const created = await api.createConsultation();
          items = [created];
        }
        setSessions(items);
        onSelectSession(activeSessionId ?? items[0].id);
      } catch (err) {
        onAuthExpired(err);
        setError(err instanceof ApiError ? err.message : '问诊会话加载失败');
      }
    };

    void bootstrap();
  }, []);

  useEffect(() => {
    if (!selectedSession) return;

    api
      .listMessages(selectedSession.id)
      .then((response) => setMessages(response.items))
      .catch((err) => {
        onAuthExpired(err);
        setError(err instanceof ApiError ? err.message : '消息加载失败');
      });
  }, [selectedSession?.id]);

  const refreshSessions = async (preferredId?: number) => {
    const response = await api.listConsultations();
    setSessions(response.items);
    if (preferredId) {
      onSelectSession(preferredId);
    }
  };

  const handleCreateSession = async () => {
    try {
      const session = await api.createConsultation();
      setMessages([]);
      await refreshSessions(session.id);
    } catch (err) {
      onAuthExpired(err);
      setError(err instanceof ApiError ? err.message : '会话创建失败');
    }
  };

  const handleDeleteSession = async (sessionId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    if (isDeletingSession) return;

    setIsDeletingSession(true);
    setError('');
    try {
      await api.deleteConsultation(sessionId);
      const response = await api.listConsultations();
      let items = response.items;
      if (!items.length) {
        const created = await api.createConsultation();
        items = [created];
      }
      setSessions(items);

      if (selectedSession?.id === sessionId) {
        setMessages([]);
        onSelectSession(items[0]?.id ?? null);
      }
    } catch (err) {
      onAuthExpired(err);
      setError(err instanceof ApiError ? err.message : '历史记录删除失败');
    } finally {
      setIsDeletingSession(false);
    }
  };

  const handleExportReport = () => {
    if (!selectedSession) return;

    const reportLines = [
      '临床智能问诊报告',
      `会话：${selectedSession.title}`,
      `生成时间：${new Date().toLocaleString('zh-CN')}`,
      '',
      '问诊记录',
      ...messages.map((message) => {
        const role = message.sender === 'user' ? '我' : '智能医生';
        return `[${new Date(message.createdAt).toLocaleString('zh-CN')}] ${role}：\n${message.content}`;
      }),
    ];
    const blob = new Blob([reportLines.join('\n\n')], { type: 'text/plain;charset=utf-8' });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `问诊报告-${selectedSession.id}.txt`;
    link.click();
    URL.revokeObjectURL(downloadUrl);
  };

  const handleSend = async () => {
    if (!inputValue.trim() || !selectedSession || isSubmitting) return;

    const content = inputValue.trim();
    const temporaryUserMessage: ConsultationMessage = {
      id: -Date.now(),
      sessionId: selectedSession.id,
      sender: 'user',
      content,
      contextData: null,
      createdAt: new Date().toISOString(),
    };

    setIsSubmitting(true);
    setError('');
    setInputValue('');
    setMessages((current) => [...current, temporaryUserMessage]);
    try {
      const response = await api.sendMessage(selectedSession.id, {
        content,
        queryType,
        topK,
        temperature,
        modelType,
        modelName,
        llmBaseUrl,
        apiKey: apiKey || undefined,
      });
      setMessages((current) => [
        ...current.map((message) => (message.id === temporaryUserMessage.id ? response.userMessage : message)),
        response.systemMessage,
      ]);
      await refreshSessions(selectedSession.id);
    } catch (err) {
      onAuthExpired(err);
      setError(err instanceof ApiError ? err.message : '消息发送失败');
      setInputValue(content);
      setMessages((current) => current.filter((message) => message.id !== temporaryUserMessage.id));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegenerate = async (messageId: number) => {
    if (!selectedSession || isSubmitting || regeneratingMessageId !== null) return;

    setRegeneratingMessageId(messageId);
    setError('');
    try {
      const systemMessage = await api.regenerateMessage(selectedSession.id, messageId, {
        queryType,
        topK,
        temperature,
        modelType,
        modelName,
        llmBaseUrl,
        apiKey: apiKey || undefined,
      });
      const groupKey = getAnswerGroupKey(systemMessage) ?? String(systemMessage.id);
      setMessages((current) => {
        const nextMessages = [...current, systemMessage];
        const nextIndex = nextMessages.filter((message) => getAnswerGroupKey(message) === groupKey).length - 1;
        setAnswerVersionByGroup((currentVersions) => ({
          ...currentVersions,
          [groupKey]: Math.max(nextIndex, 0),
        }));
        return nextMessages;
      });
      await refreshSessions(selectedSession.id);
    } catch (err) {
      onAuthExpired(err);
      setError(err instanceof ApiError ? err.message : '重新回答失败');
    } finally {
      setRegeneratingMessageId(null);
    }
  };

  const handleSelectAnswerVersion = (groupKey: string, direction: -1 | 1, versionCount: number) => {
    setAnswerVersionByGroup((current) => {
      const currentIndex = current[groupKey] ?? versionCount - 1;
      const nextIndex = Math.min(Math.max(currentIndex + direction, 0), versionCount - 1);
      return { ...current, [groupKey]: nextIndex };
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleMiniGraphZoom = (factor: number) => {
    const cy = miniGraphRef.current;
    if (!cy) return;

    cy.zoom({
      level: Math.min(Math.max(cy.zoom() * factor, cy.minZoom()), cy.maxZoom()),
      renderedPosition: {
        x: cy.width() / 2,
        y: cy.height() / 2,
      },
    });
  };

  return (
    <div className="pt-16 flex h-screen bg-surface overflow-hidden">
      <aside className="hidden lg:flex w-72 flex-col p-6 bg-surface-container-low border-r-0 h-full overflow-y-auto">
        <div className="mb-8">
          <h2 className="text-base font-bold text-on-surface mb-4">参数设置</h2>
          <div className="rounded-xl bg-white border border-outline-variant/20 p-4 space-y-5">
            <div>
              <p className="text-[11px] font-bold text-outline uppercase tracking-widest mb-3">选择查询类型</p>
              <div className="grid grid-cols-2 gap-2">
                {(['疾病', '症状'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setQueryType(type)}
                    className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                      queryType === type
                        ? 'bg-primary text-on-primary border-primary'
                        : 'bg-surface-container-low text-on-surface-variant border-outline-variant/20'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="text-[11px] font-bold text-outline uppercase tracking-widest mb-2 block">返回结果数量 Top K</span>
              <select
                value={topK}
                onChange={(event) => setTopK(Number(event.target.value))}
                className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-low px-3 py-2 text-xs font-semibold"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-[11px] font-bold text-outline uppercase tracking-widest mb-2 block">选择模型类型</span>
              <select
                value={modelType}
                onChange={(event) => setModelType(event.target.value as 'AliyunBailian' | 'Ollama')}
                className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-low px-3 py-2 text-xs font-semibold"
              >
                <option value="AliyunBailian">阿里云百炼</option>
                <option value="Ollama">Ollama</option>
              </select>
            </label>

            {modelType === 'AliyunBailian' ? (
              <>
                <label className="block">
                  <span className="text-[11px] font-bold text-outline uppercase tracking-widest mb-2 block">阿里云百炼 API Key</span>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                    placeholder="留空使用 .env 配置"
                    className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-low px-3 py-2 text-xs font-semibold"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] font-bold text-outline uppercase tracking-widest mb-2 block">百炼 API URL</span>
                  <input
                    value={llmBaseUrl}
                    onChange={(event) => setLlmBaseUrl(event.target.value)}
                    className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-low px-3 py-2 text-xs font-semibold"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] font-bold text-outline uppercase tracking-widest mb-2 block">选择阿里云百炼模型</span>
                  <select
                    value={modelName}
                    onChange={(event) => setModelName(event.target.value)}
                    className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-low px-3 py-2 text-xs font-semibold"
                  >
                    {ALIYUN_MODEL_OPTIONS.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : (
              <>
                <label className="block">
                  <span className="text-[11px] font-bold text-outline uppercase tracking-widest mb-2 block">选择 Ollama 模型</span>
                  <select
                    value={modelName}
                    onChange={(event) => setModelName(event.target.value)}
                    className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-low px-3 py-2 text-xs font-semibold"
                  >
                    {OLLAMA_MODEL_OPTIONS.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-[11px] font-bold text-outline uppercase tracking-widest mb-2 block">Ollama API URL</span>
                  <input
                    value={llmBaseUrl}
                    onChange={(event) => setLlmBaseUrl(event.target.value)}
                    className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-low px-3 py-2 text-xs font-semibold"
                  />
                </label>
              </>
            )}

            <label className="block">
              <span className="text-[11px] font-bold text-outline uppercase tracking-widest mb-2 block">温度 Temperature：{temperature.toFixed(1)}</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onChange={(event) => setTemperature(Number(event.target.value))}
                className="w-full accent-primary"
              />
            </label>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-on-surface">历史查询</h2>
            <button onClick={handleCreateSession} className="text-xs font-semibold text-primary">
              新建
            </button>
          </div>
          <div className="space-y-3">
            {sessions.length ? (
              sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => onSelectSession(session.id)}
                  className={`p-4 rounded-lg border transition-all cursor-pointer bg-white ${
                    selectedSession?.id === session.id
                      ? 'border-primary/40'
                      : 'border-outline-variant/30 hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-outline mb-2">{new Date(session.lastMessageAt).toLocaleString('zh-CN')}</p>
                      <p className="text-sm font-bold text-on-surface truncate">{session.title}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => void handleDeleteSession(session.id, event)}
                      disabled={isDeletingSession}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-outline hover:text-error hover:bg-error-container transition-colors disabled:opacity-50"
                      aria-label="删除历史查询"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg bg-white border border-outline-variant/20 p-4 text-xs text-outline">
                暂无历史查询记录
              </div>
            )}
          </div>
        </div>
      </aside>

      <section className="flex-grow flex flex-col relative bg-white lg:rounded-tl-3xl overflow-hidden shadow-2xl shadow-slate-200/50">
        <div className="px-8 py-4 flex items-center justify-between bg-white border-b border-surface-container">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-on-surface">智能医生</h2>
              <p className="text-xs text-tertiary flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
                在线为您服务
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportReport}
              disabled={!messages.length}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-surface-container-low text-secondary hover:bg-surface-container transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              导出报告
            </button>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto p-8 space-y-8">
          {renderItems.map((item, index) => {
            if (item.kind === 'answerGroup') {
              const versionCount = item.messages.length;
              const selectedVersionIndex = Math.min(answerVersionByGroup[item.groupKey] ?? versionCount - 1, versionCount - 1);
              const msg = item.messages[selectedVersionIndex];

              return (
                <div key={item.groupKey} className="flex gap-4 max-w-3xl">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center overflow-hidden bg-primary-container/20">
                    <Bot className="text-primary w-4 h-4" />
                  </div>
                  <div className="flex-grow flex items-start gap-3">
                    <div className="flex-grow p-5 rounded-2xl rounded-tl-none bg-surface-container-low text-on-surface border-l-4 border-tertiary text-sm leading-relaxed shadow-sm">
                      {msg.content}
                      {versionCount > 1 && (
                        <div className="mt-4 flex items-center gap-2 text-xs text-outline">
                          <button
                            type="button"
                            onClick={() => handleSelectAnswerVersion(item.groupKey, -1, versionCount)}
                            disabled={selectedVersionIndex === 0}
                            className="w-7 h-7 rounded-lg bg-white border border-outline-variant/30 flex items-center justify-center text-primary disabled:opacity-40"
                            aria-label="上一条回答"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <span className="font-bold text-on-surface-variant">
                            {selectedVersionIndex + 1} / {versionCount}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSelectAnswerVersion(item.groupKey, 1, versionCount)}
                            disabled={selectedVersionIndex === versionCount - 1}
                            className="w-7 h-7 rounded-lg bg-white border border-outline-variant/30 flex items-center justify-center text-primary disabled:opacity-40"
                            aria-label="下一条回答"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      {msg.contextData && (
                        <details className="mt-4 rounded-lg bg-white border border-outline-variant/30 p-3">
                          <summary className="cursor-pointer text-xs font-bold text-primary">查看详细结果</summary>
                          <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed text-on-surface-variant">
                            {JSON.stringify(msg.contextData.contexts ?? msg.contextData, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleRegenerate(Number(msg.id))}
                      disabled={isSubmitting || regeneratingMessageId !== null}
                      className="mt-1 px-3 py-2 rounded-lg bg-white border border-outline-variant/30 text-xs font-bold text-primary hover:border-primary transition-colors disabled:opacity-50 flex items-center gap-1 whitespace-nowrap"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${regeneratingMessageId === Number(msg.id) ? 'animate-spin' : ''}`} />
                      {regeneratingMessageId === Number(msg.id) ? '回答中' : '重新回答'}
                    </button>
                  </div>
                </div>
              );
            }

            const msg = item.message;
            return (
              <div key={msg.id} className={`flex gap-4 max-w-3xl ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center overflow-hidden ${msg.sender === 'system' ? 'bg-primary-container/20' : 'bg-primary'}`}>
                  {msg.sender === 'system' ? <Bot className="text-primary w-4 h-4" /> : <span className="text-white text-xs font-bold">我</span>}
                </div>
                <div className={`${msg.sender === 'system' ? 'flex-grow' : ''}`}>
                  <div
                    className={`p-5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      msg.sender === 'system'
                        ? 'rounded-tl-none bg-surface-container-low text-on-surface border-l-4 border-tertiary'
                        : 'rounded-tr-none bg-primary text-on-primary shadow-md'
                    }`}
                  >
                    {msg.sender === 'system' && index === 0 && (
                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-2 py-0.5 rounded bg-tertiary text-[10px] text-white font-bold uppercase">问诊助手</span>
                        <span className="text-xs text-outline">消息已接入本地数据库</span>
                      </div>
                    )}
                    {msg.content}
                    {msg.sender === 'system' && index === 0 && (
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        {CHAT_SUGGESTIONS.slice(0, 2).map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => setInputValue(suggestion)}
                            className="p-3 rounded-lg bg-white border border-outline-variant/30 text-xs font-medium hover:text-primary hover:border-primary cursor-pointer transition-all text-left"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {isSubmitting && (
            <div className="flex gap-4 max-w-3xl">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-container/20 flex items-center justify-center">
                <Bot className="text-primary w-4 h-4" />
              </div>
              <div className="p-4 rounded-2xl rounded-tl-none bg-surface-container-low flex gap-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-outline animate-bounce"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-outline animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-outline animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
          )}

          {error && <div className="max-w-3xl px-4 py-3 rounded-lg bg-error-container text-error text-sm">{error}</div>}
          <div ref={messagesEndRef} />
        </div>

        <div className="px-8 pb-8 pt-4">
          <div className="max-w-4xl mx-auto relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 to-tertiary/10 rounded-2xl blur opacity-25 group-focus-within:opacity-100 transition duration-1000"></div>
            <div className="relative bg-white border border-surface-container-highest rounded-2xl p-2 shadow-sm">
              <div className="flex items-end gap-2 px-2">
                <button onClick={handleCreateSession} className="p-2 text-outline hover:text-primary transition-colors">
                  <PlusCircle className="w-5 h-5" />
                </button>
                <textarea
                  className="flex-grow py-3 px-2 bg-transparent border-none focus:ring-0 resize-none text-sm min-h-[48px] max-h-32"
                  placeholder="请描述您的症状（如：哪里不舒服、持续多久了...）"
                  rows={1}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyPress}
                ></textarea>
                <div className="flex items-center gap-1 mb-1">
                  <button
                    onClick={() => void handleSend()}
                    disabled={!inputValue.trim() || isSubmitting}
                    className="ml-2 w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center px-4 mt-2">
              <p className="text-[10px] text-outline italic">温馨提示：AI 问诊仅供参考，不作为最终医疗决策依据。</p>
              <div className="flex gap-4">
                <span className="text-[10px] font-medium text-tertiary flex items-center gap-1">
                  <Verified className="w-3 h-3" />
                  临床数据已更新
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <aside className="hidden xl:flex w-80 flex-col p-6 bg-surface-container-low border-l border-surface-container-highest/30">
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-4 border border-outline-variant/30 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">关联医学图谱</h3>
              <button
                type="button"
                onClick={() => onNavigate('knowledge-graph')}
                className="text-[10px] font-semibold text-primary hover:underline"
              >
                查看全部知识图谱 &gt;
              </button>
            </div>
            <div className="relative bg-[#f9fafb] rounded-xl border border-dashed border-outline-variant/50 h-44 overflow-hidden flex items-center justify-center">
              {activeGraphData ? (
                <>
                  <div ref={miniGraphContainerRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />
                  <div className="pointer-events-none absolute left-3 top-2 text-[9px] font-semibold text-outline/70">
                    Neo4j Top1 · 拖动节点
                  </div>
                  {!isMiniGraphReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/55 text-[10px] text-outline">
                      正在初始化 Neo4j 图谱...
                    </div>
                  )}
                  <div className="absolute right-2 bottom-2 bg-white border border-outline-variant/20 rounded-lg shadow-md overflow-hidden">
                    <button
                      type="button"
                      onClick={() => handleMiniGraphZoom(1.2)}
                      className="w-7 h-7 flex items-center justify-center text-primary hover:bg-surface-container-low border-b border-outline-variant/20"
                      aria-label="放大关联医学图谱"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMiniGraphZoom(0.84)}
                      className="w-7 h-7 flex items-center justify-center text-primary hover:bg-surface-container-low"
                      aria-label="缩小关联医学图谱"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="px-6 text-center">
                  <Network className="w-6 h-6 text-outline mx-auto mb-2" />
                  <p className="text-[10px] text-outline leading-relaxed">发送问题后，这里会展示 Neo4j 向量检索 Top1 的关联图谱。</p>
                </div>
              )}
            </div>
            <p className="mt-3 text-[10px] text-outline-variant leading-relaxed">
              {activeGraphData
                ? `当前展示与问题最相似的 Top1 ${activeGraphData.queryType}节点：${activeGraphData.title}。可拖动节点调整图谱。`
                : '图谱会根据本次问诊问题的向量相似度，从 Neo4j 中选取 Top1 结果展示。'}
            </p>
          </div>

          <div className="mt-auto p-4 border border-dashed border-outline-variant rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="text-outline w-4 h-4" />
              <span className="text-xs font-bold text-outline">隐私保护</span>
            </div>
            <p className="text-[10px] text-outline-variant leading-relaxed">
              您的所有咨询记录均经过加密处理，仅用于提供医疗建议，不会泄露给任何第三方机构。
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
