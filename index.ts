import React, { useState, useEffect } from 'react';
import { Brain, Target, AlertCircle, CheckCircle, Lightbulb, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';

// ===== TYPES =====
type FrameworkTree = Record<string, string[]>;

type FrameworkKBEntry = {
  id: string;
  name: string;
  domain: string;
  category: string;
  source: string;
  description: string;
  tags: string[];
  tree: FrameworkTree;
  embedding: number[];
};

type MindmapAnalysis = {
  your_model: { tree: FrameworkTree };
  ideal_model: { tree: FrameworkTree };
  delta: {
    missing: string[];
    misprioritized: string[];
    redundant: string[];
  };
  fix_summary: string;
};

type BodyLanguageFeatures = {
  warmth: number;
  competence: number;
  affect: number;
  eyeContactRatio: number;
  gestureIntensity: number;
  postureStability: number;
};

// ===== FRAMEWORKS DATA (from casebook) =====
const FRAMEWORKS_SEED: Omit<FrameworkKBEntry, 'embedding'>[] = [
  {
    id: "profitability",
    name: "Profitability Framework",
    domain: "consulting",
    category: "case_type",
    source: "Consulting Casebook",
    description: "Break profit into revenue and cost drivers. Analyze revenue (price x volume) and costs (fixed and variable). Consider market size, competition, and customer segments.",
    tags: ["profitability", "revenue", "costs", "pricing", "volume"],
    tree: {
      "Profit": ["Revenue", "Costs"],
      "Revenue": ["Price", "Volume"],
      "Costs": ["Fixed Costs", "Variable Costs"],
      "Price": ["Pricing Strategy", "Market Position"],
      "Volume": ["Market Share", "Market Size"],
      "Fixed Costs": ["Rent", "Salaries", "Overhead"],
      "Variable Costs": ["COGS", "Commission", "Materials"]
    }
  },
  {
    id: "market_entry",
    name: "Market Entry Framework",
    domain: "consulting",
    category: "case_type",
    source: "Consulting Casebook",
    description: "Evaluate market attractiveness, competitive landscape, and company capabilities. Consider barriers to entry, customer segments, and distribution channels.",
    tags: ["market entry", "strategy", "competition", "capabilities"],
    tree: {
      "Market Entry": ["Market Attractiveness", "Competitive Landscape", "Company Capabilities"],
      "Market Attractiveness": ["Market Size", "Growth Rate", "Profitability"],
      "Competitive Landscape": ["Number of Players", "Market Share", "Barriers to Entry"],
      "Company Capabilities": ["Resources", "Core Competencies", "Distribution"]
    }
  },
  {
    id: "growth",
    name: "Growth Strategy Framework",
    domain: "consulting",
    category: "case_type",
    source: "Consulting Casebook",
    description: "Analyze growth opportunities through market penetration, market development, product development, and diversification strategies.",
    tags: ["growth", "strategy", "expansion", "market development"],
    tree: {
      "Growth": ["Organic Growth", "Inorganic Growth"],
      "Organic Growth": ["Market Penetration", "Market Development", "Product Development"],
      "Inorganic Growth": ["Acquisition", "Joint Venture", "Partnership"],
      "Market Penetration": ["Increase Usage", "Win Competitors"],
      "Market Development": ["New Geographies", "New Segments"]
    }
  },
  {
    id: "ma",
    name: "M&A Framework",
    domain: "consulting",
    category: "case_type",
    source: "Consulting Casebook",
    description: "Evaluate merger and acquisition opportunities by assessing standalone value, synergies, financials, and integration risks.",
    tags: ["M&A", "acquisition", "valuation", "synergies"],
    tree: {
      "M&A": ["Stand Alone Value", "Value in Combination", "Execution Risk"],
      "Stand Alone Value": ["Target Financials", "Market Position"],
      "Value in Combination": ["Cost Synergies", "Revenue Synergies"],
      "Execution Risk": ["Integration", "Cultural Fit", "Timeline"]
    }
  },
  {
    id: "pricing",
    name: "Pricing Framework",
    domain: "consulting",
    category: "case_type",
    source: "Consulting Casebook",
    description: "Determine optimal pricing strategy by analyzing customers, product value, competition, and costs.",
    tags: ["pricing", "strategy", "value", "competition"],
    tree: {
      "Pricing": ["Customer Analysis", "Product Value", "Competition", "Costs"],
      "Customer Analysis": ["Willingness to Pay", "Price Sensitivity", "Segments"],
      "Product Value": ["Differentiation", "Quality", "Brand"],
      "Competition": ["Competitor Pricing", "Market Position"]
    }
  }
];

// ===== SERVICES =====
function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const normB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
  if (normA === 0 || normB === 0) return 0;
  return dot / (normA * normB);
}

