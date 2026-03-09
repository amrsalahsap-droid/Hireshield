import React, { useState } from "react";
import { X, Plus, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Skill {
  id: string;
  name: string;
  experienceLevel: "beginner" | "intermediate" | "advanced" | "expert";
  requirementType: "required" | "optional";
}

interface SkillsTagInputProps {
  skills: Skill[];
  onSkillsChange: (skills: Skill[]) => void;
  className?: string;
}

export function SkillsTagInput({ skills, onSkillsChange, className = "" }: SkillsTagInputProps) {
  const [newSkill, setNewSkill] = useState({
    name: "",
    experienceLevel: "intermediate" as const,
    requirementType: "required" as const
  });
  const [isAdding, setIsAdding] = useState(false);

  const experienceLevels = [
    { value: "beginner", label: "Beginner", color: "bg-blue-100 text-blue-700" },
    { value: "intermediate", label: "Intermediate", color: "bg-green-100 text-green-700" },
    { value: "advanced", label: "Advanced", color: "bg-orange-100 text-orange-700" },
    { value: "expert", label: "Expert", color: "bg-purple-100 text-purple-700" }
  ];

  const requirementTypes = [
    { value: "required", label: "Required", color: "bg-red-100 text-red-700" },
    { value: "optional", label: "Optional", color: "bg-gray-100 text-gray-700" }
  ];

  const getExperienceColor = (level: string): string => {
    const levelConfig = experienceLevels.find(l => l.value === level);
    return levelConfig?.color || "bg-gray-100 text-gray-700";
  };

  const getRequirementColor = (type: string): string => {
    const typeConfig = requirementTypes.find(t => t.value === type);
    return typeConfig?.color || "bg-gray-100 text-gray-700";
  };

  const addSkill = () => {
    if (!newSkill.name.trim()) return;

    const skill: Skill = {
      id: Date.now().toString(),
      name: newSkill.name.trim(),
      experienceLevel: newSkill.experienceLevel,
      requirementType: newSkill.requirementType
    };

    onSkillsChange([...skills, skill]);
    setNewSkill({ name: "", experienceLevel: "intermediate", requirementType: "required" });
    setIsAdding(false);
  };

  const removeSkill = (skillId: string) => {
    onSkillsChange(skills.filter(skill => skill.id !== skillId));
  };

  const cancelAdd = () => {
    setNewSkill({ name: "", experienceLevel: "intermediate", requirementType: "required" });
    setIsAdding(false);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Skills Display */}
      <div className="flex flex-wrap gap-2">
        {skills.length === 0 ? (
          <div className="text-sm text-muted-foreground italic">
            No skills added yet. Click "Add Skill" to get started.
          </div>
        ) : (
          skills.map((skill) => (
            <Badge
              key={skill.id}
              variant="secondary"
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium"
            >
              <Tag className="w-3 h-3" />
              <span className="font-medium">{skill.name}</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getExperienceColor(skill.experienceLevel)}`}>
                {skill.experienceLevel}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getRequirementColor(skill.requirementType)}`}>
                {skill.requirementType}
              </span>
              <button
                onClick={() => removeSkill(skill.id)}
                className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                title="Remove skill"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))
        )}
      </div>

      {/* Add Skill Button/Form */}
      {!isAdding ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsAdding(true)}
          className="w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Skill
        </Button>
      ) : (
        <div className="border border-border rounded-lg p-4 bg-muted/20">
          <div className="space-y-4">
            {/* Skill Name Input */}
            <div>
              <label className="block text-sm font-medium text-foreground font-body mb-2">
                Skill Name
              </label>
              <Input
                type="text"
                value={newSkill.name}
                onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                placeholder="e.g. React, Python, Project Management"
                className="w-full"
                autoFocus
              />
            </div>

            {/* Experience Level and Requirement Type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground font-body mb-2">
                  Experience Level
                </label>
                <select
                  value={newSkill.experienceLevel}
                  onChange={(e) => setNewSkill({ ...newSkill, experienceLevel: e.target.value as any })}
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground font-body"
                >
                  {experienceLevels.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground font-body mb-2">
                  Requirement Type
                </label>
                <select
                  value={newSkill.requirementType}
                  onChange={(e) => setNewSkill({ ...newSkill, requirementType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground font-body"
                >
                  {requirementTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Preview */}
            {newSkill.name.trim() && (
              <div className="border-t border-border pt-3">
                <p className="text-sm text-muted-foreground font-body mb-2">Preview:</p>
                <Badge
                  variant="secondary"
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium"
                >
                  <Tag className="w-3 h-3" />
                  <span className="font-medium">{newSkill.name.trim()}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getExperienceColor(newSkill.experienceLevel)}`}>
                    {newSkill.experienceLevel}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getRequirementColor(newSkill.requirementType)}`}>
                    {newSkill.requirementType}
                  </span>
                </Badge>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                onClick={addSkill}
                disabled={!newSkill.name.trim()}
                className="flex-1"
              >
                Add Skill
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={cancelAdd}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
