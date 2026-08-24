import React, { useState, useEffect } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import CVPreviewer from './CVPreviewer';

const DEFAULT_CV = {
  personalInfo: { fullName: '', email: '', phone: '', linkedin: '', github: '', summary: '', customFields: [] },
  education: [],
  experience: [],
  skills: [],
  projects: [],
  languages: [],
  customSections: [],
  theme: 'classic',
  accentColor: '#3b82f6'
};

const CVBuilder = ({ onBack, onLogout }) => {
  const [cvData, setCvData] = useState(DEFAULT_CV);
  const [analysis, setAnalysis] = useState(null);
  const [activeTab, setActiveTab] = useState('personal');
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [skillsInput, setSkillsInput] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [errors, setErrors] = useState({ experience: [], education: [], projects: [] });
  const [polishingItems, setPolishingItems] = useState({});
  const [previewTheme, setPreviewTheme] = useState('classic');
  const [selectedColor, setSelectedColor] = useState('#3b82f6');
  
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [isTabHovered, setIsTabHovered] = useState(false);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (showActionMenu && !document.getElementById('action-dropdown-container')?.contains(e.target)) {
        setShowActionMenu(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [showActionMenu]);

  const handleBackClick = () => {
    if (isDirty) {
      setShowUnsavedModal(true);
    } else {
      onBack();
    }
  };

  const addCustomField = (category, index) => {
    setIsDirty(true);
    const newField = { label: '', value: '' };
    if (category === 'personal') {
      setCvData(prev => ({
        ...prev,
        personalInfo: {
          ...prev.personalInfo,
          customFields: [...(prev.personalInfo.customFields || []), newField]
        }
      }));
    } else {
      setCvData(prev => {
        const copy = [...prev[category]];
        copy[index] = {
          ...copy[index],
          customFields: [...(copy[index].customFields || []), newField]
        };
        return { ...prev, [category]: copy };
      });
    }
  };

  const updateCustomFieldLabel = (category, index, cfIdx, label) => {
    setIsDirty(true);
    if (category === 'personal') {
      setCvData(prev => {
        const customFields = [...(prev.personalInfo.customFields || [])];
        customFields[cfIdx] = { ...customFields[cfIdx], label };
        return {
          ...prev,
          personalInfo: { ...prev.personalInfo, customFields }
        };
      });
    } else {
      setCvData(prev => {
        const copy = [...prev[category]];
        const customFields = [...(copy[index].customFields || [])];
        customFields[cfIdx] = { ...customFields[cfIdx], label };
        copy[index] = { ...copy[index], customFields };
        return { ...prev, [category]: copy };
      });
    }
  };

  const updateCustomFieldValue = (category, index, cfIdx, value) => {
    setIsDirty(true);
    if (category === 'personal') {
      setCvData(prev => {
        const customFields = [...(prev.personalInfo.customFields || [])];
        customFields[cfIdx] = { ...customFields[cfIdx], value };
        return {
          ...prev,
          personalInfo: { ...prev.personalInfo, customFields }
        };
      });
    } else {
      setCvData(prev => {
        const copy = [...prev[category]];
        const customFields = [...(copy[index].customFields || [])];
        customFields[cfIdx] = { ...customFields[cfIdx], value };
        copy[index] = { ...copy[index], customFields };
        return { ...prev, [category]: copy };
      });
    }
  };

  const removeCustomField = (category, index, cfIdx) => {
    setIsDirty(true);
    if (category === 'personal') {
      setCvData(prev => ({
        ...prev,
        personalInfo: {
          ...prev.personalInfo,
          customFields: (prev.personalInfo.customFields || []).filter((_, i) => i !== cfIdx)
        }
      }));
    } else {
      setCvData(prev => {
        const copy = [...prev[category]];
        copy[index] = {
          ...copy[index],
          customFields: (copy[index].customFields || []).filter((_, i) => i !== cfIdx)
        };
        return { ...prev, [category]: copy };
      });
    }
  };

  const addLanguage = (language, level) => {
    if (!language.trim()) return;
    setIsDirty(true);
    setCvData(prev => ({
      ...prev,
      languages: [...(prev.languages || []), { language, level }]
    }));
  };

  const removeLanguage = (index) => {
    setIsDirty(true);
    setCvData(prev => ({
      ...prev,
      languages: (prev.languages || []).filter((_, i) => i !== index)
    }));
  };

  const handleAddCustomSection = () => {
    setIsDirty(true);
    const id = 'custom_' + Date.now();
    setCvData(prev => ({
      ...prev,
      customSections: [...(prev.customSections || []), { id, title: '', content: '' }]
    }));
    setActiveTab(id);
  };

  const updateCustomSection = (id, field, value) => {
    setIsDirty(true);
    setCvData(prev => ({
      ...prev,
      customSections: (prev.customSections || []).map(sec => 
        sec.id === id ? { ...sec, [field]: value } : sec
      )
    }));
  };

  const removeCustomSection = (id) => {
    setIsDirty(true);
    setCvData(prev => ({
      ...prev,
      customSections: (prev.customSections || []).filter(sec => sec.id !== id)
    }));
    setActiveTab('personal');
  };

  const handleFieldUpdate = (path, value) => {
    setIsDirty(true);
    setCvData(prev => {
      const updated = { ...prev };
      let current = updated;
      for (let i = 0; i < path.length - 1; i++) {
        if (Array.isArray(current[path[i]])) {
          current[path[i]] = [...current[path[i]]];
        } else {
          current[path[i]] = { ...current[path[i]] };
        }
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return updated;
    });
  };

  const handleExportPDF = () => {
    const element = document.getElementById('cv-print-area');
    if (!element) {
      alert("Could not find the CV document to export.");
      return;
    }
    
    const firstChild = element.firstElementChild;
    let originalClasses = '';
    if (firstChild) {
      originalClasses = firstChild.className;
      firstChild.className = firstChild.className
        .replace(/\bshadow-xl\b/g, '')
        .replace(/\border border-gray-200\b/g, '')
        .trim();
      firstChild.style.border = 'none';
      firstChild.style.boxShadow = 'none';
    }

    const opt = {
      margin: 0,
      filename: `${cvData.personalInfo?.fullName || 'Resume'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      enableLinks: true,
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc) => {
          const clonedPrintArea = clonedDoc.getElementById('cv-print-area');
          if (clonedPrintArea && clonedPrintArea.firstElementChild) {
            const resumeNode = clonedPrintArea.firstElementChild;
            resumeNode.style.height = '297mm';
            resumeNode.style.minHeight = '297mm';
            resumeNode.style.maxHeight = '297mm';
            resumeNode.style.overflow = 'hidden';

            const leftSidebar = resumeNode.querySelector('.col-span-4');
            if (leftSidebar) {
              leftSidebar.style.height = '297mm';
              leftSidebar.style.minHeight = '297mm';
            }
          }

          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            #cv-print-area {
              --color-white: #ffffff !important;
              --color-black: #000000 !important;
              --color-slate-50: #f8fafc !important;
              --color-slate-100: #f1f5f9 !important;
              --color-slate-200: #e2e8f0 !important;
              --color-slate-300: #cbd5e1 !important;
              --color-slate-400: #94a3b8 !important;
              --color-slate-500: #64748b !important;
              --color-slate-600: #475569 !important;
              --color-slate-700: #334155 !important;
              --color-slate-800: #1e293b !important;
              --color-slate-900: #0f172a !important;
              --color-gray-50: #f9fafb !important;
              --color-gray-100: #f3f4f6 !important;
              --color-gray-200: #e5e7eb !important;
              --color-gray-300: #d1d5db !important;
              --color-gray-400: #9ca3af !important;
              --color-gray-500: #6b7280 !important;
              --color-gray-600: #4b5563 !important;
              --color-gray-700: #374151 !important;
              --color-gray-800: #1f2937 !important;
              --color-gray-900: #111827 !important;
            }
          `;
          clonedDoc.head.appendChild(style);
        }
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait' 
      }
    };

    setTimeout(() => {
      if (window.html2pdf) {
        window.html2pdf().from(element).set(opt).save().then(() => {
          if (firstChild) {
            firstChild.className = originalClasses;
            firstChild.style.border = '';
            firstChild.style.boxShadow = '';
          }
        }).catch(err => {
          console.error("PDF export failed:", err);
          if (firstChild) {
            firstChild.className = originalClasses;
            firstChild.style.border = '';
            firstChild.style.boxShadow = '';
          }
        });
      } else {
        window.print();
        if (firstChild) {
          firstChild.className = originalClasses;
          firstChild.style.border = '';
          firstChild.style.boxShadow = '';
        }
      }
    }, 300);
  };

  const handleImportCV = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setStatusMessage('Reading file content...');
    try {
      let extractedText = '';

      if (file.name.endsWith('.pdf')) {
        const arrayBuffer = await file.arrayBuffer();
        let pdfjsLib = window['pdfjs-dist/build/pdf'] || window['pdfjsLib'];
        if (!pdfjsLib) {
          setStatusMessage('Loading PDF parser library...');
          const scriptId = 'pdfjs-script-cdn';
          let script = document.getElementById(scriptId);
          if (!script) {
            script = document.createElement('script');
            script.id = scriptId;
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            document.head.appendChild(script);
          }
          await new Promise((resolve, reject) => {
            const checkInterval = setInterval(() => {
              const lib = window['pdfjs-dist/build/pdf'] || window['pdfjsLib'];
              if (lib) {
                clearInterval(checkInterval);
                pdfjsLib = lib;
                resolve();
              }
            }, 100);
            setTimeout(() => {
              clearInterval(checkInterval);
              reject(new Error("PDF.js library load timed out. Please check your network connection."));
            }, 10000);
          });
          setStatusMessage('Reading file content...');
        }
        
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
        
        const typedArray = new Uint8Array(arrayBuffer);
        const loadingTask = pdfjsLib.getDocument({ data: typedArray });
        const pdf = await loadingTask.promise;
        
        let textParts = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(' ');
          textParts.push(pageText);
        }
        extractedText = textParts.join('\n');
      } else if (file.name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await window.mammoth.extractRawText({ arrayBuffer });
        extractedText = result.value;
      } else {
        extractedText = await file.text();
      }

      if (!extractedText.trim()) {
        throw new Error('Extracted text is empty or file format is unsupported.');
      }

      setStatusMessage('AI is parsing your document...');
      const headers = await getAuthHeaders();
      const res = await fetch('/api/cv/import', {
        method: 'POST',
        headers,
        body: JSON.stringify({ text: extractedText })
      });

      if (res.ok) {
        const result = await res.json();
        if (result?.cv) {
          const loadedTheme = result.cv.theme || 'classic';
          const loadedColor = result.cv.accentColor || '#3b82f6';
          setCvData({
            ...DEFAULT_CV,
            ...result.cv,
            theme: loadedTheme,
            accentColor: loadedColor
          });
          setPreviewTheme(loadedTheme);
          setSelectedColor(loadedColor);
          if (result.cv.skills) {
            setSkillsInput(result.cv.skills.join(', '));
          }
          setIsDirty(true);
          setStatusMessage('CV Imported successfully!');
          setTimeout(() => setStatusMessage(''), 3000);
        } else {
          throw new Error('No parsed CV payload returned.');
        }
      } else {
        throw new Error('Parsing server failed.');
      }

    } catch (err) {
      console.error('Import error:', err);
      alert(`Import failed: ${err.message}`);
      setStatusMessage('');
    }
  };

  const handlePolishDescription = async (arrayKey, index, text) => {
    if (!text || text.trim().length === 0) {
      alert("Please enter some description text to polish first.");
      return;
    }
    const itemKey = `${arrayKey}-${index}`;
    setPolishingItems(prev => ({ ...prev, [itemKey]: true }));
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/cv/polish', {
        method: 'POST',
        headers,
        body: JSON.stringify({ text })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.polished) {
          updateArrayItem(arrayKey, index, 'description', data.polished);
        }
      } else {
        throw new Error("Polish failed");
      }
    } catch (err) {
      console.error(err);
      alert("AI Polishing experienced an issue.");
    } finally {
      setPolishingItems(prev => ({ ...prev, [itemKey]: false }));
    }
  };

  const validateCV = (data) => {
    const valErrors = { experience: [], education: [], projects: [] };
    let isValid = true;

    (data.experience || []).forEach((exp, idx) => {
      const expErrors = {};
      if (!exp.company?.trim()) {
        expErrors.company = 'Company name is required';
        isValid = false;
      }
      if (!exp.role?.trim()) {
        expErrors.role = 'Role/Position is required';
        isValid = false;
      }
      valErrors.experience[idx] = expErrors;
    });

    (data.education || []).forEach((edu, idx) => {
      const eduErrors = {};
      if (!edu.institution?.trim()) {
        eduErrors.institution = 'Institution name is required';
        isValid = false;
      }
      if (!edu.degree?.trim()) {
        eduErrors.degree = 'Degree / Focus is required';
        isValid = false;
      }
      valErrors.education[idx] = eduErrors;
    });

    (data.projects || []).forEach((proj, idx) => {
      const projErrors = {};
      if (!proj.title?.trim()) {
        projErrors.title = 'Project title is required';
        isValid = false;
      }
      valErrors.projects[idx] = projErrors;
    });

    return { isValid, errors: valErrors };
  };

  useEffect(() => {
    const loadSavedCV = async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString();
        const response = await fetch('/api/cv', {
          headers: {
            'Authorization': token ? `Bearer ${token}` : ''
          }
        });
        if (response.ok) {
          const data = await response.json();
          if (data?.cv) {
            const loadedTheme = data.cv.theme || 'classic';
            const loadedColor = data.cv.accentColor || '#3b82f6';
            setCvData({
              ...DEFAULT_CV,
              ...data.cv,
              theme: loadedTheme,
              accentColor: loadedColor
            });
            setPreviewTheme(loadedTheme);
            setSelectedColor(loadedColor);
            if (data.cv.skills) {
              setSkillsInput(data.cv.skills.join(', '));
            }
            setIsDirty(false);
          }
          if (data?.analysis) {
            setAnalysis(data.analysis);
          }
        }
      } catch (err) {
        console.error('Failed to load CV data:', err);
      }
    };
    loadSavedCV();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const highlight = params.get('highlight');
    if (highlight) {
      const tabMap = {
        'personal': 'personal',
        'education': 'education',
        'experience': 'experience',
        'skills': 'skills',
        'projects': 'projects',
        'languages': 'languages'
      };
      if (tabMap[highlight]) {
        setActiveTab(tabMap[highlight]);
      }

      setTimeout(() => {
        const element = document.getElementById(highlight);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('flash-outline');
          setTimeout(() => {
            element.classList.remove('flash-outline');
          }, 3000);
        }
      }, 600);
    }
  }, []);

  const handleSuggestionClick = (category) => {
    const targetTab = category.toLowerCase().trim();
    const validTabs = ['personal', 'experience', 'education', 'projects', 'skills', 'languages'];
    if (validTabs.includes(targetTab)) {
      setActiveTab(targetTab);
      setTimeout(() => {
        const element = document.getElementById(targetTab);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('flash-outline');
          setTimeout(() => {
            element.classList.remove('flash-outline');
          }, 3000);
        }
      }, 100);
    }
  };

  const getAuthHeaders = async () => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      };
    } catch (err) {
      console.error('Failed to resolve auth session:', err);
      return { 'Content-Type': 'application/json' };
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    const { isValid, errors: valErrors } = validateCV(cvData);
    setErrors(valErrors);

    if (!isValid) {
      if (valErrors.experience.some(x => Object.keys(x).length > 0)) {
        setActiveTab('experience');
      } else if (valErrors.education.some(x => Object.keys(x).length > 0)) {
        setActiveTab('education');
      } else if (valErrors.projects.some(x => Object.keys(x).length > 0)) {
        setActiveTab('projects');
      }
      setStatusMessage('Please fix form validation errors.');
      setTimeout(() => setStatusMessage(''), 4000);
      return false;
    }

    setIsSaving(true);
    setStatusMessage('');
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/cv', {
        method: 'POST',
        headers,
        body: JSON.stringify(cvData)
      });
      if (response.ok) {
        setStatusMessage('Draft saved successfully!');
        setIsDirty(false);
        setTimeout(() => setStatusMessage(''), 3000);
        return true;
      } else {
        throw new Error('Save draft failed');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving CV draft.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleAnalyze = async () => {
    const { isValid, errors: valErrors } = validateCV(cvData);
    setErrors(valErrors);

    if (!isValid) {
      if (valErrors.experience.some(x => Object.keys(x).length > 0)) {
        setActiveTab('experience');
      } else if (valErrors.education.some(x => Object.keys(x).length > 0)) {
        setActiveTab('education');
      } else if (valErrors.projects.some(x => Object.keys(x).length > 0)) {
        setActiveTab('projects');
      }
      setStatusMessage('Please fix form validation errors.');
      setTimeout(() => setStatusMessage(''), 4000);
      return;
    }

    setIsAnalyzing(true);
    setStatusMessage('');
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/cv/analyze', {
        method: 'POST',
        headers,
        body: JSON.stringify(cvData)
      });
      if (response.ok) {
        const result = await response.json();
        if (result?.analysis) {
          setAnalysis(result.analysis);
          setStatusMessage('AI Analysis complete!');
          setTimeout(() => setStatusMessage(''), 3000);
        }
      } else {
        throw new Error('AI analysis failed');
      }
    } catch (err) {
      console.error(err);
      alert('AI Reviewer experienced an issue. Fallback mock generated.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const updatePersonalInfo = (field, value) => {
    setIsDirty(true);
    setCvData(prev => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, [field]: value }
    }));
  };

  const handleSkillsChange = (val) => {
    setIsDirty(true);
    setSkillsInput(val);
    const cleaned = val.split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    setCvData(prev => ({ ...prev, skills: cleaned }));
  };

  const addArrayItem = (key, itemTemplate) => {
    setIsDirty(true);
    setCvData(prev => ({
      ...prev,
      [key]: [...(prev[key] || []), itemTemplate]
    }));
  };

  const updateArrayItem = (key, index, field, value) => {
    setIsDirty(true);
    setCvData(prev => {
      const copy = [...(prev[key] || [])];
      copy[index] = { ...copy[index], [field]: value };
      return { ...prev, [key]: copy };
    });
  };

  const removeArrayItem = (key, index) => {
    setIsDirty(true);
    setCvData(prev => ({
      ...prev,
      [key]: (prev[key] || []).filter((_, idx) => idx !== index)
    }));
  };

  const scrollTabs = (direction) => {
    const container = document.getElementById('tabs-scroll-container');
    if (container) {
      container.scrollBy({ left: direction === 'left' ? -150 : 150, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen text-[#e0e5f9] flex flex-col font-sans" style={{ backgroundColor: '#080e1c' }}>
      <style>{`
        .flash-outline {
          animation: pulse-border 1.5s 2 alternate;
          border-radius: 12px !important;
        }
        @keyframes pulse-border {
          0% {
            outline: 2px solid transparent;
            box-shadow: 0 0 0 transparent;
          }
          100% {
            outline: 3px solid #46eedd;
            box-shadow: 0 0 15px rgba(70, 238, 221, 0.4);
          }
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        body, div, section, nav, aside, header, footer, button, select, label, .cursor-pointer, [role="button"], .tab-btn, h1, h2, h3, h4, span, legend {
          outline: none !important;
        }
        button:focus, select:focus, label:focus {
          outline: none !important;
          box-shadow: none !important;
        }
        
        #cv-print-area {
          background-color: #ffffff !important;
          color: #1e293b !important;
        }
        #cv-print-area .bg-white { background-color: #ffffff !important; }
        #cv-print-area .bg-slate-50 { background-color: #f8fafc !important; }
        #cv-print-area .bg-gray-100 { background-color: #f3f4f6 !important; }
        #cv-print-area .bg-slate-800 { background-color: #1e293b !important; }
        #cv-print-area .bg-slate-100 { background-color: #f1f5f9 !important; }
        #cv-print-area .bg-slate-900 { background-color: #0f172a !important; }
        #cv-print-area .bg-[#0f172a] { background-color: #0f172a !important; }
        
        #cv-print-area .text-white { color: #ffffff !important; }
        #cv-print-area .text-gray-400 { color: #9ca3af !important; }
        #cv-print-area .text-gray-500 { color: #6b7280 !important; }
        #cv-print-area .text-gray-600 { color: #4b5563 !important; }
        #cv-print-area .text-gray-800 { color: #1f2937 !important; }
        
        #cv-print-area .text-slate-200 { color: #e2e8f0 !important; }
        #cv-print-area .text-slate-300 { color: #cbd5e1 !important; }
        #cv-print-area .text-slate-500 { color: #64748b !important; }
        #cv-print-area .text-slate-600 { color: #475569 !important; }
        #cv-print-area .text-slate-705, #cv-print-area .text-slate-700 { color: #334155 !important; }
        #cv-print-area .text-slate-805, #cv-print-area .text-slate-800 { color: #1e293b !important; }
        #cv-print-area .text-slate-900 { color: #0f172a !important; }
        
        #cv-print-area .text-[#1e293b] { color: #1e293b !important; }
        #cv-print-area .text-[#041329] { color: #041329 !important; }
        #cv-print-area .text-[#334155] { color: #334155 !important; }
        #cv-print-area .text-[#f1f5f9] { color: #f1f5f9 !important; }
        #cv-print-area .text-[#475569] { color: #475569 !important; }
        
        #cv-print-area .border-gray-200 { border-color: #e5e7eb !important; }
        #cv-print-area .border-slate-100 { border-color: #f1f5f9 !important; }
        #cv-print-area .border-slate-200 { border-color: #e2e8f0 !important; }
        #cv-print-area .border-slate-700 { border-color: #334155 !important; }

        @media print {
          body * {
            visibility: hidden;
          }
          #cv-print-area, #cv-print-area * {
            visibility: visible;
          }
          #cv-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>

      <header className="border-b border-[#424858]/20 px-6 h-16 flex items-center justify-between bg-[#080e1c] shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[#a5abbd] hover:text-white hover:bg-[#1c2a41] transition-colors"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Back to Dashboard
          </button>
          <span className="text-xl font-black tracking-tighter text-[#46eedd]">HireMe CV Builder</span>
        </div>
        <div className="flex items-center gap-3">
          {statusMessage && (
            <span className="text-xs text-[#4ae183] font-bold animate-pulse">{statusMessage}</span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 border border-[#424858]/40 hover:border-white rounded-lg text-xs font-bold transition-all uppercase tracking-wider disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="px-4 py-2 bg-[#46eedd] text-[#080e1c] rounded-lg text-xs font-black transition-all hover:scale-105 uppercase tracking-wider disabled:opacity-50"
          >
            {isAnalyzing ? 'Analyzing...' : 'Run AI Analysis'}
          </button>

          <div className="relative" id="action-dropdown-container">
            <button
              onClick={() => setShowActionMenu(!showActionMenu)}
              className="px-4 py-2 bg-[#1c2a41] border border-[#5bf4de]/30 hover:border-[#5bf4de] text-[#5bf4de] rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all select-none cursor-pointer"
            >
              Actions
              <span className="material-symbols-outlined text-sm">expand_more</span>
            </button>
            {showActionMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-[#0d1c32] border border-[#424858]/35 rounded-xl shadow-2xl py-1.5 z-50 animate-fade-in">
                <label className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-[#e0e5f9] hover:bg-[#1c2a41] hover:text-[#46eedd] cursor-pointer transition-colors w-full text-left">
                  <span className="material-symbols-outlined text-base">cloud_upload</span>
                  Import Existing CV
                  <input type="file" accept=".pdf,.docx,.txt" onChange={(e) => { setShowActionMenu(false); handleImportCV(e); }} className="hidden" />
                </label>
                <button
                  onClick={() => { setShowActionMenu(false); handleExportPDF(); }}
                  className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-[#e0e5f9] hover:bg-[#1c2a41] hover:text-[#46eedd] cursor-pointer transition-colors w-full text-left bg-transparent border-none"
                >
                  <span className="material-symbols-outlined text-base">download</span>
                  Export as PDF
                </button>
              </div>
            )}
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              className="px-3 py-2 text-xs font-semibold text-gray-500 hover:text-white"
            >
              Log out
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/2 flex flex-col border-r border-[#424858]/20 bg-[#0d1c32]">
          <div 
            className="relative flex items-center bg-[#041329] border-b border-[#424858]/20 group"
            onMouseEnter={() => setIsTabHovered(true)}
            onMouseLeave={() => setIsTabHovered(false)}
          >
            <button
              type="button"
              onClick={() => scrollTabs('left')}
              className={`absolute left-0 top-0 bottom-0 z-10 px-2 bg-gradient-to-r from-[#041329] to-transparent text-[#46eedd] hover:text-white flex items-center justify-center transition-opacity duration-300 border-none cursor-pointer ${
                isTabHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <span className="material-symbols-outlined text-base font-black">chevron_left</span>
            </button>

            <div 
              id="tabs-scroll-container"
              className="flex-1 flex p-2 gap-1 overflow-x-auto hide-scrollbar scroll-smooth"
            >
              {[
                { id: 'personal', label: 'Personal Info', icon: 'person' },
                { id: 'experience', label: 'Experience', icon: 'work' },
                { id: 'education', label: 'Education', icon: 'school' },
                { id: 'projects', label: 'Projects', icon: 'code' },
                { id: 'skills', label: 'Skills', icon: 'star' },
                { id: 'languages', label: 'Languages', icon: 'translate' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`tab-btn flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shrink-0 ${
                    activeTab === tab.id
                      ? 'bg-[#1c2a41] text-[#46eedd] border-b-2 border-[#46eedd]'
                      : 'text-[#bacac6] hover:bg-[#1c2a41]/50 hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}

              {(cvData.customSections || []).map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => setActiveTab(sec.id)}
                  className={`tab-btn flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shrink-0 ${
                    activeTab === sec.id
                      ? 'bg-[#1c2a41] text-[#46eedd] border-b-2 border-[#46eedd]'
                      : 'text-[#bacac6] hover:bg-[#1c2a41]/50 hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">dashboard_customize</span>
                  {sec.title || 'New Section'}
                </button>
              ))}

              <button 
                onClick={handleAddCustomSection}
                className="px-3.5 py-2.5 rounded-lg border border-dashed border-[#424858]/40 hover:border-[#46eedd] hover:bg-[#1c2a41]/40 text-[#a5abbd] hover:text-[#46eedd] text-xs font-black transition-all flex items-center justify-center shrink-0 hover:shadow-[0_0_10px_rgba(70,238,221,0.15)] no-underline cursor-pointer"
                title="Add Custom Section"
              >
                <span className="material-symbols-outlined text-base">add</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => scrollTabs('right')}
              className={`absolute right-0 top-0 bottom-0 z-10 px-2 bg-gradient-to-l from-[#041329] to-transparent text-[#46eedd] hover:text-white flex items-center justify-center transition-opacity duration-300 border-none cursor-pointer ${
                isTabHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <span className="material-symbols-outlined text-base font-black">chevron_right</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {activeTab === 'personal' && (
              <fieldset id="personal" className="space-y-4 p-4 rounded-xl bg-[#041329] border border-[#3b4a47]/30 transition-all">
                <legend className="text-xs font-black uppercase text-[#46eedd] tracking-widest px-2">Personal Details</legend>
                <div>
                  <label className="block text-[10px] font-black uppercase text-[#bacac6] mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={cvData.personalInfo?.fullName || ''}
                    onChange={e => updatePersonalInfo('fullName', e.target.value)}
                    className="w-full bg-[#080e1c] border border-[#3b4a47]/40 rounded-lg p-2.5 text-xs text-white focus:border-[#46eedd] outline-none"
                    placeholder="John Doe"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-[#bacac6] mb-1.5">Email Address</label>
                    <input
                      type="email"
                      value={cvData.personalInfo?.email || ''}
                      onChange={e => updatePersonalInfo('email', e.target.value)}
                      className="w-full bg-[#080e1c] border border-[#3b4a47]/40 rounded-lg p-2.5 text-xs text-white focus:border-[#46eedd] outline-none"
                      placeholder="johndoe@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-[#bacac6] mb-1.5">Phone Number</label>
                    <input
                      type="text"
                      value={cvData.personalInfo?.phone || ''}
                      onChange={e => updatePersonalInfo('phone', e.target.value)}
                      className="w-full bg-[#080e1c] border border-[#3b4a47]/40 rounded-lg p-2.5 text-xs text-white focus:border-[#46eedd] outline-none"
                      placeholder="050-1234567"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-[#bacac6] mb-1.5">LinkedIn Profile</label>
                    <input
                      type="text"
                      value={cvData.personalInfo?.linkedin || ''}
                      onChange={e => updatePersonalInfo('linkedin', e.target.value)}
                      className="w-full bg-[#080e1c] border border-[#3b4a47]/40 rounded-lg p-2.5 text-xs text-white focus:border-[#46eedd] outline-none"
                      placeholder="linkedin.com/in/username"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-[#bacac6] mb-1.5">GitHub Profile</label>
                    <input
                      type="text"
                      value={cvData.personalInfo?.github || ''}
                      onChange={e => updatePersonalInfo('github', e.target.value)}
                      className="w-full bg-[#080e1c] border border-[#3b4a47]/40 rounded-lg p-2.5 text-xs text-white focus:border-[#46eedd] outline-none"
                      placeholder="github.com/username"
                    />
                  </div>
                </div>

                {(cvData.personalInfo?.customFields || []).map((cf, cfIdx) => (
                  <div key={cfIdx} className="flex gap-2 items-end mt-2 animate-fade-in">
                    <div className="w-1/3">
                      <label className="block text-[8px] font-black uppercase text-[#bacac6] mb-1">Field Label</label>
                      <input
                        type="text"
                        value={cf.label}
                        onChange={e => updateCustomFieldLabel('personal', null, cfIdx, e.target.value)}
                        className="w-full bg-[#0d1c32] border border-[#3b4a47]/40 rounded p-2.5 text-xs text-[#46eedd] outline-none"
                        placeholder="Field Label"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[8px] font-black uppercase text-[#bacac6] mb-1">Value</label>
                      <input
                        type="text"
                        value={cf.value}
                        onChange={e => updateCustomFieldValue('personal', null, cfIdx, e.target.value)}
                        className="w-full bg-[#080e1c] border border-[#3b4a47]/40 rounded-lg p-2.5 text-xs text-white focus:border-[#46eedd] outline-none"
                        placeholder="Details..."
                      />
                    </div>
                    <button 
                      type="button"
                      onClick={() => removeCustomField('personal', null, cfIdx)}
                      className="p-2 border border-transparent hover:border-red-500/25 text-red-400 hover:text-red-500 rounded cursor-pointer"
                      title="Remove Field"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                ))}

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => addCustomField('personal', null)}
                    className="flex items-center gap-1.5 px-3 py-1 border border-dashed border-[#5bf4de]/30 hover:border-[#5bf4de] text-[#5bf4de] text-[10px] font-bold uppercase transition-all bg-transparent cursor-pointer rounded-md animate-fade-in"
                  >
                    <span className="material-symbols-outlined text-xs">add</span> Add Custom Field
                  </button>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-[#bacac6] mb-1.5">Professional Summary</label>
                  <textarea
                    rows={4}
                    value={cvData.personalInfo?.summary || ''}
                    onChange={e => updatePersonalInfo('summary', e.target.value)}
                    className="w-full bg-[#080e1c] border border-[#3b4a47]/40 rounded-lg p-2.5 text-xs text-white focus:border-[#46eedd] outline-none resize-none"
                    placeholder="Ambitious computer science student with a strong drive for software engineering..."
                  />
                </div>
              </fieldset>
            )}

            {activeTab === 'experience' && (
              <fieldset id="experience" className="space-y-4 p-4 rounded-xl bg-[#041329] border border-[#3b4a47]/30 transition-all">
                <legend className="text-xs font-black uppercase text-[#46eedd] tracking-widest px-2">Work Experience</legend>
                {(cvData.experience || []).map((exp, index) => {
                  const expErrors = errors.experience[index] || {};
                  return (
                    <div key={index} className="p-4 bg-[#080e1c] border border-[#3b4a47]/30 rounded-lg relative space-y-3">
                      <button
                        type="button"
                        onClick={() => removeArrayItem('experience', index)}
                        className="absolute top-2 right-2 text-red-400 hover:text-red-500 text-xs font-bold flex items-center cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-black uppercase text-[#bacac6] mb-1">Company *</label>
                          <input
                            type="text"
                            value={exp.company || ''}
                            onChange={e => updateArrayItem('experience', index, 'company', e.target.value)}
                            className={`w-full bg-[#0d1c32] border rounded p-2 text-xs text-white outline-none ${
                              expErrors.company ? 'border-red-500 focus:border-red-500' : 'border-[#3b4a47]/40 focus:border-[#46eedd]'
                            }`}
                          />
                          {expErrors.company && <p className="text-[9px] text-red-500 mt-1">{expErrors.company}</p>}
                        </div>
                        <div>
                          <label className="block text-[9px] font-black uppercase text-[#bacac6] mb-1">Role *</label>
                          <input
                            type="text"
                            value={exp.role || ''}
                            onChange={e => updateArrayItem('experience', index, 'role', e.target.value)}
                            className={`w-full bg-[#0d1c32] border rounded p-2 text-xs text-white outline-none ${
                              expErrors.role ? 'border-red-500 focus:border-red-500' : 'border-[#3b4a47]/40 focus:border-[#46eedd]'
                            }`}
                          />
                          {expErrors.role && <p className="text-[9px] text-red-500 mt-1">{expErrors.role}</p>}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-black uppercase text-[#bacac6] mb-1">Start Date</label>
                          <input
                            type="text"
                            placeholder="MM/YYYY"
                            value={exp.startDate || ''}
                            onChange={e => updateArrayItem('experience', index, 'startDate', e.target.value)}
                            className="w-full bg-[#0d1c32] border border-[#3b4a47]/40 rounded p-2 text-xs text-white outline-none focus:border-[#46eedd]"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black uppercase text-[#bacac6] mb-1">End Date</label>
                          <input
                            type="text"
                            placeholder="MM/YYYY or Present"
                            value={exp.endDate || ''}
                            onChange={e => updateArrayItem('experience', index, 'endDate', e.target.value)}
                            className="w-full bg-[#0d1c32] border border-[#3b4a47]/40 rounded p-2 text-xs text-white outline-none focus:border-[#46eedd]"
                          />
                        </div>
                      </div>

                      {(exp.customFields || []).map((cf, cfIdx) => (
                        <div key={cfIdx} className="flex gap-2 items-end mt-2 animate-fade-in">
                          <div className="w-1/3">
                            <label className="block text-[8px] font-black uppercase text-[#bacac6] mb-1">Field Label</label>
                            <input
                              type="text"
                              value={cf.label}
                              onChange={e => updateCustomFieldLabel('experience', index, cfIdx, e.target.value)}
                              className="w-full bg-[#0d1c32] border border-[#3b4a47]/40 rounded p-2 text-xs text-[#46eedd] outline-none"
                              placeholder="Field Label"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-[8px] font-black uppercase text-[#bacac6] mb-1">Value</label>
                            <input
                              type="text"
                              value={cf.value}
                              onChange={e => updateCustomFieldValue('experience', index, cfIdx, e.target.value)}
                              className="w-full bg-[#0d1c32] border border-[#3b4a47]/40 rounded p-2 text-xs text-white outline-none"
                            />
                          </div>
                          <button 
                            type="button"
                            onClick={() => removeCustomField('experience', index, cfIdx)}
                            className="p-2 text-red-400 hover:text-red-500 rounded cursor-pointer"
                            title="Remove Field"
                          >
                            <span className="material-symbols-outlined text-sm">close</span>
                          </button>
                        </div>
                      ))}

                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          onClick={() => addCustomField('experience', index)}
                          className="flex items-center gap-1.5 px-3 py-1 border border-dashed border-[#5bf4de]/30 hover:border-[#5bf4de] text-[#5bf4de] text-[10px] font-bold uppercase transition-all bg-transparent cursor-pointer rounded-md animate-fade-in"
                        >
                          <span className="material-symbols-outlined text-xs">add</span> Add Custom Field
                        </button>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="block text-[9px] font-black uppercase text-[#bacac6]">Description / Achievements</label>
                          <button
                            type="button"
                            disabled={polishingItems[`experience-${index}`]}
                            onClick={() => handlePolishDescription('experience', index, exp.description)}
                            className="flex items-center gap-1 text-[8px] font-black uppercase bg-[#46eedd]/15 hover:bg-[#46eedd]/25 text-[#46eedd] px-2 py-0.5 rounded border border-[#46eedd]/20 transition-all disabled:opacity-50 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[10px]">{polishingItems[`experience-${index}`] ? 'sync' : 'auto_awesome'}</span>
                            {polishingItems[`experience-${index}`] ? 'Polishing...' : '✨ AI Polish'}
                          </button>
                        </div>
                        <textarea
                          rows={3}
                          disabled={polishingItems[`experience-${index}`]}
                          value={exp.description || ''}
                          onChange={e => updateArrayItem('experience', index, 'description', e.target.value)}
                          className={`w-full bg-[#0d1c32] border border-[#3b4a47]/40 rounded p-2 text-xs text-white resize-none outline-none focus:border-[#46eedd] ${
                            polishingItems[`experience-${index}`] ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={() => addArrayItem('experience', { company: '', role: '', startDate: '', endDate: '', description: '', customFields: [] })}
                  className="w-full py-2 border-2 border-dashed border-[#46eedd]/30 hover:border-[#46eedd]/75 rounded-lg text-xs font-bold text-[#46eedd] uppercase transition-all cursor-pointer"
                >
                  + Add Experience
                </button>
              </fieldset>
            )}

            {activeTab === 'education' && (
              <fieldset id="education" className="space-y-4 p-4 rounded-xl bg-[#041329] border border-[#3b4a47]/30 transition-all">
                <legend className="text-xs font-black uppercase text-[#46eedd] tracking-widest px-2">Education History</legend>
                {(cvData.education || []).map((edu, index) => {
                  const eduErrors = errors.education[index] || {};
                  return (
                    <div key={index} className="p-4 bg-[#080e1c] border border-[#3b4a47]/30 rounded-lg relative space-y-3">
                      <button
                        type="button"
                        onClick={() => removeArrayItem('education', index)}
                        className="absolute top-2 right-2 text-red-400 hover:text-red-500 text-xs font-bold flex items-center cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                      <div>
                        <label className="block text-[9px] font-black uppercase text-[#bacac6] mb-1">Institution *</label>
                        <input
                          type="text"
                          value={edu.institution || ''}
                          onChange={e => updateArrayItem('education', index, 'institution', e.target.value)}
                          className={`w-full bg-[#0d1c32] border rounded p-2 text-xs text-white outline-none ${
                            eduErrors.institution ? 'border-red-500 focus:border-red-500' : 'border-[#3b4a47]/40 focus:border-[#46eedd]'
                          }`}
                        />
                        {eduErrors.institution && <p className="text-[9px] text-red-505 mt-1">{eduErrors.institution}</p>}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <label className="block text-[9px] font-black uppercase text-[#bacac6] mb-1">Degree / Focus *</label>
                          <input
                            type="text"
                            value={edu.degree || ''}
                            onChange={e => updateArrayItem('education', index, 'degree', e.target.value)}
                            className={`w-full bg-[#0d1c32] border rounded p-2 text-xs text-white outline-none ${
                              eduErrors.degree ? 'border-red-500 focus:border-red-500' : 'border-[#3b4a47]/40 focus:border-[#46eedd]'
                            }`}
                          />
                          {eduErrors.degree && <p className="text-[9px] text-red-500 mt-1">{eduErrors.degree}</p>}
                        </div>
                        <div>
                          <label className="block text-[9px] font-black uppercase text-[#bacac6] mb-1">End Year</label>
                          <input
                            type="text"
                            placeholder="YYYY"
                            value={edu.endYear || ''}
                            onChange={e => updateArrayItem('education', index, 'endYear', e.target.value)}
                            className="w-full bg-[#0d1c32] border border-[#3b4a47]/40 rounded p-2 text-xs text-white"
                          />
                        </div>
                      </div>

                      {(edu.customFields || []).map((cf, cfIdx) => (
                        <div key={cfIdx} className="flex gap-2 items-end mt-2 animate-fade-in">
                          <div className="w-1/3">
                            <label className="block text-[8px] font-black uppercase text-[#bacac6] mb-1">Field Label</label>
                            <input
                              type="text"
                              value={cf.label}
                              onChange={e => updateCustomFieldLabel('education', index, cfIdx, e.target.value)}
                              className="w-full bg-[#0d1c32] border border-[#3b4a47]/40 rounded p-2 text-xs text-[#46eedd] outline-none"
                              placeholder="Field Label"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-[8px] font-black uppercase text-[#bacac6] mb-1">Value</label>
                            <input
                              type="text"
                              value={cf.value}
                              onChange={e => updateCustomFieldValue('education', index, cfIdx, e.target.value)}
                              className="w-full bg-[#0d1c32] border border-[#3b4a47]/40 rounded p-2 text-xs text-white outline-none"
                            />
                          </div>
                          <button 
                            type="button"
                            onClick={() => removeCustomField('education', index, cfIdx)}
                            className="p-2 text-red-400 hover:text-red-500 rounded cursor-pointer"
                            title="Remove Field"
                          >
                            <span className="material-symbols-outlined text-sm">close</span>
                          </button>
                        </div>
                      ))}

                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          onClick={() => addCustomField('education', index)}
                          className="flex items-center gap-1.5 px-3 py-1 border border-dashed border-[#5bf4de]/30 hover:border-[#5bf4de] text-[#5bf4de] text-[10px] font-bold uppercase transition-all bg-transparent cursor-pointer rounded-md animate-fade-in"
                        >
                          <span className="material-symbols-outlined text-xs">add</span> Add Custom Field
                        </button>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="block text-[9px] font-black uppercase text-[#bacac6]">Description / Achievements</label>
                          <button
                            type="button"
                            disabled={polishingItems[`education-${index}`]}
                            onClick={() => handlePolishDescription('education', index, edu.description)}
                            className="flex items-center gap-1 text-[8px] font-black uppercase bg-[#46eedd]/15 hover:bg-[#46eedd]/25 text-[#46eedd] px-2 py-0.5 rounded border border-[#46eedd]/20 transition-all disabled:opacity-50 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[10px]">{polishingItems[`education-${index}`] ? 'sync' : 'auto_awesome'}</span>
                            {polishingItems[`education-${index}`] ? 'Polishing...' : '✨ AI Polish'}
                          </button>
                        </div>
                        <textarea
                          rows={3}
                          disabled={polishingItems[`education-${index}`]}
                          value={edu.description || ''}
                          onChange={e => updateArrayItem('education', index, 'description', e.target.value)}
                          className="w-full bg-[#0d1c32] border border-[#3b4a47]/40 rounded p-2 text-xs text-white resize-none outline-none focus:border-[#46eedd]"
                          placeholder="Relevant coursework, achievements, or honors details..."
                        />
                      </div>
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={() => addArrayItem('education', { institution: '', degree: '', startYear: '', endYear: '', description: '', customFields: [] })}
                  className="w-full py-2 border-2 border-dashed border-[#46eedd]/30 hover:border-[#46eedd]/75 rounded-lg text-xs font-bold text-[#46eedd] uppercase transition-all cursor-pointer"
                >
                  + Add Education
                </button>
              </fieldset>
            )}

            {activeTab === 'projects' && (
              <fieldset id="projects" className="space-y-4 p-4 rounded-xl bg-[#041329] border border-[#3b4a47]/30 transition-all">
                <legend className="text-xs font-black uppercase text-[#46eedd] tracking-widest px-2">Technical Projects</legend>
                {(cvData.projects || []).map((proj, index) => {
                  const projErrors = errors.projects[index] || {};
                  return (
                    <div key={index} className="p-4 bg-[#080e1c] border border-[#3b4a47]/30 rounded-lg relative space-y-3">
                      <button
                        type="button"
                        onClick={() => removeArrayItem('projects', index)}
                        className="absolute top-2 right-2 text-red-400 hover:text-red-500 text-xs font-bold flex items-center cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                      <div>
                        <label className="block text-[9px] font-black uppercase text-[#bacac6] mb-1">Project Title *</label>
                        <input
                          type="text"
                          value={proj.title || ''}
                          onChange={e => updateArrayItem('projects', index, 'title', e.target.value)}
                          className={`w-full bg-[#0d1c32] border rounded p-2 text-xs text-white outline-none ${
                            projErrors.title ? 'border-red-500 focus:border-red-500' : 'border-[#3b4a47]/40 focus:border-[#46eedd]'
                          }`}
                        />
                        {projErrors.title && <p className="text-[9px] text-red-505 mt-1">{projErrors.title}</p>}
                      </div>
                      <div>
                        <label className="block text-[9px] font-black uppercase text-[#bacac6] mb-1">Technologies Used (comma separated)</label>
                        <input
                          type="text"
                          placeholder="React, Node.js, Express"
                          value={proj.technologies ? proj.technologies.join(', ') : ''}
                          onChange={e => {
                            const list = e.target.value.split(',').map(t => t.trim()).filter(t => t.length > 0);
                            updateArrayItem('projects', index, 'technologies', list);
                          }}
                          className="w-full bg-[#0d1c32] border border-[#3b4a47]/40 rounded p-2 text-xs text-white"
                        />
                      </div>

                      {(proj.customFields || []).map((cf, cfIdx) => (
                        <div key={cfIdx} className="flex gap-2 items-end mt-2 animate-fade-in">
                          <div className="w-1/3">
                            <label className="block text-[8px] font-black uppercase text-[#bacac6] mb-1">Field Label</label>
                            <input
                              type="text"
                              value={cf.label}
                              onChange={e => updateCustomFieldLabel('projects', index, cfIdx, e.target.value)}
                              className="w-full bg-[#0d1c32] border border-[#3b4a47]/40 rounded p-2 text-xs text-[#46eedd] outline-none"
                              placeholder="Field Label"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-[8px] font-black uppercase text-[#bacac6] mb-1">Value</label>
                            <input
                              type="text"
                              value={cf.value}
                              onChange={e => updateCustomFieldValue('projects', index, cfIdx, e.target.value)}
                              className="w-full bg-[#0d1c32] border border-[#3b4a47]/40 rounded p-2 text-xs text-white outline-none"
                            />
                          </div>
                          <button 
                            type="button"
                            onClick={() => removeCustomField('projects', index, cfIdx)}
                            className="p-2 text-red-400 hover:text-red-500 rounded cursor-pointer"
                            title="Remove Field"
                          >
                            <span className="material-symbols-outlined text-sm">close</span>
                          </button>
                        </div>
                      ))}

                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          onClick={() => addCustomField('projects', index)}
                          className="flex items-center gap-1.5 px-3 py-1 border border-dashed border-[#5bf4de]/30 hover:border-[#5bf4de] text-[#5bf4de] text-[10px] font-bold uppercase transition-all bg-transparent cursor-pointer rounded-md animate-fade-in"
                        >
                          <span className="material-symbols-outlined text-xs">add</span> Add Custom Field
                        </button>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="block text-[9px] font-black uppercase text-[#bacac6]">Description</label>
                          <button
                            type="button"
                            disabled={polishingItems[`projects-${index}`]}
                            onClick={() => handlePolishDescription('projects', index, proj.description)}
                            className="flex items-center gap-1 text-[8px] font-black uppercase bg-[#46eedd]/15 hover:bg-[#46eedd]/25 text-[#46eedd] px-2 py-0.5 rounded border border-[#46eedd]/20 transition-all disabled:opacity-50 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[10px]">{polishingItems[`projects-${index}`] ? 'sync' : 'auto_awesome'}</span>
                            {polishingItems[`projects-${index}`] ? 'Polishing...' : '✨ AI Polish'}
                          </button>
                        </div>
                        <textarea
                          rows={3}
                          disabled={polishingItems[`projects-${index}`]}
                          value={proj.description || ''}
                          onChange={e => updateArrayItem('projects', index, 'description', e.target.value)}
                          className={`w-full bg-[#0d1c32] border border-[#3b4a47]/40 rounded p-2 text-xs text-white resize-none outline-none focus:border-[#46eedd] ${
                            polishingItems[`projects-${index}`] ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={() => addArrayItem('projects', { title: '', technologies: [], description: '', customFields: [] })}
                  className="w-full py-2 border-2 border-dashed border-[#46eedd]/30 hover:border-[#46eedd]/75 rounded-lg text-xs font-bold text-[#46eedd] uppercase transition-all cursor-pointer"
                >
                  + Add Project
                </button>
              </fieldset>
            )}

            {activeTab === 'skills' && (
              <fieldset id="skills" className="space-y-4 p-4 rounded-xl bg-[#041329] border border-[#3b4a47]/30 transition-all">
                <legend className="text-xs font-black uppercase text-[#46eedd] tracking-widest px-2">Skills & Technologies</legend>
                <div>
                  <label className="block text-[10px] font-black uppercase text-[#bacac6] mb-2">
                    Enter technical skills, languages, or tools (separated by commas)
                  </label>
                  <input
                    type="text"
                    value={skillsInput}
                    onChange={e => handleSkillsChange(e.target.value)}
                    className="w-full bg-[#080e1c] border border-[#3b4a47]/40 rounded-lg p-2.5 text-xs text-white focus:border-[#46eedd] outline-none"
                    placeholder="Python, Java, JavaScript, AWS, Git"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {(cvData.skills || []).map((skill, idx) => (
                      <span key={idx} className="bg-[#1c2a41] text-[#46eedd] px-2.5 py-1 rounded-full text-[10px] font-bold border border-[#46eedd]/10">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </fieldset>
            )}

            {activeTab === 'languages' && (
              <fieldset id="languages" className="space-y-4 p-4 rounded-xl bg-[#041329] border border-[#3b4a47]/30 transition-all">
                <legend className="text-xs font-black uppercase text-[#46eedd] tracking-widest px-2">Languages</legend>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 bg-[#080e1c] p-3 rounded-lg border border-[#3b4a47]/20">
                    <div>
                      <label className="block text-[9px] font-black uppercase text-[#bacac6] mb-1">Language Name</label>
                      <input
                        type="text"
                        id="new-lang-name"
                        placeholder="e.g. English"
                        className="w-full bg-[#0d1c32] border border-[#3b4a47]/40 rounded p-2 text-xs text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase text-[#bacac6] mb-1">Proficiency Level</label>
                      <select
                        id="new-lang-level"
                        className="w-full bg-[#0d1c32] border border-[#3b4a47]/40 rounded p-2 text-xs text-white outline-none"
                      >
                        <option value="Native">Native</option>
                        <option value="Fluent">Fluent</option>
                        <option value="Professional">Professional</option>
                        <option value="Conversational">Conversational</option>
                        <option value="Basic">Basic</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const nameEl = document.getElementById('new-lang-name');
                        const levelEl = document.getElementById('new-lang-level');
                        if (nameEl && nameEl.value.trim()) {
                          addLanguage(nameEl.value.trim(), levelEl.value);
                          nameEl.value = '';
                        }
                      }}
                      className="col-span-2 mt-2 py-2 bg-[#46eedd] text-[#080e1c] rounded text-xs font-black uppercase tracking-wider transition-all hover:scale-[1.02] cursor-pointer"
                    >
                      Add Language
                    </button>
                  </div>

                  {cvData.languages && cvData.languages.length > 0 && (
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black uppercase text-[#a5abbd]">Current Languages</label>
                      <div className="grid grid-cols-1 gap-2">
                        {cvData.languages.map((lang, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-[#080e1c] border border-[#3b4a47]/20 rounded-lg">
                            <span className="text-xs font-bold text-white">
                              {lang.language} <span className="text-slate-400 font-normal">({lang.level})</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => removeLanguage(index)}
                              className="text-red-400 hover:text-red-500 text-xs font-bold cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </fieldset>
            )}

            {activeTab.startsWith('custom_') && (() => {
              const sec = (cvData.customSections || []).find(s => s.id === activeTab);
              if (!sec) return null;
              return (
                <fieldset id={sec.id} className="space-y-4 p-4 rounded-xl bg-[#041329] border border-[#3b4a47]/30 transition-all">
                  <legend className="text-xs font-black uppercase text-[#46eedd] tracking-widest px-2">Custom Category</legend>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex-1 mr-3">
                        <label className="block text-[9px] font-black uppercase text-[#bacac6] mb-1">Section Name / Title</label>
                        <input
                          type="text"
                          value={sec.title}
                          onChange={e => updateCustomSection(sec.id, 'title', e.target.value)}
                          className="w-full bg-[#080e1c] border border-[#3b4a47]/40 rounded-lg p-2.5 text-xs text-white focus:border-[#46eedd] outline-none"
                          placeholder="NEW SECTION"
                          autoFocus
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCustomSection(sec.id)}
                        className="mt-4 px-3 py-2.5 border border-red-500/30 hover:border-red-500 rounded-lg text-red-400 text-xs font-bold transition-all flex items-center gap-1 active:scale-95 cursor-pointer bg-transparent"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span> Delete Section
                      </button>
                    </div>

                    <div>
                      <label className="block text-[9px] font-black uppercase text-[#bacac6] mb-1">Content / Description</label>
                      <textarea
                        rows={6}
                        value={sec.content || ''}
                        onChange={e => updateCustomSection(sec.id, 'content', e.target.value)}
                        className="w-full bg-[#080e1c] border border-[#3b4a47]/40 rounded-lg p-2.5 text-xs text-white focus:border-[#46eedd] outline-none resize-none"
                        placeholder="Write anything you'd like to display in this section..."
                      />
                    </div>
                  </div>
                </fieldset>
              );
            })()}

          </div>
        </div>

        <div className="w-1/2 flex flex-col bg-[#080e1c]">
          <div className="flex border-b border-[#424858]/20 bg-[#080e1c] px-6 h-12 items-center justify-between shrink-0 animate-fade-in">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-[#a5abbd]">Theme</span>
                <div className="flex bg-[#041329] p-0.5 rounded-lg border border-[#424858]/35">
                  {['classic', 'modern', 'creative'].map(t => (
                    <button
                      key={t}
                      onClick={() => { setPreviewTheme(t); setCvData(prev => ({ ...prev, theme: t })); }}
                      className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider transition-all ${
                        previewTheme === t 
                          ? 'bg-[#1c2a41] text-[#46eedd]' 
                          : 'text-[#bacac6] hover:text-white bg-transparent'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 border-l border-[#424858]/20 pl-4">
                <span className="text-xs font-black uppercase tracking-wider text-[#a5abbd]">Accent</span>
                <div className="flex items-center gap-1.5">
                  {[
                    { hex: '#3b82f6', label: 'Blue' },
                    { hex: '#10b981', label: 'Green' },
                    { hex: '#8b5cf6', label: 'Violet' },
                    { hex: '#ef4444', label: 'Crimson' },
                    { hex: '#4b5563', label: 'Slate' }
                  ].map(color => (
                    <button
                      key={color.hex}
                      onClick={() => { setSelectedColor(color.hex); setCvData(prev => ({ ...prev, accentColor: color.hex })); }}
                      title={color.label}
                      style={{ backgroundColor: color.hex }}
                      className={`w-3.5 h-3.5 rounded-full border transition-all active:scale-90 ${
                        selectedColor === color.hex ? 'border-white scale-110 ring-1 ring-[#46eedd]' : 'border-transparent hover:scale-105'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
            {analysis && (() => {
              const scoreVal = parseInt(analysis.score, 10) || 0;
              let scoreColor = 'text-[#10b981] bg-[#10b981]/15 border-[#10b981]/25';
              if (scoreVal <= 40) {
                scoreColor = 'text-[#ef4444] bg-[#ef4444]/15 border-[#ef4444]/25';
              } else if (scoreVal <= 70) {
                scoreColor = 'text-[#f97316] bg-[#f97316]/15 border-[#f97316]/25';
              }
              return (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-[#a5abbd] uppercase">AI Review Score:</span>
                  <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${scoreColor}`}>
                    {analysis.score}/100
                  </span>
                </div>
              );
            })()}
          </div>

          <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
            {analysis && (
              <div className="p-4 rounded-xl border border-[#3b4a47]/30 bg-[#041329] space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#46eedd]">AI Feedback Suggestions</h4>
                  {analysis.isMockFallback && (
                    <span className="text-[8px] bg-amber-500/10 text-amber-500 font-bold px-1.5 py-0.5 rounded border border-amber-500/20">
                      MOCK FALLBACK ACTIVE
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-2.5 max-h-48 overflow-y-auto pr-1 custom-scroll">
                  {analysis.suggestions.map((s, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => handleSuggestionClick(s.category)}
                      className="p-3 bg-[#080e1c] hover:bg-[#12192a]/80 rounded-lg border-l-2 border-[#4ae183] text-[11px] leading-normal cursor-pointer transition-all hover:translate-x-1 group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[8px] font-black uppercase text-[#4ae183] bg-[#4ae183]/10 px-2 py-0.5 rounded-full">
                          {s.category}
                        </span>
                        <span className="material-symbols-outlined text-[11px] text-[#4ae183] opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
                      </div>
                      <p className="text-[#e0e5f9] font-bold group-hover:text-white transition-colors">{s.issue}</p>
                      <p className="text-[#a5abbd] mt-1 italic">Fix: {s.fix}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-1.5 bg-[#12192a] border border-[#424858]/30 rounded-xl max-w-[800px] mx-auto w-full">
              <CVPreviewer theme={previewTheme} accentColor={selectedColor} data={cvData} onChange={handleFieldUpdate} />
            </div>
          </div>
        </div>
      </div>

      {showUnsavedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0d1c32] border border-[#424858]/40 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl space-y-6 text-center">
            <span className="material-symbols-outlined text-4xl text-amber-400">warning</span>
            <div className="space-y-2">
              <h3 className="text-lg font-black uppercase tracking-wider text-white">Unsaved Changes</h3>
              <p className="text-xs text-[#a5abbd] leading-relaxed">
                You have unsaved changes in your workspace. Would you like to save before leaving?
              </p>
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={async () => {
                  setShowUnsavedModal(false);
                  const saved = await handleSave();
                  if (saved !== false) {
                    onBack();
                  }
                }}
                className="px-4 py-2 bg-[#46eedd] text-[#080e1c] rounded-lg text-xs font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                Yes, Save
              </button>
              <button
                onClick={() => {
                  setShowUnsavedModal(false);
                  onBack();
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 border border-slate-700 cursor-pointer"
              >
                No, Discard
              </button>
              <button
                onClick={() => setShowUnsavedModal(false)}
                className="px-4 py-2 bg-transparent text-[#bacac6] hover:text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CVBuilder;