function getTextEmbedding(text: string): number[] {
  const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return Array.from({ length: 128 }, (_, i) => Math.sin(hash * (i + 1)) * 0.5 + 0.5);
}

class FrameworkStore {
  private kb: FrameworkKBEntry[] = [];

  async seed() {
    this.kb = FRAMEWORKS_SEED.map(fw => ({
      ...fw,
      embedding: getTextEmbedding(
        `${fw.name} ${fw.description} ${fw.tags.join(',')} ${JSON.stringify(fw.tree)}`
      )
    }));
  }

  async search(queryEmbedding: number[], topK = 3) {
    const scored = this.kb.map(entry => ({
      entry,
      score: cosineSimilarity(queryEmbedding, entry.embedding)
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }
}

const store = new FrameworkStore();

async function matchFramework(transcript: string) {
  const queryText = `Candidate consulting case answer: ${transcript}`;
  const queryEmbedding = getTextEmbedding(queryText);
  return await store.search(queryEmbedding, 3);
}

async function analyzeMindmapWithClaude(
  transcript: string,
  framework: FrameworkKBEntry,
  bodyLanguage: BodyLanguageFeatures
): Promise<MindmapAnalysis> {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Do NOT hardcode API keys in source. Use an environment variable instead and keep secrets out of the repo.
        // Set ANTHROPIC_API_KEY in your environment or CI secret store before running.
        "x-api-key": process.env.ANTHROPIC_API_KEY || "REDACTED",
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: `You are an expert consulting case coach analyzing a candidate's mental model.

CANDIDATE'S ANSWER:
${transcript}

IDEAL FRAMEWORK (${framework.name}):
${JSON.stringify(framework.tree, null, 2)}

BODY LANGUAGE ASSESSMENT:
${JSON.stringify(bodyLanguage, null, 2)}

TASK: Analyze the candidate's mental model and return ONLY valid JSON (no markdown, no backticks) with this exact structure:

{
  "your_model": {
    "tree": { "ParentConcept": ["child1", "child2"], ... }
  },
  "ideal_model": {
    "tree": ${JSON.stringify(framework.tree)}
  },
  "delta": {
    "missing": ["concept1", "concept2"],
    "misprioritized": ["concept3"],
    "redundant": []
  },
  "fix_summary": "Brief actionable feedback in 1-2 sentences"
}

Extract the hierarchical structure from the candidate's answer. Identify which concepts from the ideal framework they mentioned and which they missed. Return ONLY the JSON object.`
          }
        ]
      })
    });

    const data = await response.json();
    
    if (data.content && data.content[0] && data.content[0].text) {
      let text = data.content[0].text.trim();
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      const parsed = JSON.parse(text);
      return parsed;
    }
    
    throw new Error("Invalid response from Claude API");
  } catch (error) {
    console.error("Claude API error:", error);
    // Fallback to simple analysis
    return simpleFallbackAnalysis(transcript, framework);
  }
}

function simpleFallbackAnalysis(transcript: string, framework: FrameworkKBEntry): MindmapAnalysis {
  const words = transcript.toLowerCase();
  const mentionedConcepts = new Set<string>();
  
  Object.keys(framework.tree).forEach(parent => {
    if (words.includes(parent.toLowerCase())) {
      mentionedConcepts.add(parent);
    }
    framework.tree[parent]?.forEach(child => {
      if (words.includes(child.toLowerCase())) {
        mentionedConcepts.add(child);
      }
    });
  });

  const yourTree: FrameworkTree = {};
  Object.entries(framework.tree).forEach(([parent, children]) => {
    if (mentionedConcepts.has(parent)) {
      yourTree[parent] = children.filter(c => mentionedConcepts.has(c));
    }
  });

  const allIdealNodes = new Set([
    ...Object.keys(framework.tree),
    ...Object.values(framework.tree).flat()
  ]);
  
  const allUserNodes = new Set([
    ...Object.keys(yourTree),
    ...Object.values(yourTree).flat()
  ]);

  const missing = Array.from(allIdealNodes).filter(n => !allUserNodes.has(n));
  
  return {
    your_model: { tree: yourTree },
    ideal_model: { tree: framework.tree },
    delta: { missing, misprioritized: [], redundant: [] },
    fix_summary: `You covered ${allUserNodes.size} out of ${allIdealNodes.size} key concepts. Focus on: ${missing.slice(0, 3).join(', ')}`
  };
}

