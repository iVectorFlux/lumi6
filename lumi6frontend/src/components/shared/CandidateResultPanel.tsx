import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import axios from 'axios';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';

// Fix for jsPDF autoTable/lastAutoTable TypeScript errors
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (...args: any[]) => any;
    lastAutoTable: any;
  }
}

interface CandidateResultPanelProps {
  candidateId: string;
  onClose?: () => void; // Make optional for embedded use
  showAsFullReport?: boolean; // New prop for candidate view
}

const CEFR_RUBRIC = [
  {
    level: 'A1',
    title: 'Beginner',
    description: 'Can understand and use familiar everyday expressions and basic phrases. Can introduce themselves and ask basic personal questions.',
    details: [
      'Understand simple phrases and expressions',
      'Communicate basic personal information',
      'Interact with slow, clear speech',
      'Handle very simple everyday conversations'
    ]
  },
  {
    level: 'A2',
    title: 'Elementary',
    description: 'Can communicate in simple tasks requiring direct exchange of information on familiar matters. Can describe immediate needs and background.',
    details: [
      'Understand sentences on familiar topics',
      'Communicate in simple routine tasks',
      'Describe background and immediate needs',
      'Handle simple social exchanges'
    ]
  },
  {
    level: 'B1',
    title: 'Intermediate',
    description: 'Can communicate in simple and routine tasks requiring a simple exchange of information on familiar topics.',
    details: [
      'Deal with most travel situations',
      'Produce simple connected text',
      'Describe experiences, events, and ambitions',
      'Give brief explanations of opinions and plans'
    ]
  },
  {
    level: 'B2',
    title: 'Upper Intermediate',
    description: 'Can interact with a degree of fluency and spontaneity. Can produce clear, detailed text on a wide range of subjects.',
    details: [
      'Understand complex text on concrete and abstract topics',
      'Interact with native speakers with fluency',
      'Produce detailed text on various subjects',
      'Present clear arguments on familiar topics'
    ]
  },
  {
    level: 'C1',
    title: 'Advanced',
    description: 'Can express ideas fluently and spontaneously. Can use language flexibly and effectively for social, academic, and professional purposes.',
    details: [
      'Understand demanding, longer texts',
      'Express ideas fluently without searching for expressions',
      'Use language flexibly for complex purposes',
      'Produce clear, well-structured, detailed text'
    ]
  },
  {
    level: 'C2',
    title: 'Proficient',
    description: 'Can express ideas fluently and spontaneously. Can use language flexibly and effectively for social, academic, and professional purposes.',
    details: [
      'Understand virtually everything heard or read',
      'Summarize information from different sources',
      'Express yourself spontaneously and precisely',
      'Differentiate finer shades of meaning'
    ]
  }
];

const CEFR_COLORS: Record<string, { bg: string, text: string, pdf: [number, number, number] }> = {
  A1: { bg: 'bg-blue-200', text: 'text-blue-800', pdf: [191, 219, 254] },
  A2: { bg: 'bg-blue-300', text: 'text-blue-900', pdf: [147, 197, 253] },
  B1: { bg: 'bg-green-200', text: 'text-green-800', pdf: [187, 247, 208] },
  B2: { bg: 'bg-green-300', text: 'text-green-900', pdf: [134, 239, 172] },
  C1: { bg: 'bg-yellow-200', text: 'text-yellow-800', pdf: [254, 240, 138] },
  C2: { bg: 'bg-yellow-300', text: 'text-yellow-900', pdf: [253, 224, 71] },
};

