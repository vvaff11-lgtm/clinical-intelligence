import type { Core, ElementDefinition } from 'cytoscape';
import { ArrowLeft, Focus, Minus, Network, Plus, RotateCcw, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError } from '../lib/api';
import type { FullKnowledgeGraph, Page } from '../types';

interface KnowledgeGraphProps {
  onNavigate: (page: Page) => void;
  onAuthExpired: (error: unknown) => void;
}

function getNodeColor(type: string) {
  if (type === '*' || type === 'Node') return '#b99de0';
  if (type.includes('Check') || type.includes('检查')) return '#f6bf16';
  if (type.includes('Department') || type.includes('科')) return '#8fc7cc';
  if (type.includes('Disease') || type.includes('疾病')) return '#8bd0f7';
  if (type.includes('Drug') || type.includes('药')) return '#55aee8';
  if (type.includes('Food') || type.includes('食物')) return '#c5ad9c';
  if (type.includes('Producer') || type.includes('生产商')) return '#18c985';
  if (type.includes('Symptom') || type.includes('症状')) return '#b08ac8';
  return '#aeb4bd';
}

function buildInitialPosition(index: number, total: number) {
  const columns = Math.ceil(Math.sqrt(total || 1));
  const row = Math.floor(index / columns);
  const column = index % columns;
  const cellWidth = 1500 / Math.max(columns, 1);
  const cellHeight = 1000 / Math.max(Math.ceil(total / columns), 1);
  return {
    x: 80 + column * cellWidth + cellWidth * 0.4,
    y: 80 + row * cellHeight + cellHeight * 0.4,
  };
}

