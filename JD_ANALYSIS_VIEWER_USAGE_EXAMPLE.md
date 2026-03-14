# **📖 JDExtractionViewer Usage Example**

## **🔧 How to Use Enhanced Component**

The enhanced `JDExtractionViewer` now supports action callbacks and provides a complete workflow experience.

---

## **📋 Basic Usage**

```typescript
import { JDExtractionViewer } from './components/jobs/jd-extraction-viewer';

function JobAnalysisPage() {
  const [analysisData, setAnalysisData] = useState(null);
  
  const handleReRunAnalysis = () => {
    // Trigger new analysis
    console.log('Re-running analysis...');
    // Your analysis logic here
  };
  
  const handleEditJob = () => {
    // Navigate to job editing
    console.log('Editing job...');
    // Your navigation logic here
  };

  return (
    <div className="container mx-auto py-8">
      <JDExtractionViewer
        extraction={analysisData}
        analyzedAt={analysisData?.analyzedAt}
        promptVersion={analysisData?.promptVersion}
        jobId={analysisData?.jobId}
        onReRunAnalysis={handleReRunAnalysis}
        onEditJob={handleEditJob}
      />
    </div>
  );
}
```

---

## **🎯 Action Handlers**

### **Re-run Analysis Handler**
```typescript
const handleReRunAnalysis = async () => {
  try {
    setLoading(true);
    const newAnalysis = await analyzeJob(jobId);
    setAnalysisData(newAnalysis);
  } catch (error) {
    console.error('Analysis failed:', error);
  } finally {
    setLoading(false);
  }
};
```

### **Edit Job Handler**
```typescript
const handleEditJob = () => {
  // Navigate to job edit page
  router.push(`/jobs/${jobId}/edit`);
  
  // Or open edit modal
  setShowEditModal(true);
};
```

---

## **🔄 Integration Examples**

### **With React Router**
```typescript
import { useRouter } from 'next/router';

function JobAnalysisPage() {
  const router = useRouter();
  
  const handleEditJob = () => {
    router.push(`/jobs/${jobId}/edit`);
  };
  
  return (
    <JDExtractionViewer
      extraction={analysisData}
      onEditJob={handleEditJob}
      onReRunAnalysis={handleReRunAnalysis}
    />
  );
}
```

### **With State Management**
```typescript
import { useJobStore } from './stores/jobStore';

function JobAnalysisPage() {
  const { currentJob, reanalyzeJob, updateJob } = useJobStore();
  
  return (
    <JDExtractionViewer
      extraction={currentJob.analysis}
      analyzedAt={currentJob.analyzedAt}
      promptVersion={currentJob.promptVersion}
      jobId={currentJob.id}
      onReRunAnalysis={() => reanalyzeJob(currentJob.id)}
      onEditJob={() => updateJob(currentJob.id)}
    />
  );
}
```

---

## **🎨 Styling Integration**

The component uses Tailwind CSS classes and integrates seamlessly with existing design system:

```typescript
// Custom styling if needed
<div className="custom-analysis-container">
  <JDExtractionViewer
    extraction={analysisData}
    className="custom-viewer" // Custom class if needed
    onReRunAnalysis={handleReRunAnalysis}
    onEditJob={handleEditJob}
  />
</div>
```

---

## **📱 Responsive Design**

The component is fully responsive:

- **Desktop:** Action buttons in horizontal layout
- **Mobile:** Action buttons wrap to vertical layout
- **Tablet:** Adaptive spacing and sizing

---

## **🔍 What Each Action Does**

### **Re-run Analysis**
- Triggers new JD analysis
- Shows loading state during processing
- Updates analysis data when complete
- Fallback: Page reload if no handler

### **Edit Job**
- Opens job editing interface
- Allows modification of job details
- Can navigate to edit page or open modal
- Fallback: Navigate to `/jobs` if no handler

### **Copy Analysis**
- Copies formatted analysis summary to clipboard
- Includes all key sections: role, skills, responsibilities, quality analysis
- Shows visual feedback when copied
- No handler required (built-in functionality)

### **Generate Interview Kit**
- Currently disabled with explanation
- Shows tooltip: "Interview Kit generation will be enabled next."
- Ready for future backend integration
- Click shows alert with future availability message

---

## **✅ Best Practices**

### **1. Always Provide Handlers**
```typescript
// Good - provides all handlers
<JDExtractionViewer
  extraction={data}
  onReRunAnalysis={handleReRun}
  onEditJob={handleEdit}
/>

// Acceptable - uses fallbacks
<JDExtractionViewer
  extraction={data}
  // Will use page reload and navigation fallbacks
/>
```

### **2. Handle Loading States**
```typescript
const [isAnalyzing, setIsAnalyzing] = useState(false);

const handleReRunAnalysis = async () => {
  setIsAnalyzing(true);
  try {
    await reanalyzeJob();
  } finally {
    setIsAnalyzing(false);
  }
};

// Show loading spinner during analysis
{isAnalyzing && <LoadingSpinner />}
```

### **3. Error Handling**
```typescript
const handleReRunAnalysis = async () => {
  try {
    await reanalyzeJob();
    showSuccess('Analysis completed successfully');
  } catch (error) {
    showError('Analysis failed. Please try again.');
  }
};
```

---

## **🚀 Ready for Production**

The enhanced JDExtractionViewer is production-ready with:

- ✅ **Complete Action Set:** All required actions implemented
- ✅ **Fallback Behavior:** Graceful degradation without handlers
- ✅ **Visual Feedback:** Success states and tooltips
- ✅ **Responsive Design:** Works on all screen sizes
- ✅ **Type Safety:** Full TypeScript support
- ✅ **Accessibility:** Proper ARIA labels and keyboard navigation
- ✅ **Performance:** Optimized re-renders and state management

---

*Usage guide completed on: 2026-03-14*