const CandidateResultPanel = ({ candidateId, onClose, showAsFullReport = false }: CandidateResultPanelProps) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assessmentData, setAssessmentData] = useState<any>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      setError('');
      try {
        console.log('Fetching latest result for candidateId:', candidateId);
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
        const token = localStorage.getItem('token');
        
        // Fetch the test result
        const res = await axios.get(`${API_URL}/api/candidates/${candidateId}/result`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        
        setFullName(res.data.candidateTest?.candidate?.name || '');
        setEmail(res.data.candidateTest?.candidate?.email || '');
        setResults([res.data]); // Wrap in array for compatibility
        
        // Try to fetch assessment data if available
        try {
          if (res.data.candidateTest?.id) {
            const assessmentRes = await axios.get(`${API_URL}/api/assessments/${res.data.candidateTest.id}`, {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            setAssessmentData(assessmentRes.data);
          }
        } catch (assessErr) {
          console.log('Assessment data not available:', assessErr);
        }
        
      } catch (err: any) {
        let msg = 'Failed to load report';
        if (err.response && err.response.data && err.response.data.error) {
          msg += `: ${err.response.data.error}`;
        }
        setError(msg);
        console.error('Error fetching candidate report:', err, 'candidateId:', candidateId);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [candidateId]);

  const handleDownloadPDF = () => {
    if (!results.length) return;
    const latest = results[0];
    const evaluation = assessmentData?.evaluation || {};
    const doc = new jsPDF();
    
    // Enhanced PDF with exact UI colors
    // Header with gradient-like background
    doc.setFillColor(59, 130, 246); // Blue-600
    doc.rect(0, 0, 210, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('Language Assessment Report', 14, 20);
    doc.setFontSize(12);
    doc.text(`Generated by LexiScore AI Platform`, 14, 28);
    
    // Reset text color
    doc.setTextColor(0, 0, 0);
    
    // Candidate Info with colored background
    doc.setFillColor(248, 250, 252); // Gray-50
    doc.rect(14, 45, 182, 25, 'F');
    doc.setFontSize(14);
    doc.text('Candidate Information', 18, 55);
    doc.setFontSize(11);
    doc.text(`Name: ${fullName}`, 18, 62);
    doc.text(`Email: ${email}`, 18, 68);
    doc.text(`Assessment Date: ${new Date(latest.timestamp).toLocaleString()}`, 18, 75);
    
    // CEFR Level with exact color matching
    const cefrColor = CEFR_COLORS[latest.cefrLevel]?.pdf || [156, 163, 175];
    doc.setFillColor(...cefrColor);
    doc.rect(14, 85, 182, 30, 'F');
    doc.setFontSize(16);
    doc.text('CEFR Level Assessment', 18, 98);
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text(`${latest.cefrLevel} - ${CEFR_RUBRIC.find(r => r.level === latest.cefrLevel)?.title || 'Level'}`, 18, 108);
    doc.setFont(undefined, 'normal');
    
    // Overall Score with progress bar visual
    doc.setFillColor(220, 252, 231); // Green-100
    doc.rect(14, 125, 182, 20, 'F');
    doc.setFontSize(14);
    doc.text(`Overall Score: ${latest.overallScore}/100`, 18, 138);
    
    // Progress bar visual
    doc.setFillColor(34, 197, 94); // Green-500
    const progressWidth = (latest.overallScore / 100) * 160;
    doc.rect(18, 140, progressWidth, 3, 'F');
    doc.setDrawColor(209, 213, 219);
    doc.rect(18, 140, 160, 3);
    
    // Detailed Scores Table with colors
    if (evaluation.fluency || evaluation.grammar || evaluation.vocabulary || evaluation.pronunciation || evaluation.coherence) {
      const scores = [
        ['Fluency 🗣️', evaluation.fluency || '-', 'Speech flow and naturalness'],
        ['Grammar 📝', evaluation.grammar || '-', 'Structural accuracy'],
        ['Vocabulary 📚', evaluation.vocabulary || '-', 'Word range and usage'],
        ['Pronunciation 🔊', evaluation.pronunciation || '-', 'Clarity and accent'],
        ['Coherence 🔗', evaluation.coherence || '-', 'Logical organization']
      ].filter(row => row[1] !== '-');

      doc.autoTable({
        startY: 155,
        head: [['Skill Area', 'Score (1-5)', 'Description']],
        body: scores,
        theme: 'grid',
        headStyles: { 
          fillColor: [59, 130, 246], // Blue-600
          textColor: [255, 255, 255],
          fontSize: 11,
          fontStyle: 'bold'
        },
        styles: { 
          halign: 'left', 
          fontSize: 10,
          cellPadding: 5
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252] // Gray-50
        }
      });
    }
    
    // AI Feedback with styled background
    if (evaluation.feedback) {
      const yPos = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : 190;
      doc.setFillColor(239, 246, 255); // Blue-50
      doc.rect(14, yPos - 5, 182, 40, 'F');
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('🤖 AI Feedback', 18, yPos + 5);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      const splitFeedback = doc.splitTextToSize(evaluation.feedback, 175);
      doc.text(splitFeedback, 18, yPos + 12);
    }
    
    // Add CEFR Reference on new page with full colors
    doc.addPage();
    doc.setFillColor(59, 130, 246); // Blue-600
    doc.rect(0, 0, 210, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text('CEFR Level Reference Guide', 14, 15);
    doc.setTextColor(0, 0, 0);
    
    let yPos = 35;
    CEFR_RUBRIC.forEach((r) => {
      const isCurrentLevel = r.level === latest.cefrLevel;
      const color = CEFR_COLORS[r.level]?.pdf || [156, 163, 175];
      
      // Level header with color
      doc.setFillColor(...color);
      doc.rect(14, yPos - 3, 182, 15, 'F');
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(`${r.level} - ${r.title}${isCurrentLevel ? ' ← Your Level' : ''}`, 18, yPos + 5);
      
      // Description
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      const description = doc.splitTextToSize(r.description, 175);
      doc.text(description, 18, yPos + 15);
      
      // Details
      r.details.forEach((detail, index) => {
        doc.text(`• ${detail}`, 22, yPos + 22 + (index * 5));
      });
      
      yPos += 45 + (r.details.length * 5);
      
      if (yPos > 260) {
        doc.addPage();
        yPos = 20;
      }
    });
    
    // Footer
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 285, 210, 12, 'F');
    doc.setFontSize(8);
    doc.text('This report was generated automatically by LexiScore AI Assessment Platform', 14, 292);
    
    doc.save(`${fullName.replace(/\s+/g, '_')}_Assessment_Report.pdf`);
  };

  if (loading) return (
    <div className={`${showAsFullReport ? '' : 'fixed inset-0'} flex items-center justify-center bg-black bg-opacity-40 z-50`}>
      <div ref={panelRef} className="bg-white rounded-lg shadow-lg p-8 w-full max-w-4xl relative">
        <div className="text-center text-gray-500">Loading assessment report...</div>
      </div>
    </div>
  );
  
  if (error) return (
    <div className={`${showAsFullReport ? '' : 'fixed inset-0'} flex items-center justify-center bg-black bg-opacity-40 z-50`}>
      <div ref={panelRef} className="bg-white rounded-lg shadow-lg p-8 w-full max-w-4xl relative">
        {!showAsFullReport && onClose && <button className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl" onClick={onClose}>&times;</button>}
        <div className="text-center text-red-500">
          <h3 className="text-lg font-semibold mb-2">Error Loading Report</h3>
          <p>{error}</p>
          {onClose && <Button onClick={onClose} className="mt-4">Close</Button>}
        </div>
      </div>
    </div>
  );
  
  if (!results.length) return (
    <div className={`${showAsFullReport ? '' : 'fixed inset-0'} flex items-center justify-center bg-black bg-opacity-40 z-50`}>
      <div ref={panelRef} className="bg-white rounded-lg shadow-lg p-8 w-full max-w-4xl relative">
        {!showAsFullReport && onClose && <button className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl" onClick={onClose}>&times;</button>}
        <div className="text-center text-gray-400">
          <h3 className="text-lg font-semibold mb-2">No Assessment Found</h3>
          <p>This candidate hasn't completed any assessments yet.</p>
          {onClose && <Button onClick={onClose} className="mt-4">Close</Button>}
        </div>
      </div>
    </div>
  );

  const latest = results[0];
  const evaluation = assessmentData?.evaluation || {};

  return (
    <div className={`${showAsFullReport ? 'w-full' : 'fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50'}`}>
      <div ref={panelRef} className={`bg-white rounded-lg shadow-lg p-6 w-full ${showAsFullReport ? '' : 'max-w-6xl max-h-screen overflow-y-auto'} relative`}>
        {/* Close button with proper spacing from PDF button */}
        {!showAsFullReport && onClose && (
          <button 
            className="absolute top-4 right-4 z-10 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center text-xl font-bold transition-colors" 
            onClick={onClose}
            title="Close"
          >
            &times;
          </button>
        )}
        
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start justify-between mb-6 gap-4" style={{ paddingRight: !showAsFullReport ? '3rem' : '0' }}>
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              {showAsFullReport ? '🎉 Congratulations! Your Results' : 'Language Assessment Report'}
            </h2>
            <div className="text-lg font-semibold text-gray-700">{fullName}</div>
            <div className="text-gray-600">{email}</div>
            <div className="text-sm text-gray-500 mt-1">
              Assessed: {new Date(latest.timestamp).toLocaleDateString('en-US', { 
                year: 'numeric', month: 'long', day: 'numeric', 
                hour: '2-digit', minute: '2-digit' 
              })}
            </div>
          </div>
          {/* PDF Download button positioned away from close button */}
          <div className={`${!showAsFullReport ? 'mr-12' : ''}`}>
            <Button onClick={handleDownloadPDF} className="bg-blue-600 hover:bg-blue-700">
              📄 Download PDF Report
            </Button>
          </div>
        </div>

        {/* Main Results */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* CEFR Level Card */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 text-center border border-blue-200">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Your CEFR Level</h3>
            <div className={`inline-block px-6 py-3 rounded-xl font-bold text-4xl shadow-md ${CEFR_COLORS[latest.cefrLevel]?.bg || 'bg-gray-200'} ${CEFR_COLORS[latest.cefrLevel]?.text || 'text-gray-800'}`}>
              {latest.cefrLevel}
            </div>
            <div className="text-sm text-gray-600 mt-2">
              {CEFR_RUBRIC.find(r => r.level === latest.cefrLevel)?.title || 'Level'}
            </div>
          </div>

          {/* Overall Score Card */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 text-center border border-green-200">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Overall Score</h3>
            <div className="text-4xl font-bold text-green-700 mb-2">{latest.overallScore}</div>
            <div className="text-sm text-gray-600">out of 100</div>
            <Progress value={latest.overallScore} className="mt-3" />
          </div>

          {/* Assessment Status */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 text-center border border-purple-200">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Assessment Type</h3>
            <div className="text-2xl font-bold text-purple-700">Speaking Test</div>
            <div className="text-sm text-gray-600 mt-2">
              {assessmentData?.transcript ? 'With AI Analysis' : 'Standard Evaluation'}
            </div>
          </div>
        </div>

        {/* Detailed Scores */}
        {(evaluation.fluency || evaluation.grammar || evaluation.vocabulary || evaluation.pronunciation || evaluation.coherence) && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">📊 Detailed Assessment Breakdown</h3>
            <div className="grid md:grid-cols-5 gap-4">
              {[
                { key: 'fluency', label: 'Fluency', icon: '🗣️', description: 'Speech flow and naturalness' },
                { key: 'grammar', label: 'Grammar', icon: '📝', description: 'Structural accuracy' },
                { key: 'vocabulary', label: 'Vocabulary', icon: '📚', description: 'Word range and usage' },
                { key: 'pronunciation', label: 'Pronunciation', icon: '🔊', description: 'Clarity and accent' },
                { key: 'coherence', label: 'Coherence', icon: '🔗', description: 'Logical organization' }
              ].map((item) => {
                const score = evaluation[item.key];
                return score ? (
                  <div key={item.key} className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200">
                    <div className="text-2xl mb-2">{item.icon}</div>
                    <div className="font-semibold text-gray-700">{item.label}</div>
                    <div className="text-2xl font-bold text-blue-600 my-2">{score}/5</div>
                    <Progress value={(score / 5) * 100} className="mb-2" />
                    <div className="text-xs text-gray-500">{item.description}</div>
                  </div>
                ) : null;
              })}
            </div>
          </div>
        )}

        {/* AI Feedback and Transcript */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* AI Feedback */}
          {evaluation.feedback && (
            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-800 mb-3">🤖 AI Feedback</h3>
              <div className="text-gray-700 leading-relaxed">
                {evaluation.feedback}
              </div>
            </div>
          )}

          {/* Transcript */}
          {assessmentData?.transcript && (
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">📝 Speech Transcript</h3>
              <div className="text-gray-700 leading-relaxed max-h-64 overflow-y-auto">
                <p className="italic">"{assessmentData.transcript}"</p>
              </div>
            </div>
          )}
        </div>

        {/* CEFR Reference - Always Expanded */}
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">📋 CEFR Level Reference Guide</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {CEFR_RUBRIC.map(r => (
              <div key={r.level} className={`rounded-lg p-6 border-2 transition-all ${latest.cefrLevel === r.level 
                ? 'border-blue-400 bg-blue-50 shadow-lg transform scale-105' 
                : 'border-gray-200 bg-white hover:shadow-md'}`}>
                <div className="flex items-center gap-3 mb-3">
                  <span className={`font-bold px-4 py-2 rounded-full text-sm ${CEFR_COLORS[r.level]?.bg || 'bg-gray-200'} ${CEFR_COLORS[r.level]?.text || 'text-gray-800'}`}>
                    {r.level}
                  </span>
                  <span className="font-semibold text-gray-800">{r.title}</span>
                  {latest.cefrLevel === r.level && <span className="text-blue-600 font-bold text-sm">← Your Level</span>}
                </div>
                <div className="text-sm text-gray-700 leading-relaxed mb-3">
                  {r.description}
                </div>
                <div className="space-y-1">
                  {r.details.map((detail, index) => (
                    <div key={index} className="text-xs text-gray-600 flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200 text-center text-sm text-gray-500">
          Generated by LexiScore AI Assessment Platform
        </div>
      </div>
    </div>
  );
};

export default CandidateResultPanel; 