export default function KnowledgeGraph({ onNavigate, onAuthExpired }: KnowledgeGraphProps) {
  const [graph, setGraph] = useState<FullKnowledgeGraph | null>(null);
  const [selectedNode, setSelectedNode] = useState<{ label: string; type: string; degree: number } | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isGraphReady, setIsGraphReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  const elements = useMemo<ElementDefinition[]>(() => {
    if (!graph) return [];

    const nodeElements = graph.nodes.map((node, index) => ({
      data: {
        id: node.id,
        label: node.label,
        type: node.type,
        color: getNodeColor(node.type),
      },
      position: buildInitialPosition(index, graph.nodes.length),
    }));
    const edgeElements = graph.edges.map((edge, index) => ({
      data: {
        id: `${edge.source}-${edge.target}-${edge.label}-${index}`,
        source: edge.source,
        target: edge.target,
        label: edge.label,
      },
    }));

    return [...nodeElements, ...edgeElements];
  }, [graph]);

  const nodeTypeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    graph?.nodes.forEach((node) => counts.set(node.type, (counts.get(node.type) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [graph]);

  const relationshipCounts = useMemo(() => {
    const counts = new Map<string, number>();
    graph?.edges.forEach((edge) => counts.set(edge.label, (counts.get(edge.label) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [graph]);

  useEffect(() => {
    api
      .getKnowledgeGraph()
      .then((response) => setGraph(response))
      .catch((err) => {
        onAuthExpired(err);
        setError(err instanceof ApiError ? err.message : '知识图谱加载失败');
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!containerRef.current || !elements.length) return;

    cyRef.current?.destroy();
    setIsGraphReady(false);
    let cancelled = false;

    void import('cytoscape').then(({ default: cytoscape }) => {
      if (cancelled || !containerRef.current) return;
      const container = containerRef.current;

      const cy = cytoscape({
        container,
        elements,
        minZoom: 0.08,
        maxZoom: 4,
        wheelSensitivity: 0.22,
        boxSelectionEnabled: true,
        style: [
        {
          selector: 'node',
          style: {
            'background-color': 'data(color)',
            label: 'data(label)',
            color: '#111827',
            'font-size': 9,
            'font-weight': 700,
            'text-valign': 'bottom',
            'text-halign': 'center',
            'text-margin-y': 8,
            width: 22,
            height: 22,
            'overlay-padding': 6,
          },
        },
          {
            selector: 'edge',
            style: {
              width: 0.7,
              'line-color': '#a7adb8',
              'target-arrow-color': '#a7adb8',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              opacity: 0.38,
              label: 'data(label)',
              'font-size': 5,
              color: '#6b7280',
              'text-rotation': 'autorotate',
              'text-margin-y': -4,
            },
          },
          {
            selector: 'node:selected',
            style: {
              'border-width': 4,
              'border-color': '#ffffff',
              'border-opacity': 0.95,
              'underlay-color': '#0046a8',
              'underlay-opacity': 0.22,
              'underlay-padding': 12,
            },
          },
          {
            selector: '.dim',
            style: {
              opacity: 0.12,
            },
          },
        {
          selector: '.highlight',
          style: {
            opacity: 1,
            width: 30,
            height: 30,
            'font-size': 11,
          },
        },
          {
            selector: 'edge.highlight',
            style: {
              width: 2,
              opacity: 0.82,
              'line-color': '#0046a8',
              'target-arrow-color': '#0046a8',
            },
          },
        ],
        layout: {
          name: 'grid',
          fit: true,
          padding: 70,
          avoidOverlap: true,
        },
      });

      cy.on('tap', 'node', (event) => {
        const node = event.target;
        const closedNeighborhood = node.closedNeighborhood();
        cy.elements().addClass('dim');
        closedNeighborhood.removeClass('dim').addClass('highlight');
        setSelectedNode({
          label: String(node.data('label')),
          type: String(node.data('type')),
          degree: node.degree(false),
        });
      });

      cy.on('tap', (event) => {
        if (event.target === cy) {
          cy.elements().removeClass('dim highlight');
          setSelectedNode(null);
        }
      });

      cyRef.current = cy;
      requestAnimationFrame(() => {
        if (cancelled) return;
        cy.resize();
        cy.fit(undefined, 70);
        setIsGraphReady(true);
      });
    }).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : '图谱画布初始化失败');
      setIsGraphReady(false);
    });

    return () => {
      cancelled = true;
      cyRef.current?.destroy();
      cyRef.current = null;
    };
  }, [elements]);

  const handleFit = () => {
    cyRef.current?.fit(undefined, 70);
  };

  const handleZoom = (factor: number) => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.zoom({
      level: Math.min(Math.max(cy.zoom() * factor, cy.minZoom()), cy.maxZoom()),
      renderedPosition: {
        x: cy.width() / 2,
        y: cy.height() / 2,
      },
    });
  };

  const handleRelayout = () => {
    cyRef.current
      ?.layout({
        name: 'cose',
        animate: true,
        animationDuration: 700,
        fit: true,
        padding: 80,
        nodeRepulsion: 8500,
        idealEdgeLength: 90,
        edgeElasticity: 90,
        gravity: 0.25,
        numIter: 1400,
      })
      .run();
  };

  const handleSearch = () => {
    const keyword = searchValue.trim();
    const cy = cyRef.current;
    if (!keyword || !cy) return;

    const matchedNode = cy.nodes().filter((node) => String(node.data('label')).includes(keyword))[0];
    if (!matchedNode) return;

    cy.elements().removeClass('dim highlight');
    matchedNode.select();
    matchedNode.closedNeighborhood().addClass('highlight');
    cy.animate({
      center: { eles: matchedNode },
      zoom: Math.max(cy.zoom(), 1.4),
      duration: 450,
    });
    setSelectedNode({
      label: String(matchedNode.data('label')),
      type: String(matchedNode.data('type')),
      degree: matchedNode.degree(false),
    });
  };

  return (
    <div className="pt-16 h-screen bg-surface overflow-hidden">
      <main className="h-full p-6">
        <div className="h-full max-w-[1800px] mx-auto flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <button
                onClick={() => onNavigate('chat')}
                className="mb-3 text-sm font-bold text-primary flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                返回智能问诊
              </button>
              <h1 className="font-headline text-3xl font-black text-on-surface">全部知识图谱</h1>
              <p className="text-sm text-on-surface-variant mt-2">
                Neo4j 返回的医疗知识图谱，支持缩放、平移、拖拽节点、点击高亮邻居。
              </p>
            </div>
            {graph && (
              <div className="text-right text-xs text-outline">
                <p>节点：{graph.totalNodes}</p>
                <p>关系：{graph.totalEdges}</p>
                {graph.limited && <p className="text-primary font-bold">当前为安全上限内数据</p>}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2 flex-1 max-w-xl">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-outline absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') handleSearch();
                  }}
                  placeholder="搜索节点名称"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-outline-variant/20 bg-white text-sm"
                />
              </div>
              <button onClick={handleSearch} className="px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-bold">
                搜索
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleFit} className="px-4 py-2 rounded-lg bg-white border border-outline-variant/20 text-sm font-bold text-primary flex items-center gap-2">
                <Focus className="w-4 h-4" />
                适配视图
              </button>
              <button onClick={handleRelayout} className="px-4 py-2 rounded-lg bg-white border border-outline-variant/20 text-sm font-bold text-primary flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                重新布局
              </button>
            </div>
          </div>

          <div className="flex-1 bg-white rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden relative flex">
            <div className="relative flex-1 min-w-0 bg-[#f9fafb]">
              <div ref={containerRef} className="absolute inset-0 w-full h-full" />
              {graph && (
                <div className="absolute right-5 bottom-5 bg-white border border-outline-variant/20 rounded-lg shadow-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => handleZoom(1.2)}
                    className="w-10 h-10 flex items-center justify-center text-primary hover:bg-surface-container-low border-b border-outline-variant/20"
                    aria-label="放大图谱"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleZoom(0.84)}
                    className="w-10 h-10 flex items-center justify-center text-primary hover:bg-surface-container-low"
                    aria-label="缩小图谱"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                </div>
              )}
              {graph && !isGraphReady && !error && (
                <div className="absolute inset-0 flex items-center justify-center text-outline text-sm bg-white/60">
                  正在初始化图谱画布...
                </div>
              )}
            </div>
            {graph && (
              <aside className="w-80 border-l border-outline-variant/20 bg-white p-5 overflow-y-auto">
                <h2 className="font-headline font-bold text-lg text-on-surface mb-1">Results overview</h2>
                <p className="text-sm text-on-surface-variant mb-5">Nodes ({graph.totalNodes})</p>
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="px-3 py-1 rounded-full bg-surface-container-highest text-on-surface text-xs font-bold">
                    * ({graph.totalNodes})
                  </span>
                  {nodeTypeCounts.map(([type, count]) => (
                    <span
                      key={type}
                      className="px-3 py-1 rounded-full text-white text-xs font-bold"
                      style={{ backgroundColor: getNodeColor(type) }}
                    >
                      {type} ({count})
                    </span>
                  ))}
                </div>
                <p className="text-sm text-on-surface-variant mb-3">Relationships ({graph.totalEdges})</p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded bg-surface-container-highest text-on-surface text-xs font-bold">
                    * ({graph.totalEdges})
                  </span>
                  {relationshipCounts.map(([type, count]) => (
                    <span key={type} className="px-3 py-1 rounded bg-surface-container-highest text-on-surface text-xs font-bold">
                      {type} ({count})
                    </span>
                  ))}
                </div>
                {selectedNode && (
                  <div className="mt-8 rounded-xl bg-surface-container-low border border-outline-variant/20 p-4">
                    <p className="text-xs font-bold text-outline uppercase tracking-widest mb-2">当前节点</p>
                    <h3 className="font-headline font-black text-lg text-on-surface break-words">{selectedNode.label}</h3>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-outline mb-1">类型</p>
                        <p className="font-bold text-on-surface">{selectedNode.type}</p>
                      </div>
                      <div>
                        <p className="text-outline mb-1">关系数</p>
                        <p className="font-bold text-on-surface">{selectedNode.degree}</p>
                      </div>
                    </div>
                  </div>
                )}
              </aside>
            )}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center text-outline text-sm bg-white/70">
                正在加载 Neo4j 图谱...
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center text-error text-sm bg-white/70">{error}</div>
            )}
            {!isLoading && !error && graph?.nodes.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-outline text-sm">
                <Network className="w-8 h-8 mb-3" />
                Neo4j 暂无可展示节点
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
