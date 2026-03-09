import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";

interface GenerateJDButtonProps {
  jobTitle: string;
  seniority: string;
  department: string;
  onGenerated: (description: string) => void;
  className?: string;
}

export function GenerateJDButton({ 
  jobTitle, 
  seniority, 
  department, 
  onGenerated, 
  className = "" 
}: GenerateJDButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!jobTitle.trim()) {
      setError("Please enter a job title first");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Simulate AI generation with a template-based approach
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call

      const generatedDescription = generateJobDescription(jobTitle, seniority, department);
      onGenerated(generatedDescription);
    } catch (err) {
      setError("Failed to generate job description. Please try again.");
      console.error("Error generating job description:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateJobDescription = (title: string, seniorityLevel: string, dept: string): string => {
    const titleLower = title.toLowerCase();
    const seniorityText = getSeniorityText(seniorityLevel);
    const deptText = getDepartmentText(dept);

    const templates = {
      engineering: `
We are seeking a ${seniorityText} ${title} to join our ${deptText} team. This role is perfect for someone who is passionate about building scalable, high-quality software solutions.

**Responsibilities:**
- Design, develop, and maintain robust software applications
- Collaborate with cross-functional teams to define and implement features
- Write clean, maintainable code following best practices
- Participate in code reviews and contribute to technical discussions
- Troubleshoot and debug complex issues
- Stay up-to-date with emerging technologies and industry trends

**Requirements:**
- ${getExperienceRequirement(seniorityLevel)} in software development
- Strong proficiency in relevant programming languages and frameworks
- Experience with modern development tools and practices
- Excellent problem-solving and analytical skills
- Strong communication and teamwork abilities
- Bachelor's degree in Computer Science or related field (or equivalent experience)

**What We Offer:**
- Competitive salary and comprehensive benefits package
- Flexible work arrangements and remote work options
- Professional development opportunities and career growth
- Collaborative and inclusive work environment
- Cutting-edge technology stack and tools

**About the Team:**
Our ${deptText} team is dedicated to building innovative solutions that drive our business forward. We value creativity, collaboration, and continuous learning. Join us to make a meaningful impact while growing your career.

If you're passionate about ${titleLower} and want to work with a talented team, we'd love to hear from you!
      `,
      design: `
We are looking for a ${seniorityText} ${title} to join our creative ${deptText} team. This role offers an exciting opportunity to shape user experiences and create beautiful, functional designs.

**Responsibilities:**
- Create compelling visual designs for web and mobile applications
- Develop and maintain design systems and brand guidelines
- Collaborate with product managers and developers to bring designs to life
- Conduct user research and usability testing
- Create wireframes, prototypes, and high-fidelity mockups
- Stay current with design trends and best practices

**Requirements:**
- ${getExperienceRequirement(seniorityLevel)} in ${titleLower}
- Strong portfolio demonstrating design expertise
- Proficiency in design tools (Figma, Sketch, Adobe Creative Suite)
- Understanding of user-centered design principles
- Excellent visual and communication skills
- Ability to work in a fast-paced, collaborative environment

**What We Offer:**
- Competitive compensation and benefits package
- Creative work environment with modern design tools
- Opportunities for professional growth and skill development
- Flexible work arrangements and remote work options
- Collaborative team culture that values innovation

**About the Team:**
Our ${deptText} team is passionate about creating exceptional user experiences. We believe in the power of design to transform how users interact with our products. Join us to make a lasting impact on our product's success.

If you're a creative thinker with a passion for ${titleLower}, we'd love to see your portfolio!
      `,
      marketing: `
We are seeking a ${seniorityText} ${title} to join our dynamic ${deptText} team. This role is perfect for someone who loves telling compelling stories and driving business growth through strategic marketing initiatives.

**Responsibilities:**
- Develop and execute comprehensive marketing strategies
- Create engaging content across multiple channels
- Analyze market trends and competitor activities
- Manage marketing campaigns from conception to completion
- Collaborate with sales, product, and design teams
- Measure and report on marketing performance metrics

**Requirements:**
- ${getExperienceRequirement(seniorityLevel)} in ${titleLower}
- Proven track record of successful marketing campaigns
- Strong understanding of digital marketing channels and tools
- Excellent written and verbal communication skills
- Analytical mindset with data-driven decision making
- Creative thinking and problem-solving abilities

**What We Offer:**
- Competitive salary and performance-based bonuses
- Comprehensive benefits package and wellness programs
- Professional development and training opportunities
- Flexible work arrangements and remote work options
- Dynamic work environment with growth potential

**About the Team:**
Our ${deptText} team is passionate about building brand awareness and driving customer engagement. We value creativity, innovation, and measurable results. Join us to make a significant impact on our business growth.

If you're excited about ${titleLower} and want to work with a talented marketing team, we'd love to hear from you!
      `,
      default: `
We are looking for a ${seniorityText} ${title} to join our growing team. This is an excellent opportunity to contribute to our organization's success while developing your professional skills.

**Responsibilities:**
- ${generateResponsibilities(title, seniorityLevel)}
- Collaborate with team members to achieve organizational goals
- Maintain high standards of quality and professionalism
- Contribute to process improvements and best practices
- Adapt to changing business needs and priorities

**Requirements:**
- ${getExperienceRequirement(seniorityLevel)} in ${titleLower} or related field
- Strong relevant skills and competencies
- Excellent communication and interpersonal skills
- Problem-solving abilities and attention to detail
- Ability to work independently and as part of a team
- Relevant educational background or equivalent experience

**What We Offer:**
- Competitive compensation and benefits package
- Professional development and career growth opportunities
- Supportive work environment with collaborative team culture
- Work-life balance and flexible arrangements
- Modern facilities and resources

**About Our Company:**
We are a growing organization committed to excellence and innovation. We value our employees and provide opportunities for professional growth and development. Join us to be part of a dynamic team making a meaningful impact.

If you're passionate about ${titleLower} and meet the qualifications, we encourage you to apply!
      `
    };

    const template = templates[dept as keyof typeof templates] || templates.default;
    return template.trim();
  };

  const getSeniorityText = (level: string): string => {
    const seniorityMap: Record<string, string> = {
      intern: "Junior",
      junior: "Junior",
      "mid-level": "Mid-Level",
      senior: "Senior",
      lead: "Lead",
      manager: "Manager",
      director: "Director",
      executive: "Executive"
    };
    return seniorityMap[level] || "";
  };

  const getDepartmentText = (dept: string): string => {
    const deptMap: Record<string, string> = {
      engineering: "Engineering",
      design: "Design",
      marketing: "Marketing",
      sales: "Sales",
      product: "Product",
      hr: "Human Resources",
      finance: "Finance",
      operations: "Operations"
    };
    return deptMap[dept] || "General";
  };

  const getExperienceRequirement = (level: string): string => {
    const expMap: Record<string, string> = {
      intern: "0-1 years",
      junior: "2-3 years",
      "mid-level": "4-6 years",
      senior: "7-10 years",
      lead: "8-12 years",
      manager: "5-8 years",
      director: "10+ years",
      executive: "15+ years"
    };
    return expMap[level] || "Relevant experience";
  };

  const generateResponsibilities = (title: string, seniority: string): string => {
    const titleLower = title.toLowerCase();
    const responsibilities: Record<string, string[]> = {
      "frontend developer": [
        "Develop and maintain user-facing features using modern JavaScript frameworks",
        "Ensure responsive design and cross-browser compatibility",
        "Optimize application performance and user experience"
      ],
      "backend developer": [
        "Design and implement server-side applications and APIs",
        "Manage database systems and ensure data integrity",
        "Implement security best practices and performance optimization"
      ],
      "product manager": [
        "Define product vision and roadmap based on market research",
        "Collaborate with engineering and design teams",
        "Analyze user feedback and product metrics"
      ],
      default: [
        `Perform core ${titleLower} duties and responsibilities`,
        "Maintain high standards of quality and efficiency",
        "Contribute to team and organizational goals"
      ]
    };

    const titleKey = Object.keys(responsibilities).find(key => titleLower.includes(key));
    const respList = titleKey ? responsibilities[titleKey] : responsibilities.default;
    
    return respList.map((resp, index) => `- ${resp}`).join('\n        ');
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Button
        type="button"
        variant="outline"
        onClick={handleGenerate}
        disabled={isGenerating || !jobTitle.trim()}
        className="w-full sm:w-auto"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Job Description
          </>
        )}
      </Button>
      
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      
      {isGenerating && (
        <p className="text-sm text-muted-foreground">
          Creating a tailored job description based on your inputs...
        </p>
      )}
    </div>
  );
}