// ===== TREE COMPONENT =====
const TreeNode: React.FC<{
  label: string;
  children?: string[];
  status: string;
  expanded: boolean;
  onToggle: () => void;
  hasChildren: boolean;
}> = ({ label, children, status, expanded, onToggle, hasChildren }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'matched': return 'bg-green-100 border-green-500 text-green-900';
      case 'missing': return 'bg-red-100 border-red-500 text-red-900';
      case 'misprioritized': return 'bg-yellow-100 border-yellow-500 text-yellow-900';
      case 'redundant': return 'bg-slate-200 border-slate-500 text-slate-900';
      default: return 'bg-slate-100 border-slate-400 text-slate-700';
    }
  };

  return (
    <div className="mb-2">
      <div className="flex items-center gap-2">
        {hasChildren && (
          <button onClick={onToggle} className="text-slate-600 hover:text-slate-900">
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        )}
        {!hasChildren && <div className="w-4" />}
        <div className={`px-4 py-2 rounded-lg border-2 font-medium text-sm ${getStatusColor()} transition-all hover:shadow-md`}>
          {label}
        </div>
      </div>
      {expanded && children && children.length > 0 && (
        <div className="ml-8 mt-2 pl-4 border-l-2 border-slate-300">
          {children.map(child => (
            <div key={child} className={`px-3 py-1.5 rounded-md border mb-1.5 text-sm ${
              status === 'matched' ? 'bg-green-50 border-green-400 text-green-800' :
              status === 'missing' ? 'bg-red-50 border-red-400 text-red-800' :
              status === 'misprioritized' ? 'bg-yellow-50 border-yellow-400 text-yellow-800' :
              'bg-slate-50 border-slate-300 text-slate-600'
            }`}>
              {child}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const MindMapTree: React.FC<{
  tree: FrameworkTree;
  title: string;
  subtitle: string;
  delta: MindmapAnalysis['delta'];
  type: 'user' | 'ideal';
  gradientFrom: string;
  gradientTo: string;
}> = ({ tree, title, subtitle, delta, type, gradientFrom, gradientTo }) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const getNodeStatus = (node: string): string => {
    if (type === 'ideal') {
      if (delta.missing.includes(node)) return 'missing';
      return 'normal';
    } else {
      if (delta.misprioritized.includes(node)) return 'misprioritized';
      if (delta.redundant.includes(node)) return 'redundant';
      return 'matched';
    }
  };

  const toggleExpand = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    const initialExpanded: Record<string, boolean> = {};
    Object.keys(tree).forEach(key => {
      initialExpanded[key] = true;
    });
    setExpanded(initialExpanded);
  }, [tree]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-full">
      <div className={`bg-gradient-to-r ${gradientFrom} ${gradientTo} px-6 py-4`}>
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <p className="text-sm text-white opacity-90">{subtitle}</p>
      </div>
      <div className="p-6 overflow-y-auto" style={{ maxHeight: '500px' }}>
        {Object.entries(tree).map(([parent, children]) => (
          <TreeNode
            key={parent}
            label={parent}
            children={children}
            status={getNodeStatus(parent)}
            expanded={expanded[parent] || false}
            onToggle={() => toggleExpand(parent)}
            hasChildren={children.length > 0}
          />
        ))}
      </div>
    </div>
  );
};

// ===== MAIN COMPONENT =====
export default function MindTrace() {
  const [transcript, setTranscript] = useState('I would analyze this by breaking down the profit drivers. We need to look at revenue, which comes from price and volume. Then examine our cost structure including both fixed costs like rent and salaries, and variable costs like materials.');
  const [analysis, setAnalysis] = useState<MindmapAnalysis | null>(null);
  const [matchedFramework, setMatchedFramework] = useState<FrameworkKBEntry | null>(null);
  const [matchScore, setMatchScore] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    store.seed();
  }, []);

  const analyze = async () => {
    setLoading(true);
    try {
      const matches = await matchFramework(transcript);
      const best = matches[0];
      setMatchedFramework(best.entry);
      setMatchScore(best.score);

      const bodyLanguage: BodyLanguageFeatures = {
        warmth: 0.7,
        competence: 0.75,
        affect: 0.8,
        eyeContactRatio: 0.6,
        gestureIntensity: 0.5,
        postureStability: 0.7
      };

      const result = await analyzeMindmapWithClaude(transcript, best.entry, bodyLanguage);
      setAnalysis(result);
    } catch (err) {
      console.error(err);
      alert('Analysis failed. Please try again.');
    }
    setLoading(false);
  };

  const structureScore = analysis 
    ? Math.round((1 - analysis.delta.missing.length / 
        (Object.keys(analysis.ideal_model.tree).length + Object.values(analysis.ideal_model.tree).flat().length)) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brain className="w-8 h-8 text-indigo-600" />
              <div>
                <h1 className="text-2xl font-bold text-slate-900">MindTrace</h1>
                <p className="text-sm text-slate-600">AI-Powered Mental Model Analysis</p>
              </div>
            </div>
            {matchedFramework && (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm text-slate-600">Matched Framework</div>
                  <div className="font-semibold text-slate-900">{matchedFramework.name}</div>
                  <div className="text-xs text-slate-500">Similarity: {(matchScore * 100).toFixed(1)}%</div>
                </div>
                <div className="px-4 py-2 bg-indigo-100 rounded-lg">
                  <div className="text-xs text-indigo-600 font-medium">Structure Score</div>
                  <div className="text-2xl font-bold text-indigo-700">{structureScore}%</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Candidate Transcript
          </label>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            className="w-full h-24 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            placeholder="Enter the candidate's answer transcript..."
          />
          <button
            onClick={analyze}
            disabled={loading}
            className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-slate-400 transition-colors font-medium flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Analyzing with Claude AI...' : 'Analyze Mental Model'}
          </button>
        </div>

        {analysis && (
          <>
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <h3 className="font-semibold text-red-900">Missing Concepts</h3>
                </div>
                <div className="text-2xl font-bold text-red-700 mb-1">{analysis.delta.missing.length}</div>
                <div className="text-xs text-red-600">{analysis.delta.missing.slice(0, 3).join(', ')}</div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-5 h-5 text-yellow-600" />
                  <h3 className="font-semibold text-yellow-900">Misprioritized</h3>
                </div>
                <div className="text-2xl font-bold text-yellow-700 mb-1">{analysis.delta.misprioritized.length}</div>
                <div className="text-xs text-yellow-600">{analysis.delta.misprioritized.join(', ') || 'None'}</div>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-green-900">Coverage</h3>
                </div>
                <div className="text-2xl font-bold text-green-700 mb-1">{structureScore}%</div>
                <div className="text-xs text-green-600">Structural alignment</div>
              </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mt-4">
              <div className="flex items-start gap-2">
                <Lightbulb className="w-5 h-5 text-indigo-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-indigo-900 mb-1">Coach's Insight</h3>
                  <p className="text-sm text-indigo-700">{analysis.fix_summary}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mt-6">
              <MindMapTree
                tree={analysis.your_model.tree}
                title="Your Mental Model"
                subtitle="What you articulated"
                delta={analysis.delta}
                type="user"
                gradientFrom="from-blue-500"
                gradientTo="to-blue-600"
              />
              <MindMapTree
                tree={analysis.ideal_model.tree}
                title="Ideal Mental Model"
                subtitle={matchedFramework?.name || "Reference Framework"}
                delta={analysis.delta}
                type="ideal"
                gradientFrom="from-emerald-500"
                gradientTo="to-emerald-600"
              />
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-4 mt-4">
              <h3 className="font-semibold text-slate-900 mb-3">Legend</h3>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-200 border-2 border-green-600 rounded"></div>
                  <span className="text-slate-700">Matched</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-200 border-2 border-red-600 rounded"></div>
                  <span className="text-slate-700">Missing</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-200 border-2 border-yellow-600 rounded"></div>
                  <span className="text-slate-700">Misprioritized</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-slate-200 border-2 border-slate-600 rounded"></div>
                  <span className="text-slate-700">Redundant</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}