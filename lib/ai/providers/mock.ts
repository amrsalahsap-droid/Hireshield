/**
 * Mock AI Provider
 * Provides deterministic, schema-valid responses for development and testing
 */

import { 
  LLMProvider, 
  AnalyzeJDInput, 
  AnalyzeJDResult, 
  InterviewKitInput, 
  InterviewKitResult,
  CandidateSignalsInput,
  CandidateSignalsResult,
  ProviderConfig 
} from '../types';
import { createAIError, AIErrorCode } from '../errors';

export class MockProvider implements LLMProvider {
  name: string;
  private config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.name = config.name;
    this.config = config;
  }

  async analyzeJD(input: AnalyzeJDInput): Promise<AnalyzeJDResult> {
    this.checkFailureMode();
    
    // Simulate processing time
    await this.delay(500 + Math.random() * 1000);
    
    const scenario = (this.config as any).scenario || 'generic';
    const jobTitle = input.jobTitle.toLowerCase();
    const rawJD = input.rawJD.toLowerCase();
    
    // Enhanced keyword detection from both title and JD content
    const frontendKeywords = ['react', 'frontend', 'ui', 'ux', 'javascript', 'typescript', 'html', 'css', 'next.js', 'vue', 'angular'];
    const backendKeywords = ['backend', 'api', 'server', 'node', 'express', 'database', 'sql', 'postgresql', 'mongodb'];
    const salesKeywords = ['sales', 'account', 'crm', 'lead', 'revenue', 'customer', 'client'];
    const dataKeywords = ['data analyst', 'data analytics', 'data scientist', 'business intelligence', 'bi analyst', 'data warehouse'];
    
    const hasFrontendKeywords = frontendKeywords.some(keyword => jobTitle.includes(keyword) || rawJD.includes(keyword));
    const hasBackendKeywords = backendKeywords.some(keyword => jobTitle.includes(keyword) || rawJD.includes(keyword));
    const hasSalesKeywords = salesKeywords.some(keyword => jobTitle.includes(keyword) || rawJD.includes(keyword));
    const hasDataKeywords = dataKeywords.some(keyword => jobTitle.includes(keyword) || rawJD.includes(keyword));
    
    // Determine response based on keywords or explicit scenario
    // Priority: explicit scenario > specific roles > general categories > generic
    if (scenario === 'generic') {
      return this.getGenericJDResult();
    } else if (hasDataKeywords || scenario === 'data') {
      return this.getDataAnalystJDResult();
    } else if (hasFrontendKeywords || scenario === 'frontend') {
      return this.getFrontendJDResult();
    } else if (hasBackendKeywords || scenario === 'backend') {
      return this.getBackendJDResult();
    } else if (hasSalesKeywords || scenario === 'sales') {
      return this.getSalesJDResult();
    } else {
      return this.getGenericJDResult();
    }
  }

  async generateInterviewKit(input: InterviewKitInput): Promise<InterviewKitResult> {
    this.checkFailureMode();
    
    // Simulate processing time
    await this.delay(800 + Math.random() * 1200);
    
    const scenario = (this.config as any).scenario || 'generic';
    const jobTitle = input.jobTitle.toLowerCase();
    
    if (jobTitle.includes('frontend') || jobTitle.includes('ui') || scenario === 'frontend') {
      return this.getFrontendInterviewKit();
    } else if (jobTitle.includes('backend') || jobTitle.includes('api') || scenario === 'backend') {
      return this.getBackendInterviewKit();
    } else if (jobTitle.includes('sales') || scenario === 'sales') {
      return this.getSalesInterviewKit();
    } else {
      return this.getGenericInterviewKit();
    }
  }

  async generateCandidateSignals(input: CandidateSignalsInput): Promise<CandidateSignalsResult> {
    this.checkFailureMode();
    
    // Simulate processing time
    await this.delay(600 + Math.random() * 800);
    
    const scenario = (this.config as any).scenario || 'generic';
    const jobTitle = input.jobRequirements.title.toLowerCase();
    
    if (jobTitle.includes('frontend') || jobTitle.includes('ui') || scenario === 'frontend') {
      return this.getFrontendCandidateSignals(input);
    } else if (jobTitle.includes('backend') || jobTitle.includes('api') || scenario === 'backend') {
      return this.getBackendCandidateSignals(input);
    } else if (jobTitle.includes('sales') || scenario === 'sales') {
      return this.getSalesCandidateSignals(input);
    } else {
      return this.getGenericCandidateSignals(input);
    }
  }

  private checkFailureMode(): void {
    const failureMode = (this.config as any).failureMode || 'none';
    const failureRate = (this.config as any).forceFailureRate || 0;
    
    if (failureMode === 'none' || (failureRate > 0 && Math.random() > failureRate)) {
      return; // No failure
    }
    
    switch (failureMode) {
      case 'timeout':
        throw createAIError(
          AIErrorCode.TIMEOUT,
          'Mock timeout error for testing',
          { provider: this.name, retryable: true }
        );
        
      case 'invalid_output':
        throw createAIError(
          AIErrorCode.OUTPUT_INVALID,
          'Mock invalid output error for testing',
          { provider: this.name }
        );
        
      case 'rate_limit':
        throw createAIError(
          AIErrorCode.RATE_LIMITED,
          'Mock rate limit error for testing',
          { provider: this.name, retryable: true }
        );
        
      default:
        return;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // JD Analysis Results
  private getFrontendJDResult(): AnalyzeJDResult {
    return {
      roleTitle: 'Frontend Developer',
      requiredSkills: ['React', 'TypeScript', 'JavaScript', 'HTML', 'CSS', 'Git'],
      seniorityLevel: 'Senior',
      department: 'Engineering',
      estimatedSalary: {
        min: 120000,
        max: 180000,
        currency: 'USD'
      },
      experienceLevel: '5-8 years',
      keyResponsibilities: [
        'Develop and maintain responsive web applications',
        'Implement pixel-perfect UI components from Figma designs',
        'Optimize application performance and user experience',
        'Collaborate with backend team on API integration'
      ],
      qualifications: [
        'Bachelor\'s degree in Computer Science or related field',
        '5+ years of frontend development experience',
        'Strong knowledge of React, TypeScript, and modern CSS',
        'Experience with state management libraries (Redux, Zustand)'
      ],
      preferredQualifications: [
        'Experience with Next.js or similar frameworks',
        'Knowledge of state management libraries (Redux, Zustand)',
        'Familiarity with testing frameworks (Jest, React Testing Library)'
      ]
    };
  }

  private getBackendJDResult(): AnalyzeJDResult {
    return {
      roleTitle: 'Backend Developer',
      requiredSkills: ['Node.js', 'TypeScript', 'Express', 'PostgreSQL', 'Docker', 'AWS'],
      seniorityLevel: 'Senior',
      department: 'Engineering',
      estimatedSalary: {
        min: 130000,
        max: 190000,
        currency: 'USD'
      },
      experienceLevel: '5-8 years',
      keyResponsibilities: [
        'Design and develop scalable backend services and APIs',
        'Implement database schemas and optimize query performance',
        'Ensure application security and data protection',
        'Collaborate with frontend team to integrate APIs'
      ],
      qualifications: [
        'Bachelor\'s degree in Computer Science or related field',
        '5+ years of backend development experience',
        'Strong knowledge of Node.js, TypeScript, and databases',
        'Experience with cloud platforms (AWS, GCP, or Azure)'
      ],
      preferredQualifications: [
        'Experience with microservices architecture',
        'Knowledge of containerization and orchestration',
        'Familiarity with CI/CD pipelines'
      ]
    };
  }

  private getSalesJDResult(): AnalyzeJDResult {
    return {
      roleTitle: 'Sales Representative',
      requiredSkills: ['Sales', 'CRM', 'Communication', 'Negotiation', 'Lead Generation'],
      seniorityLevel: 'Mid-level',
      department: 'Sales',
      estimatedSalary: {
        min: 80000,
        max: 120000,
        currency: 'USD'
      },
      experienceLevel: '3-5 years',
      keyResponsibilities: [
        'Identify and qualify new sales opportunities',
        'Build and maintain relationships with clients',
        'Achieve and exceed sales targets',
        'Prepare and deliver sales presentations'
      ],
      qualifications: [
        'Bachelor\'s degree in Business or related field',
        '3+ years of sales experience',
        'Strong communication and negotiation skills',
        'Experience with CRM software'
      ],
      preferredQualifications: [
        'Experience in B2B sales',
        'Knowledge of industry',
        'Bilingual abilities'
      ]
    };
  }

  private getDataAnalystJDResult(): AnalyzeJDResult {
    return {
      roleTitle: 'Data Analyst',
      requiredSkills: ['SQL', 'Excel', 'Tableau', 'Power BI', 'Python', 'Statistics', 'Data Visualization'],
      seniorityLevel: 'Mid-level',
      department: 'Data',
      estimatedSalary: {
        min: 85000,
        max: 130000,
        currency: 'USD'
      },
      experienceLevel: '3-5 years',
      keyResponsibilities: [
        'Analyze complex datasets to extract actionable insights',
        'Create and maintain dashboards and reports for stakeholders',
        'Collaborate with cross-functional teams to understand data needs',
        'Ensure data quality and integrity across all analyses'
      ],
      qualifications: [
        'Bachelor\'s degree in Data Science, Statistics, or related field',
        '3+ years of data analysis experience',
        'Strong SQL skills and experience with BI tools',
        'Knowledge of statistical analysis and data visualization techniques'
      ],
      preferredQualifications: [
        'Experience with Python or R for data analysis',
        'Familiarity with data warehousing concepts',
        'Knowledge of machine learning basics'
      ]
    };
  }

  private getGenericJDResult(): AnalyzeJDResult {
    return {
      roleTitle: undefined, // Intentionally undefined to trigger low-quality state
      requiredSkills: ['Communication', 'Teamwork', 'Problem-solving', 'Time Management'],
      seniorityLevel: 'Mid-level',
      department: 'General',
      estimatedSalary: {
        min: 60000,
        max: 90000,
        currency: 'USD'
      },
      experienceLevel: '3-5 years',
      keyResponsibilities: [
        'Perform assigned job duties and responsibilities',
        'Collaborate with team members to achieve goals',
        'Maintain professional standards and conduct',
        'Report to supervisor and provide regular updates'
      ],
      qualifications: [
        'High school diploma or equivalent',
        '3+ years of relevant work experience',
        'Strong communication and interpersonal skills',
        'Ability to work independently and as part of a team'
      ],
      preferredQualifications: [
        'Bachelor\'s degree in relevant field',
        'Additional certifications or training',
        'Experience with specific industry tools'
      ]
    };
  }

  // Interview Kit Results
  private getFrontendInterviewKit(): InterviewKitResult {
    return {
      technicalQuestions: [
        {
          question: 'Explain the virtual DOM and how React uses it.',
          category: 'React Concepts',
          difficulty: 'medium',
          expectedAnswer: 'The virtual DOM is a JavaScript representation of the real DOM. React uses it to optimize rendering by calculating changes and updating only what has changed.'
        },
        {
          question: 'What are React Hooks and how do they work?',
          category: 'React Concepts',
          difficulty: 'medium',
          expectedAnswer: 'Hooks are functions that let you use state and other React features in functional components. They follow the Rules of Hooks and are called at the top level.'
        },
        {
          question: 'How would you optimize the performance of a React application?',
          category: 'Performance',
          difficulty: 'hard',
          expectedAnswer: 'Use React.memo, useMemo, useCallback, code splitting, lazy loading, and optimize re-renders.'
        }
      ],
      behavioralQuestions: [
        {
          question: 'Tell me about a time you had to learn a new technology quickly.',
          competency: 'Adaptability',
          followUp: ['What was your approach?', 'How did you ensure you learned effectively?']
        },
        {
          question: 'Describe a situation where you had conflicting requirements from different stakeholders.',
          competency: 'Conflict Resolution',
          followUp: ['How did you handle it?', 'What was the outcome?']
        }
      ],
      caseStudy: {
        title: 'Frontend Performance Optimization',
        description: 'A React application is loading slowly. Users report 5+ second load times. Analyze the potential causes and propose solutions.',
        timeLimit: 45,
        evaluationCriteria: [
          'Identification of performance bottlenecks',
          'Proposed optimization techniques',
          'Implementation approach',
          'Measurement and validation strategy'
        ]
      },
      interviewStructure: {
        totalDuration: 60,
        sections: [
          {
            name: 'Introduction',
            duration: 5,
            description: 'Company and role overview'
          },
          {
            name: 'Technical Assessment',
            duration: 30,
            description: 'Frontend development questions and coding exercise'
          },
          {
            name: 'Behavioral Questions',
            duration: 20,
            description: 'Past experience and situational questions'
          },
          {
            name: 'Candidate Questions',
            duration: 5,
            description: 'Candidate asks questions about the role'
          }
        ]
      }
    };
  }

  private getBackendInterviewKit(): InterviewKitResult {
    return {
      technicalQuestions: [
        {
          question: 'Explain RESTful API design principles.',
          category: 'API Design',
          difficulty: 'medium',
          expectedAnswer: 'REST uses HTTP methods, stateless communication, resource-based URLs, and standard status codes for scalable API design.'
        },
        {
          question: 'How would you handle database transactions in Node.js?',
          category: 'Database',
          difficulty: 'medium',
          expectedAnswer: 'Use transaction blocks, handle rollbacks on errors, ensure ACID properties, and use connection pooling.'
        },
        {
          question: 'Describe microservices architecture and when to use it.',
          category: 'Architecture',
          difficulty: 'hard',
          expectedAnswer: 'Microservices break applications into small, independent services. Use when you need scalability, independent deployment, and technology diversity.'
        }
      ],
      behavioralQuestions: [
        {
          question: 'Tell me about a time you had to scale a system.',
          competency: 'Technical Leadership',
          followUp: ['What challenges did you face?', 'How did you approach the solution?']
        },
        {
          question: 'Describe a situation where you had to debug a critical production issue.',
          competency: 'Problem Solving',
          followUp: ['What was your debugging process?', 'How did you prevent similar issues?']
        }
      ],
      caseStudy: {
        title: 'API Scalability Challenge',
        description: 'An e-commerce API is experiencing slow response times during peak traffic. Design a solution to improve performance.',
        timeLimit: 60,
        evaluationCriteria: [
          'Performance bottleneck identification',
          'Scalability solution design',
          'Implementation strategy',
          'Monitoring and maintenance approach'
        ]
      },
      interviewStructure: {
        totalDuration: 75,
        sections: [
          {
            name: 'Introduction',
            duration: 5,
            description: 'Company and role overview'
          },
          {
            name: 'System Design',
            duration: 30,
            description: 'Architecture and scalability questions'
          },
          {
            name: 'Coding Exercise',
            duration: 25,
            description: 'Backend development practical exercise'
          },
          {
            name: 'Behavioral Questions',
            duration: 15,
            description: 'Experience and situational questions'
          }
        ]
      }
    };
  }

  private getSalesInterviewKit(): InterviewKitResult {
    return {
      technicalQuestions: [
        {
          question: 'How do you qualify leads effectively?',
          category: 'Sales Process',
          difficulty: 'medium',
          expectedAnswer: 'Use BANT criteria, assess budget, authority, need, and timeline, and prioritize based on fit and readiness.'
        },
        {
          question: 'Describe your approach to handling objections.',
          category: 'Sales Skills',
          difficulty: 'medium',
          expectedAnswer: 'Listen actively, acknowledge concerns, provide solutions, and use objection-handling frameworks like LAER.'
        }
      ],
      behavioralQuestions: [
        {
          question: 'Tell me about your most challenging sale.',
          competency: 'Resilience',
          followUp: ['What made it challenging?', 'How did you overcome the challenges?']
        },
        {
          question: 'How do you build relationships with clients?',
          competency: 'Relationship Building',
          followUp: ['What strategies do you use?', 'How do you maintain long-term relationships?']
        }
      ],
      interviewStructure: {
        totalDuration: 45,
        sections: [
          {
            name: 'Introduction',
            duration: 5,
            description: 'Company and role overview'
          },
          {
            name: 'Sales Experience',
            duration: 20,
            description: 'Past performance and sales approach'
          },
          {
            name: 'Role-play Exercise',
            duration: 15,
            description: 'Simulated sales scenario'
          },
          {
            name: 'Candidate Questions',
            duration: 5,
            description: 'Candidate asks questions about the role'
          }
        ]
      }
    };
  }

  private getGenericInterviewKit(): InterviewKitResult {
    return {
      technicalQuestions: [
        {
          question: 'What skills and experiences make you a good fit for this role?',
          category: 'General',
          difficulty: 'medium'
        }
      ],
      behavioralQuestions: [
        {
          question: 'Tell me about your professional background.',
          competency: 'Experience',
          followUp: ['What are your key achievements?', 'What motivates you?']
        }
      ],
      interviewStructure: {
        totalDuration: 30,
        sections: [
          {
            name: 'Introduction',
            duration: 5,
            description: 'Company and role overview'
          },
          {
            name: 'Experience Discussion',
            duration: 20,
            description: 'Background and qualifications'
          },
          {
            name: 'Candidate Questions',
            duration: 5,
            description: 'Candidate asks questions about the role'
          }
        ]
      }
    };
  }

  // Candidate Signals Results
  private getFrontendCandidateSignals(input: CandidateSignalsInput): CandidateSignalsResult {
    return {
      overallScore: 85,
      skillMatch: {
        score: 90,
        matchedSkills: ['React', 'TypeScript', 'JavaScript'],
        missingSkills: ['GraphQL'],
        additionalSkills: ['Vue.js', 'Angular']
      },
      experienceMatch: {
        score: 80,
        relevantYears: 4,
        levelMatch: true
      },
      educationMatch: {
        score: 85,
        relevantDegree: true
      },
      riskSignals: [
        {
          type: 'medium',
          category: 'skills',
          description: 'Missing GraphQL experience which is preferred'
        }
      ],
      recommendation: 'yes',
      reasoning: 'Strong frontend skills with relevant React and TypeScript experience. Good educational background. Some gaps in modern frontend technologies but overall strong candidate.'
    };
  }

  private getBackendCandidateSignals(input: CandidateSignalsInput): CandidateSignalsResult {
    return {
      overallScore: 78,
      skillMatch: {
        score: 85,
        matchedSkills: ['Node.js', 'TypeScript', 'PostgreSQL'],
        missingSkills: ['Kubernetes'],
        additionalSkills: ['MongoDB', 'Redis']
      },
      experienceMatch: {
        score: 75,
        relevantYears: 3,
        levelMatch: false
      },
      educationMatch: {
        score: 80,
        relevantDegree: true
      },
      riskSignals: [
        {
          type: 'medium',
          category: 'experience',
          description: 'Less experience than required for senior role'
        },
        {
          type: 'low',
          category: 'skills',
          description: 'Missing container orchestration experience'
        }
      ],
      recommendation: 'maybe',
      reasoning: 'Good technical skills and relevant experience. May need more experience for senior-level responsibilities. Consider for mid-level position.'
    };
  }

  private getSalesCandidateSignals(input: CandidateSignalsInput): CandidateSignalsResult {
    return {
      overallScore: 82,
      skillMatch: {
        score: 88,
        matchedSkills: ['Sales', 'CRM', 'Communication'],
        missingSkills: [],
        additionalSkills: ['Marketing', 'Customer Success']
      },
      experienceMatch: {
        score: 85,
        relevantYears: 4,
        levelMatch: true
      },
      educationMatch: {
        score: 75,
        relevantDegree: false
      },
      riskSignals: [
        {
          type: 'low',
          category: 'education',
          description: 'Degree not directly related to sales field'
        }
      ],
      recommendation: 'yes',
      reasoning: 'Strong sales background with relevant experience and skills. Good communication abilities. Education field not directly related but practical experience compensates.'
    };
  }

  private getGenericCandidateSignals(input: CandidateSignalsInput): CandidateSignalsResult {
    return {
      overallScore: 70,
      skillMatch: {
        score: 75,
        matchedSkills: ['Communication', 'Teamwork'],
        missingSkills: ['Technical skills'],
        additionalSkills: ['Leadership']
      },
      experienceMatch: {
        score: 70,
        relevantYears: 3,
        levelMatch: true
      },
      educationMatch: {
        score: 65,
        relevantDegree: false
      },
      riskSignals: [
        {
          type: 'medium',
          category: 'skills',
          description: 'Limited technical skills for the role'
        }
      ],
      recommendation: 'maybe',
      reasoning: 'Has good soft skills and some relevant experience. May need additional training or mentorship for technical aspects of the role.'
    };
  }
}
