"use client";

import { useState } from "react";

interface Question {
  question: string;
  whatGoodLooksLike: string;
}

interface QuestionGroup {
  behavioral?: Question[];
  technical?: Question[];
  scenario?: Question[];
  cultureFit?: Question[];
  redFlagProbes?: Question[];
}

interface Competency {
  name: string;
  definition: string;
  questions?: QuestionGroup;
}

interface InterviewKitViewerProps {
  kit: {
    roleTitle?: string;
    competencies?: Competency[];
  };
  generatedAt?: string | null;
  promptVersion?: string | null;
}

const QuestionCard = ({ question, type }: { question: Question; type: string }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getCardColor = (type: string) => {
    switch (type) {
      case 'behavioral': return 'bg-blue-50 border-blue-200';
      case 'technical': return 'bg-green-50 border-green-200';
      case 'scenario': return 'bg-purple-50 border-purple-200';
      case 'cultureFit': return 'bg-yellow-50 border-yellow-200';
      case 'redFlagProbes': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getTextColor = (type: string) => {
    switch (type) {
      case 'behavioral': return 'text-blue-800';
      case 'technical': return 'text-green-800';
      case 'scenario': return 'text-purple-800';
      case 'cultureFit': return 'text-yellow-800';
      case 'redFlagProbes': return 'text-red-800';
      default: return 'text-gray-800';
    }
  };

  const getSubTextColor = (type: string) => {
    switch (type) {
      case 'behavioral': return 'text-blue-600';
      case 'technical': return 'text-green-600';
      case 'scenario': return 'text-purple-600';
      case 'cultureFit': return 'text-yellow-600';
      case 'redFlagProbes': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${getCardColor(type)}`}>
      <div className="flex justify-between items-start mb-3">
        <p className={`font-medium text-sm ${getTextColor(type)} break-words`}>
          {question.question}
        </p>
        <button
          onClick={() => copyToClipboard(question.question)}
          className="ml-2 p-1 hover:bg-white hover:bg-opacity-50 rounded transition-colors flex-shrink-0"
          title="Copy question"
        >
          {copied ? (
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between items-start">
          <p className={`text-sm ${getSubTextColor(type)} break-words`}>
            <span className="font-medium">Good looks like:</span> {question.whatGoodLooksLike}
          </p>
          <button
            onClick={() => copyToClipboard(question.whatGoodLooksLike)}
            className="ml-2 p-1 hover:bg-white hover:bg-opacity-50 rounded transition-colors flex-shrink-0"
            title="Copy rubric"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
        
        {/* Scoring Guide - Always visible */}
        <div className="bg-white bg-opacity-60 rounded p-2 mt-2">
          <p className="text-xs font-medium text-gray-700 mb-1">Scoring Guide:</p>
          <div className="text-xs text-gray-600 space-y-1">
            <p><span className="font-medium">1 - Poor:</span> Response does not meet expectations</p>
            <p><span className="font-medium">3 - Average:</span> Response meets basic expectations</p>
            <p><span className="font-medium">5 - Excellent:</span> Response exceeds expectations</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const QuestionSection = ({ 
  title, 
  questions, 
  type, 
  isOpen, 
  onToggle 
}: { 
  title: string; 
  questions?: Question[]; 
  type: string;
  isOpen: boolean;
  onToggle: () => void;
}) => {
  if (!questions || questions.length === 0) return null;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex justify-between items-center text-left"
      >
        <span className="font-medium text-sm text-gray-900">
          {title} ({questions.length})
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
          {questions.map((question, index) => (
            <QuestionCard key={index} question={question} type={type} />
          ))}
        </div>
      )}
    </div>
  );
};

export const InterviewKitViewer = ({ kit, generatedAt, promptVersion }: InterviewKitViewerProps) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['behavioral']));
  const [exportCopied, setExportCopied] = useState(false);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const sanitizeText = (text: string) => {
    return text.replace(/<[^>]*>/g, '').trim();
  };

  const generateMarkdown = () => {
    let markdown = `# Interview Kit\n\n`;
    
    // Header information
    if (kit.roleTitle) {
      markdown += `## Role Title\n${sanitizeText(kit.roleTitle)}\n\n`;
    }
    
    if (generatedAt) {
      markdown += `**Generated:** ${new Date(generatedAt).toLocaleDateString()}\n\n`;
    }
    
    if (promptVersion) {
      markdown += `**Prompt Version:** v${promptVersion}\n\n`;
    }
    
    markdown += `---\n\n`;
    
    // Competencies
    if (kit.competencies && kit.competencies.length > 0) {
      markdown += `## Core Competencies (${kit.competencies.length})\n\n`;
      
      kit.competencies.forEach((competency, index) => {
        markdown += `### ${index + 1}. ${sanitizeText(competency.name || '')}\n\n`;
        
        if (competency.definition) {
          markdown += `**Definition:** ${sanitizeText(competency.definition)}\n\n`;
        }
        
        // Questions by type
        const questions = competency.questions || {};
        
        if (questions.behavioral && questions.behavioral.length > 0) {
          markdown += `#### Behavioral Questions (${questions.behavioral.length})\n\n`;
          questions.behavioral.forEach((q, qIndex) => {
            markdown += `${qIndex + 1}. **${sanitizeText(q.question)}**\n\n`;
            markdown += `**Good looks like:** ${sanitizeText(q.whatGoodLooksLike)}\n\n`;
          });
        }
        
        if (questions.technical && questions.technical.length > 0) {
          markdown += `#### Technical Questions (${questions.technical.length})\n\n`;
          questions.technical.forEach((q, qIndex) => {
            markdown += `${qIndex + 1}. **${sanitizeText(q.question)}**\n\n`;
            markdown += `**Good looks like:** ${sanitizeText(q.whatGoodLooksLike)}\n\n`;
          });
        }
        
        if (questions.scenario && questions.scenario.length > 0) {
          markdown += `#### Scenario Questions (${questions.scenario.length})\n\n`;
          questions.scenario.forEach((q, qIndex) => {
            markdown += `${qIndex + 1}. **${sanitizeText(q.question)}**\n\n`;
            markdown += `**Good looks like:** ${sanitizeText(q.whatGoodLooksLike)}\n\n`;
          });
        }
        
        if (questions.cultureFit && questions.cultureFit.length > 0) {
          markdown += `#### Culture Fit Questions (${questions.cultureFit.length})\n\n`;
          questions.cultureFit.forEach((q, qIndex) => {
            markdown += `${qIndex + 1}. **${sanitizeText(q.question)}**\n\n`;
            markdown += `**Good looks like:** ${sanitizeText(q.whatGoodLooksLike)}\n\n`;
          });
        }
        
        if (questions.redFlagProbes && questions.redFlagProbes.length > 0) {
          markdown += `#### Red Flag Probes (${questions.redFlagProbes.length})\n\n`;
          questions.redFlagProbes.forEach((q, qIndex) => {
            markdown += `${qIndex + 1}. **${sanitizeText(q.question)}**\n\n`;
            markdown += `**Good looks like:** ${sanitizeText(q.whatGoodLooksLike)}\n\n`;
          });
        }
        
        markdown += `---\n\n`;
      });
    }
    
    // Scoring guide
    markdown += `## Scoring Guide Reference\n\n`;
    markdown += `- **1 - Poor:** Response does not meet expectations\n`;
    markdown += `- **3 - Average:** Response meets basic expectations\n`;
    markdown += `- **5 - Excellent:** Response exceeds expectations\n\n`;
    
    return markdown;
  };

  const downloadMarkdown = () => {
    const markdown = generateMarkdown();
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `interview-kit-${kit.roleTitle || 'untitled'}-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const copyMarkdownToClipboard = async () => {
    try {
      const markdown = generateMarkdown();
      await navigator.clipboard.writeText(markdown);
      setExportCopied(true);
      setTimeout(() => setExportCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy markdown:', err);
    }
  };

  if (!kit) return null;

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Interview Kit</h2>
          <div className="flex items-center space-x-3">
            {/* Export Buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={downloadMarkdown}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                title="Download as Markdown"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l-3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export .md
              </button>
              <button
                onClick={copyMarkdownToClipboard}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                title="Copy full kit as Markdown"
              >
                {exportCopied ? (
                  <>
                    <svg className="w-4 h-4 mr-1.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy Markdown
                  </>
                )}
              </button>
            </div>
            
            {/* Version Info */}
            <div className="flex items-center space-x-2">
              {promptVersion && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  v{promptVersion}
                </span>
              )}
              {generatedAt && (
                <span className="text-xs text-gray-500">
                  Generated {new Date(generatedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 space-y-6">
        {/* Role Information */}
        {kit.roleTitle && (
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Role Title</h3>
            <p className="text-sm text-gray-700">{sanitizeText(kit.roleTitle)}</p>
          </div>
        )}

        {/* Competencies */}
        {kit.competencies && kit.competencies.length > 0 ? (
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-4">
              Core Competencies ({kit.competencies.length})
            </h3>
            <div className="space-y-6">
              {kit.competencies.map((competency, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    {sanitizeText(competency.name || '')}
                  </h4>
                  {competency.definition && (
                    <p className="text-sm text-gray-600 mb-4">
                      {sanitizeText(competency.definition)}
                    </p>
                  )}
                  
                  {/* Question Groups */}
                  <div className="space-y-3">
                    <QuestionSection
                      title="Behavioral"
                      questions={competency.questions?.behavioral}
                      type="behavioral"
                      isOpen={expandedSections.has(`behavioral-${index}`)}
                      onToggle={() => toggleSection(`behavioral-${index}`)}
                    />
                    <QuestionSection
                      title="Technical"
                      questions={competency.questions?.technical}
                      type="technical"
                      isOpen={expandedSections.has(`technical-${index}`)}
                      onToggle={() => toggleSection(`technical-${index}`)}
                    />
                    <QuestionSection
                      title="Scenario"
                      questions={competency.questions?.scenario}
                      type="scenario"
                      isOpen={expandedSections.has(`scenario-${index}`)}
                      onToggle={() => toggleSection(`scenario-${index}`)}
                    />
                    <QuestionSection
                      title="Culture Fit"
                      questions={competency.questions?.cultureFit}
                      type="cultureFit"
                      isOpen={expandedSections.has(`cultureFit-${index}`)}
                      onToggle={() => toggleSection(`cultureFit-${index}`)}
                    />
                    <QuestionSection
                      title="Red Flag Probes"
                      questions={competency.questions?.redFlagProbes}
                      type="redFlagProbes"
                      isOpen={expandedSections.has(`redFlagProbes-${index}`)}
                      onToggle={() => toggleSection(`redFlagProbes-${index}`)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-3">📋</div>
            <p className="text-gray-500">No competencies available in this interview kit</p>
          </div>
        )}

        {/* Scoring Guide Reference */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Scoring Guide Reference</h3>
          <div className="text-xs text-gray-600 space-y-1">
            <p><span className="font-medium">1 - Poor:</span> Response does not meet expectations</p>
            <p><span className="font-medium">3 - Average:</span> Response meets basic expectations</p>
            <p><span className="font-medium">5 - Excellent:</span> Response exceeds expectations</p>
          </div>
        </div>
      </div>
    </div>
  );
};
