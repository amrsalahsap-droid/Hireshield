"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ErrorState, EmptyState, LoadingState } from "@/components/ui/ErrorState";
import { Button } from "@/components/ui/button";
import { GenerateJDButton } from "@/components/app/generate-jd-button";
import { SkillsTagInput } from "@/components/app/skills-tag-input";

interface Job {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  rawJD: string;
  jdExtractionJson: any;
  jdAnalyzedAt: string | null;
  jdPromptVersion: string | null;
  jdAnalysisStatus: 'NOT_STARTED' | 'RUNNING' | 'DONE' | 'FAILED';
  jdLastError: string | null;
  interviewKitJson: any;
  interviewKitGeneratedAt: string | null;
  interviewKitPromptVersion: string | null;
  interviewKitStatus: 'NOT_STARTED' | 'RUNNING' | 'DONE' | 'FAILED';
  interviewKitLastError: string | null;
}

interface JobTemplate {
  id: string;
  title: string;
  department: string;
  location: string;
  employmentType: string;
  seniorityLevel: string;
  rawJD: string;
  skills: Array<{
    id: string;
    name: string;
    experienceLevel: "beginner" | "intermediate" | "advanced" | "expert";
    requirementType: "required" | "optional";
  }>;
}

const jobTemplates: JobTemplate[] = [
  {
    id: "software-engineer",
    title: "Software Engineer",
    department: "engineering",
    location: "Remote",
    employmentType: "full-time",
    seniorityLevel: "mid-level",
    rawJD: "We are looking for a talented Software Engineer to join our growing engineering team. You will be responsible for designing, developing, and maintaining high-quality software solutions. The ideal candidate has strong programming skills, experience with modern web technologies, and a passion for building scalable applications. You will work closely with cross-functional teams to deliver innovative features that delight our users. This role offers opportunities for professional growth and the chance to make a significant impact on our products.",
    skills: [
      { id: "1", name: "JavaScript", experienceLevel: "advanced", requirementType: "required" },
      { id: "2", name: "React", experienceLevel: "advanced", requirementType: "required" },
      { id: "3", name: "TypeScript", experienceLevel: "intermediate", requirementType: "required" },
      { id: "4", name: "Node.js", experienceLevel: "intermediate", requirementType: "required" },
      { id: "5", name: "HTML/CSS", experienceLevel: "advanced", requirementType: "required" },
      { id: "6", name: "Git", experienceLevel: "advanced", requirementType: "required" },
      { id: "7", name: "REST APIs", experienceLevel: "intermediate", requirementType: "required" },
      { id: "8", name: "SQL", experienceLevel: "intermediate", requirementType: "optional" },
      { id: "9", name: "AWS", experienceLevel: "beginner", requirementType: "optional" },
      { id: "10", name: "Docker", experienceLevel: "beginner", requirementType: "optional" }
    ]
  },
  {
    id: "product-manager",
    title: "Product Manager",
    department: "product",
    location: "Hybrid",
    employmentType: "full-time",
    seniorityLevel: "mid-level",
    rawJD: "We are seeking an experienced Product Manager to drive the development of our innovative products. You will be responsible for defining product vision, gathering requirements, and working with engineering teams to deliver exceptional user experiences. The ideal candidate has a strong background in product management, excellent communication skills, and a data-driven approach to decision-making. You will collaborate with stakeholders across the organization to ensure our products meet market needs and business objectives. This role offers the opportunity to shape the future of our product roadmap.",
    skills: [
      { id: "11", name: "Product Strategy", experienceLevel: "advanced", requirementType: "required" },
      { id: "12", name: "User Research", experienceLevel: "advanced", requirementType: "required" },
      { id: "13", name: "Data Analysis", experienceLevel: "intermediate", requirementType: "required" },
      { id: "14", name: "Agile/Scrum", experienceLevel: "advanced", requirementType: "required" },
      { id: "15", name: "Stakeholder Management", experienceLevel: "advanced", requirementType: "required" },
      { id: "16", name: "Product Roadmapping", experienceLevel: "intermediate", requirementType: "required" },
      { id: "17", name: "A/B Testing", experienceLevel: "intermediate", requirementType: "optional" },
      { id: "18", name: "SQL", experienceLevel: "beginner", requirementType: "optional" },
      { id: "19", name: "Analytics Tools", experienceLevel: "intermediate", requirementType: "optional" },
      { id: "20", name: "Technical Writing", experienceLevel: "intermediate", requirementType: "optional" }
    ]
  },
  {
    id: "data-analyst",
    title: "Data Analyst",
    department: "engineering",
    location: "Remote",
    employmentType: "full-time",
    seniorityLevel: "mid-level",
    rawJD: "We are looking for a detail-oriented Data Analyst to help us make data-driven decisions and uncover valuable insights from our data. You will be responsible for collecting, analyzing, and interpreting complex datasets to support business strategy and operations. The ideal candidate has strong analytical skills, experience with data visualization tools, and the ability to communicate findings effectively to both technical and non-technical audiences. You will work with various teams to identify trends, create reports, and develop dashboards that drive business growth.",
    skills: [
      { id: "21", name: "SQL", experienceLevel: "advanced", requirementType: "required" },
      { id: "22", name: "Excel", experienceLevel: "advanced", requirementType: "required" },
      { id: "23", name: "Data Visualization", experienceLevel: "advanced", requirementType: "required" },
      { id: "24", name: "Python", experienceLevel: "intermediate", requirementType: "required" },
      { id: "25", name: "Statistics", experienceLevel: "intermediate", requirementType: "required" },
      { id: "26", name: "Tableau", experienceLevel: "intermediate", requirementType: "required" },
      { id: "27", name: "Power BI", experienceLevel: "intermediate", requirementType: "optional" },
      { id: "28", name: "R", experienceLevel: "beginner", requirementType: "optional" },
      { id: "29", name: "Machine Learning", experienceLevel: "beginner", requirementType: "optional" },
      { id: "30", name: "Business Intelligence", experienceLevel: "intermediate", requirementType: "optional" }
    ]
  }
];

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdJob, setCreatedJob] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    rawJD: "",
    department: "",
    location: "",
    employmentType: "",
    seniorityLevel: "",
    hiringManager: "",
    numberOfOpenings: 1,
    status: "DRAFT",
    skills: [] as Array<{
      id: string;
      name: string;
      experienceLevel: "beginner" | "intermediate" | "advanced" | "expert";
      requirementType: "required" | "optional";
    }>
  });
  const [errors, setErrors] = useState({
    title: "",
    rawJD: "",
    department: "",
    location: "",
    employmentType: "",
    seniorityLevel: "",
    hiringManager: "",
    numberOfOpenings: "",
    status: "",
    skills: ""
  });
  const [isCreating, setIsCreating] = useState(false);

  // Fetch jobs from API
  const fetchJobs = async () => {
    try {
      setError(null);
      const response = await fetch("/api/jobs", {
        headers: {
          "x-org-id": "cmm87bloy0000v9nvvzyt6aqn" // Demo org ID
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs || []);
      } else {
        throw new Error("Failed to load jobs");
      }
    } catch (error) {
      console.error("Error fetching jobs:", error);
      setError("Unable to load jobs. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {
      title: "",
      rawJD: "",
      department: "",
      location: "",
      employmentType: "",
      seniorityLevel: "",
      hiringManager: "",
      numberOfOpenings: "",
      status: "",
      skills: ""
    };

    if (!formData.title.trim()) {
      newErrors.title = "Job title is required";
    }

    if (!formData.rawJD.trim()) {
      newErrors.rawJD = "Job description is required";
    } else if (formData.rawJD.trim().length < 50) {
      newErrors.rawJD = "Job description must be at least 50 characters";
    } else if (formData.rawJD.length > 10000) {
      newErrors.rawJD = "Job description must be less than 10,000 characters";
    }

    // Validate numberOfOpenings
    if (formData.numberOfOpenings < 1 || formData.numberOfOpenings > 100) {
      newErrors.numberOfOpenings = "Number of openings must be between 1 and 100";
    }

    setErrors(newErrors);
    return !newErrors.title && !newErrors.rawJD && !newErrors.numberOfOpenings;
  };

  // Apply template function
  const applyTemplate = (templateId: string) => {
    const template = jobTemplates.find(t => t.id === templateId);
    if (!template) return;

    setFormData({
      title: template.title,
      rawJD: template.rawJD,
      department: template.department,
      location: template.location,
      employmentType: template.employmentType,
      seniorityLevel: template.seniorityLevel,
      hiringManager: "",
      numberOfOpenings: 1,
      status: "DRAFT",
      skills: template.skills
    });

    // Clear any existing errors
    setErrors({
      title: "",
      rawJD: "",
      department: "",
      location: "",
      employmentType: "",
      seniorityLevel: "",
      hiringManager: "",
      numberOfOpenings: "",
      status: "",
      skills: ""
    });
  };

  // Handle job creation
  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsCreating(true);
    
    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-org-id": "cmm87bloy0000v9nvvzyt6aqn" // Demo org ID
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          rawJD: formData.rawJD.trim(),
          department: formData.department.trim(),
          location: formData.location.trim(),
          employmentType: formData.employmentType,
          seniorityLevel: formData.seniorityLevel,
          hiringManager: formData.hiringManager.trim(),
          numberOfOpenings: formData.numberOfOpenings,
          status: formData.status,
          skills: formData.skills
        })
      });

      if (response.ok) {
        const jobData = await response.json();
        
        // Store the created job data and show success modal
        setCreatedJob(jobData);
        setShowSuccessModal(true);
        
        // Reset form and close create modal
        setFormData({ 
          title: "", 
          rawJD: "",
          department: "",
          location: "",
          employmentType: "",
          seniorityLevel: "",
          hiringManager: "",
          numberOfOpenings: 1,
          status: "DRAFT",
          skills: []
        });
        setShowCreateModal(false);
        setErrors({ 
          title: "", 
          rawJD: "",
          department: "",
          location: "",
          employmentType: "",
          seniorityLevel: "",
          hiringManager: "",
          numberOfOpenings: "",
          status: "",
          skills: ""
        });
        
        // Refresh jobs list
        await fetchJobs();
      } else {
        const error = await response.json();
        console.error("Error creating job:", error);
        
        // Handle validation errors from server
        if (error.error && response.status === 400) {
          // Parse error message to set appropriate field errors
          if (error.error.includes("title")) {
            setErrors(prev => ({ ...prev, title: error.error }));
          } else if (error.error.includes("description") || error.error.includes("characters")) {
            setErrors(prev => ({ ...prev, rawJD: error.error }));
          } else {
            // Generic error
            setErrors({ 
              title: error.error, 
              rawJD: "",
              department: "",
              location: "",
              employmentType: "",
              seniorityLevel: "",
              hiringManager: "",
              numberOfOpenings: "",
              status: "",
              skills: ""
            });
          }
        } else {
          throw new Error("Failed to create job");
        }
      }
    } catch (error) {
      console.error("Error creating job:", error);
      setError("Unable to create job. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  // Organize jobs by status
  const activeJobs = jobs.filter(job => job.status === "ACTIVE");
  const draftJobs = jobs.filter(job => job.status === "DRAFT");
  const archivedJobs = jobs.filter(job => job.status === "ARCHIVED");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE": return "bg-safe/10 text-safe border-safe/20";
      case "DRAFT": return "bg-warning/10 text-warning border-warning/20";
      case "ARCHIVED": return "bg-muted/10 text-muted-foreground border-muted/20";
      default: return "bg-muted/10 text-muted-foreground border-muted/20";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ACTIVE": return "✓";
      case "DRAFT": return "○";
      case "ARCHIVED": return "⊗";
      default: return "○";
    }
  };

  // Jobs Section Component
  const JobsSection = ({ title, jobs, icon, emptyMessage, status }: { 
    title: string; 
    jobs: Job[]; 
    icon: string; 
    emptyMessage: string; 
    status: string;
  }) => (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">{icon}</span>
        <h2 className="text-xl font-semibold text-foreground font-display">{title}</h2>
        <span className="text-sm text-muted-foreground font-body">({jobs.length})</span>
      </div>
      
      {jobs.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <div className="text-4xl mb-3 opacity-50">{icon}</div>
          <p className="text-muted-foreground font-body">{emptyMessage}</p>
        </div>
      ) : (
        <div className="bg-card shadow-card border border-border rounded-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider font-body">
                    Job Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider font-body">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider font-body">
                    JD Analysis
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider font-body">
                    Interview Kit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider font-body">
                    Created
                  </th>
                  <th className="relative px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider font-body">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {jobs.map((job) => (
                  <tr 
                    key={job.id} 
                    className="hover:bg-muted/50 transition-colors cursor-pointer group"
                    onClick={() => window.location.href = `/app/jobs/${job.id}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-card text-foreground font-body group-hover:text-primary transition-colors">{job.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full font-body border ${getStatusColor(job.status)}`}>
                        <span className="text-xs">{getStatusIcon(job.status)}</span>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-body-size text-muted-foreground font-body">
                      {job.jdAnalyzedAt ? new Date(job.jdAnalyzedAt).toLocaleDateString() : "Not analyzed"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-body-size text-muted-foreground font-body">
                      {job.interviewKitGeneratedAt ? new Date(job.interviewKitGeneratedAt).toLocaleDateString() : "Not generated"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-body-size text-muted-foreground font-body">
                      {new Date(job.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-card font-medium">
                      <Link 
                        href={`/app/jobs/${job.id}`} 
                        className="text-primary hover:text-primary/90 font-body group-hover:underline transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  // Error state
  if (error) {
    return (
      <ErrorState
        title="Unable to Load Jobs"
        message={error}
        onRetry={fetchJobs}
        onBack={() => window.location.href = "/app"}
        backText="Back to Dashboard"
      />
    );
  }

  // Loading state
  if (loading) {
    return <LoadingState message="Loading jobs..." />;
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-3xl">💼</span>
            <div>
              <h1 className="text-2xl font-bold text-foreground font-display">Jobs</h1>
              <p className="text-muted-foreground font-body">
                Manage your job postings and track applicant progress.
              </p>
            </div>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            Create New Job
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {jobs.length === 0 && (
        <EmptyState
          title="No jobs yet"
          message="Get started by creating your first job posting."
          action={{
            text: "Create Your First Job",
            onClick: () => setShowCreateModal(true)
          }}
          icon="💼"
        />
      )}

      {/* Jobs Sections */}
      {jobs.length > 0 && (
        <>
          <JobsSection 
            title="Active Jobs" 
            jobs={activeJobs} 
            icon="🟢"
            emptyMessage="No active jobs. Publish a draft job to make it active."
            status="ACTIVE"
          />
          
          <JobsSection 
            title="Draft Jobs" 
            jobs={draftJobs} 
            icon="📝"
            emptyMessage="No draft jobs. Create a new job to get started."
            status="DRAFT"
          />
          
          <JobsSection 
            title="Archived Jobs" 
            jobs={archivedJobs} 
            icon="📦"
            emptyMessage="No archived jobs. Archived jobs will appear here."
            status="ARCHIVED"
          />
        </>
      )}

      {/* Create Job Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-foreground/50 overflow-y-auto h-full w-full z-50 flex items-start justify-center pt-20 pb-8">
          <div className="relative p-6 w-full max-w-2xl shadow-card rounded-xl border border-border bg-card">
            <h3 className="text-lg font-medium text-foreground font-display mb-6">
              Create New Job
            </h3>
            <form onSubmit={handleCreateJob}>
              {/* Basic Info Section */}
              <div className="mb-8">
                <h4 className="text-base font-medium text-foreground font-display mb-4 pb-2 border-b border-border">
                  📋 Basic Info
                </h4>
                <div className="space-y-4">
                  {/* Template Selector */}
                  <div>
                    <label className="block text-sm font-medium text-foreground font-body mb-2">
                      Start from Template (Optional)
                    </label>
                    <select
                      value=""
                      onChange={(e) => {
                        const templateId = e.target.value;
                        if (templateId) {
                          applyTemplate(templateId);
                          // Reset the select after applying template
                          e.target.value = "";
                        }
                      }}
                      className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground font-body"
                    >
                      <option value="">Select a template to get started...</option>
                      {jobTemplates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.title} - {template.department}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Choose a template to auto-fill job description and skills for common roles.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground font-body mb-2">
                      Job Title <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground font-body"
                      placeholder="e.g. Senior Frontend Developer"
                    />
                    {errors.title && (
                      <p className="mt-1 text-sm text-destructive">{errors.title}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground font-body mb-2">
                        Department
                      </label>
                      <select
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground font-body"
                      >
                        <option value="">Select department</option>
                        <option value="engineering">Engineering</option>
                        <option value="design">Design</option>
                        <option value="marketing">Marketing</option>
                        <option value="sales">Sales</option>
                        <option value="product">Product</option>
                        <option value="hr">Human Resources</option>
                        <option value="finance">Finance</option>
                        <option value="operations">Operations</option>
                      </select>
                      {errors.department && (
                        <p className="mt-1 text-sm text-destructive">{errors.department}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground font-body mb-2">
                        Location
                      </label>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground font-body"
                        placeholder="e.g. New York, NY"
                      />
                      {errors.location && (
                        <p className="mt-1 text-sm text-destructive">{errors.location}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground font-body mb-2">
                        Employment Type
                      </label>
                      <select
                        value={formData.employmentType}
                        onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                        className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground font-body"
                      >
                        <option value="">Select type</option>
                        <option value="full-time">Full-time</option>
                        <option value="part-time">Part-time</option>
                        <option value="contract">Contract</option>
                        <option value="internship">Internship</option>
                        <option value="freelance">Freelance</option>
                      </select>
                      {errors.employmentType && (
                        <p className="mt-1 text-sm text-destructive">{errors.employmentType}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground font-body mb-2">
                        Seniority Level
                      </label>
                      <select
                        value={formData.seniorityLevel}
                        onChange={(e) => setFormData({ ...formData, seniorityLevel: e.target.value })}
                        className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground font-body"
                      >
                        <option value="">Select level</option>
                        <option value="intern">Intern</option>
                        <option value="junior">Junior</option>
                        <option value="mid-level">Mid-level</option>
                        <option value="senior">Senior</option>
                        <option value="lead">Lead</option>
                        <option value="manager">Manager</option>
                        <option value="director">Director</option>
                        <option value="executive">Executive</option>
                      </select>
                      {errors.seniorityLevel && (
                        <p className="mt-1 text-sm text-destructive">{errors.seniorityLevel}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Job Description Section */}
              <div className="mb-8">
                <h4 className="text-base font-medium text-foreground font-display mb-4 pb-2 border-b border-border">
                  📝 Job Description
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground font-body mb-2">
                      Job Description <span className="text-destructive">*</span>
                    </label>
                    <textarea
                      value={formData.rawJD}
                      onChange={(e) => setFormData({ ...formData, rawJD: e.target.value })}
                      className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground font-body"
                      rows={6}
                      placeholder="Paste the complete job description here (minimum 50 characters)..."
                    />
                    <div className="mt-1 flex justify-between flex-wrap gap-1">
                      {errors.rawJD && (
                        <p className="text-sm text-destructive">{errors.rawJD}</p>
                      )}
                      <div className="flex items-center space-x-2">
                        {formData.rawJD.length > 0 && formData.rawJD.length < 50 && (
                          <p className="text-sm text-investigate">
                            Minimum 50 characters required
                          </p>
                        )}
                        {formData.rawJD.length >= 8000 && formData.rawJD.length < 10000 && (
                          <p className="text-sm text-investigate">
                            Approaching limit
                          </p>
                        )}
                        {formData.rawJD.length >= 10000 && (
                          <p className="text-sm text-destructive">
                            Limit exceeded
                          </p>
                        )}
                        <p className={`text-sm font-body ${
                          formData.rawJD.length > 10000 ? "text-destructive" :
                          formData.rawJD.length >= 8000 ? "text-investigate" :
                          formData.rawJD.length > 0 && formData.rawJD.length < 50 ? "text-investigate" :
                          "text-muted-foreground"
                        }`}>
                          {formData.rawJD.length.toLocaleString()} / 10,000 characters (min. 50)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Generate Job Description Button */}
                  <GenerateJDButton
                    jobTitle={formData.title}
                    seniority={formData.seniorityLevel}
                    department={formData.department}
                    onGenerated={(description) => setFormData({ ...formData, rawJD: description })}
                  />
                </div>
              </div>

              {/* Required Skills Section */}
              <div className="mb-8">
                <h4 className="text-base font-medium text-foreground font-display mb-4 pb-2 border-b border-border">
                  🎯 Required Skills
                </h4>
                <div className="space-y-4">
                  <SkillsTagInput
                    skills={formData.skills}
                    onSkillsChange={(skills) => setFormData({ ...formData, skills })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Add skills to help candidates understand the requirements. This field is optional.
                  </p>
                </div>
              </div>

              {/* Job Settings Section */}
              <div className="mb-8">
                <h4 className="text-base font-medium text-foreground font-display mb-4 pb-2 border-b border-border">
                  ⚙️ Job Settings
                </h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground font-body mb-2">
                        Hiring Manager
                      </label>
                      <input
                        type="text"
                        value={formData.hiringManager}
                        onChange={(e) => setFormData({ ...formData, hiringManager: e.target.value })}
                        className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground font-body"
                        placeholder="e.g. John Smith"
                      />
                      {errors.hiringManager && (
                        <p className="mt-1 text-sm text-destructive">{errors.hiringManager}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground font-body mb-2">
                        Number of Openings
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={formData.numberOfOpenings}
                        onChange={(e) => setFormData({ ...formData, numberOfOpenings: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground font-body"
                        placeholder="1"
                      />
                      {errors.numberOfOpenings && (
                        <p className="mt-1 text-sm text-destructive">{errors.numberOfOpenings}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground font-body mb-2">
                      Job Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground font-body"
                    >
                      <option value="DRAFT">Draft - Not visible to candidates</option>
                      <option value="ACTIVE">Active - Accepting candidates</option>
                      <option value="ARCHIVED">Archived - No longer accepting candidates</option>
                    </select>
                    {errors.status && (
                      <p className="mt-1 text-sm text-destructive">{errors.status}</p>
                    )}
                  </div>

                  {/* Job Visibility Info */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <div className="text-blue-400 text-lg">ℹ️</div>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800">Job Visibility Settings</h3>
                        <div className="mt-2 text-sm text-blue-700">
                          <p><strong>Draft:</strong> Job is saved but not visible to candidates. Perfect for preparation.</p>
                          <p><strong>Active:</strong> Job is published and accepting applications from candidates.</p>
                          <p><strong>Archived:</strong> Job is no longer accepting candidates but kept for records.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({ 
                      title: "", 
                      rawJD: "",
                      department: "",
                      location: "",
                      employmentType: "",
                      seniorityLevel: "",
                      hiringManager: "",
                      numberOfOpenings: 1,
                      status: "DRAFT",
                      skills: []
                    });
                    setErrors({ 
                      title: "", 
                      rawJD: "",
                      department: "",
                      location: "",
                      employmentType: "",
                      seniorityLevel: "",
                      hiringManager: "",
                      numberOfOpenings: "",
                      status: "",
                      skills: ""
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? "Creating..." : "Create Job"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Job Creation Success Modal */}
      {showSuccessModal && createdJob && (
        <div className="fixed inset-0 bg-foreground/50 overflow-y-auto h-full w-full z-50 flex items-start justify-center pt-20 pb-8">
          <div className="relative p-6 w-full max-w-md shadow-card rounded-xl border border-border bg-card">
            <div className="text-center">
              {/* Success Icon */}
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              {/* Success Message */}
              <h3 className="text-lg font-medium text-foreground font-display mb-2">
                Job Created Successfully!
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                <strong>{createdJob.title}</strong> has been created and is ready for use.
              </p>
              
              {/* Job Details */}
              <div className="bg-muted/50 rounded-lg p-4 mb-6 text-left">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      createdJob.status === 'ACTIVE' ? 'bg-safe/10 text-safe' :
                      createdJob.status === 'DRAFT' ? 'bg-muted/10 text-muted-foreground' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {createdJob.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Department:</span>
                    <span>{createdJob.department || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Location:</span>
                    <span>{createdJob.location || 'Not specified'}</span>
                  </div>
                </div>
              </div>
              
              {/* Redirect Options */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground font-display mb-3">
                  What would you like to do next?
                </h4>
                
                <div className="space-y-2">
                  <Link
                    href={`/app/jobs/${createdJob.id}`}
                    className="block w-full text-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors font-medium text-sm"
                    onClick={() => setShowSuccessModal(false)}
                  >
                    👁️ View Job Details
                  </Link>
                  
                  <Link
                    href="/app/candidates"
                    className="block w-full text-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium text-sm"
                    onClick={() => setShowSuccessModal(false)}
                  >
                    👤 Add Candidates
                  </Link>
                  
                  <button
                    onClick={() => {
                      // Navigate to job detail page and trigger JD analysis
                      setShowSuccessModal(false);
                      // We'll use window.location to navigate with a parameter to trigger analysis
                      window.location.href = `/app/jobs/${createdJob.id}?analyze=true`;
                    }}
                    className="block w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm"
                  >
                    🔍 Run JD Analysis
                  </button>
                </div>
                
                {/* Close option */}
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="block w-full px-4 py-2 border border-border text-muted-foreground rounded-md hover:bg-muted transition-colors font-medium text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
