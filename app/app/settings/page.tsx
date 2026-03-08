"use client";

import { useState } from "react";

// Simple Button component to avoid import issues
const Button = ({ 
  children, 
  className = "", 
  variant = "default", 
  size = "default",
  onClick,
  ...props 
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "outline" | "destructive";
  size?: "default" | "sm";
  onClick?: () => void;
  [key: string]: any;
}) => {
  const baseClasses = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
  
  const variantClasses = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90"
  };
  
  const sizeClasses = {
    default: "h-10 px-4 py-2",
    sm: "h-9 px-3 text-sm"
  };
  
  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};

// Icon components using simple text/emojis to avoid import issues
const Building2 = () => <span>🏢</span>;
const Users = () => <span>👥</span>;
const Building = () => <span>🏬</span>;
const PuzzlePiece = () => <span>🧩</span>;
const Key = () => <span>🔑</span>;
const Save = () => <span>💾</span>;
const Copy = () => <span>📋</span>;
const Plus = () => <span>➕</span>;
const Trash2 = () => <span>🗑️</span>;
const Eye = () => <span>👁️</span>;
const EyeOff = () => <span>🙈</span>;

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("organization");
  const [showApiKeys, setShowApiKeys] = useState<{ [key: string]: boolean }>({});

  // Sample data - in real app this would come from API
  const [organizationData, setOrganizationData] = useState({
    name: "Acme Corporation",
    domain: "acme.com",
    industry: "Technology",
    size: "50-100",
    timezone: "UTC",
    language: "en"
  });

  const [teamData, setTeamData] = useState([
    {
      id: "1",
      name: "John Doe",
      email: "john@acme.com",
      role: "Admin",
      status: "Active",
      joined: "2024-01-15"
    },
    {
      id: "2", 
      name: "Jane Smith",
      email: "jane@acme.com",
      role: "Recruiter",
      status: "Active",
      joined: "2024-02-20"
    },
    {
      id: "3",
      name: "Mike Johnson",
      email: "mike@acme.com", 
      role: "Viewer",
      status: "Inactive",
      joined: "2024-03-10"
    }
  ]);

  const [departmentsData, setDepartmentsData] = useState([
    {
      id: "1",
      name: "Engineering",
      description: "Software development and technical teams",
      head: "John Doe",
      memberCount: 25,
      budget: "$500,000"
    },
    {
      id: "2",
      name: "Sales",
      description: "Sales and business development teams",
      head: "Jane Smith",
      memberCount: 15,
      budget: "$300,000"
    },
    {
      id: "3",
      name: "Marketing",
      description: "Marketing and communications teams",
      head: "Mike Johnson",
      memberCount: 10,
      budget: "$200,000"
    },
    {
      id: "4",
      name: "Human Resources",
      description: "HR and people operations teams",
      head: "Sarah Wilson",
      memberCount: 8,
      budget: "$150,000"
    }
  ]);

  const [integrations, setIntegrations] = useState([
    {
      id: "1",
      name: "Slack",
      description: "Get notifications in Slack channels",
      connected: true,
      icon: "💬"
    },
    {
      id: "2",
      name: "Google Calendar",
      description: "Sync interviews with Google Calendar",
      connected: false,
      icon: "📅"
    },
    {
      id: "3",
      name: "LinkedIn",
      description: "Post jobs to LinkedIn automatically",
      connected: true,
      icon: "💼"
    }
  ]);

  const [apiKeys, setApiKeys] = useState([
    {
      id: "1",
      name: "Production API Key",
      key: "sk_live_1234567890abcdef",
      permissions: ["read", "write"],
      created: "2024-01-15",
      lastUsed: "2024-03-10"
    },
    {
      id: "2",
      name: "Development API Key", 
      key: "sk_test_0987654321fedcba",
      permissions: ["read"],
      created: "2024-02-20",
      lastUsed: "2024-03-12"
    }
  ]);

  const tabs = [
    { id: "organization", label: "Organization", icon: Building2 },
    { id: "team", label: "Team", icon: Users },
    { id: "departments", label: "Departments", icon: Building },
    { id: "integrations", label: "Integrations", icon: PuzzlePiece },
    { id: "api-keys", label: "API Keys", icon: Key }
  ];

  const toggleApiKeyVisibility = (keyId: string) => {
    setShowApiKeys(prev => ({
      ...prev,
      [keyId]: !prev[keyId]
    }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground font-display mb-2">Settings</h1>
        <p className="text-muted-foreground font-body">
          Manage your organization, team, integrations, and API access.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-border mb-8">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <IconComponent className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-8">
        {/* Organization Tab */}
        {activeTab === "organization" && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-foreground font-display mb-6 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Organization Settings
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-foreground font-body mb-2">
                  Organization Name
                </label>
                <input
                  type="text"
                  value={organizationData.name}
                  onChange={(e) => setOrganizationData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground font-body mb-2">
                  Domain
                </label>
                <input
                  type="text"
                  value={organizationData.domain}
                  onChange={(e) => setOrganizationData(prev => ({ ...prev, domain: e.target.value }))}
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground font-body mb-2">
                  Industry
                </label>
                <select
                  value={organizationData.industry}
                  onChange={(e) => setOrganizationData(prev => ({ ...prev, industry: e.target.value }))}
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
                >
                  <option value="Technology">Technology</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Finance">Finance</option>
                  <option value="Education">Education</option>
                  <option value="Retail">Retail</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground font-body mb-2">
                  Company Size
                </label>
                <select
                  value={organizationData.size}
                  onChange={(e) => setOrganizationData(prev => ({ ...prev, size: e.target.value }))}
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
                >
                  <option value="1-10">1-10</option>
                  <option value="11-50">11-50</option>
                  <option value="50-100">50-100</option>
                  <option value="100-500">100-500</option>
                  <option value="500+">500+</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground font-body mb-2">
                  Timezone
                </label>
                <select
                  value={organizationData.timezone}
                  onChange={(e) => setOrganizationData(prev => ({ ...prev, timezone: e.target.value }))}
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
                >
                  <option value="UTC">UTC</option>
                  <option value="EST">EST</option>
                  <option value="PST">PST</option>
                  <option value="GMT">GMT</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground font-body mb-2">
                  Language
                </label>
                <select
                  value={organizationData.language}
                  onChange={(e) => setOrganizationData(prev => ({ ...prev, language: e.target.value }))}
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
            </div>
          </div>
        )}

        {/* Team Tab */}
        {activeTab === "team" && (
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground font-display flex items-center gap-2">
                <Users className="w-5 h-5" />
                Team Members
              </h2>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Invite Member
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider font-body">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider font-body">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider font-body">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider font-body">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider font-body">
                      Joined
                    </th>
                    <th className="relative px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider font-body">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {teamData.map((member) => (
                    <tr key={member.id} className="hover:bg-muted/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-foreground font-body">{member.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-muted-foreground font-body">{member.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full font-body ${
                          member.role === 'Admin' ? 'bg-purple-100 text-purple-800' :
                          member.role === 'Recruiter' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {member.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full font-body ${
                          member.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {member.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground font-body">
                        {member.joined}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-primary hover:text-primary/90 font-body">
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Departments Tab */}
        {activeTab === "departments" && (
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground font-display flex items-center gap-2">
                <Building className="w-5 h-5" />
                Departments
              </h2>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Department
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {departmentsData.map((department) => (
                <div key={department.id} className="border border-border rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-medium text-foreground font-display mb-2">{department.name}</h3>
                      <p className="text-sm text-muted-foreground font-body mb-4">{department.description}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground font-body">Department Head:</span>
                      <span className="text-sm font-medium text-foreground font-body">{department.head}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground font-body">Team Members:</span>
                      <span className="text-sm font-medium text-foreground font-body">{department.memberCount}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground font-body">Annual Budget:</span>
                      <span className="text-sm font-medium text-foreground font-body">{department.budget}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Integrations Tab */}
        {activeTab === "integrations" && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-foreground font-display mb-6 flex items-center gap-2">
              <PuzzlePiece className="w-5 h-5" />
              Integrations
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {integrations.map((integration) => (
                <div key={integration.id} className="border border-border rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{integration.icon}</span>
                      <div>
                        <h3 className="font-medium text-foreground font-display">{integration.name}</h3>
                        <p className="text-sm text-muted-foreground font-body">{integration.description}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full font-body ${
                      integration.connected 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {integration.connected ? 'Connected' : 'Disconnected'}
                    </span>
                    <Button 
                      variant={integration.connected ? "outline" : "default"}
                      size="sm"
                    >
                      {integration.connected ? 'Disconnect' : 'Connect'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* API Keys Tab */}
        {activeTab === "api-keys" && (
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground font-display flex items-center gap-2">
                <Key className="w-5 h-5" />
                API Keys
              </h2>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Generate API Key
              </Button>
            </div>

            <div className="space-y-4">
              {apiKeys.map((apiKey) => (
                <div key={apiKey.id} className="border border-border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground font-display mb-2">{apiKey.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground font-body mb-3">
                        <span>Created: {apiKey.created}</span>
                        <span>Last used: {apiKey.lastUsed}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-medium text-muted-foreground">Permissions:</span>
                        {apiKey.permissions.map((permission, index) => (
                          <span key={index} className="inline-flex px-2 py-1 text-xs bg-muted rounded">
                            {permission}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-3 py-1 bg-muted rounded text-sm font-mono">
                          {showApiKeys[apiKey.id] ? apiKey.key : '•'.repeat(apiKey.key.length)}
                        </code>
                        <button
                          onClick={() => toggleApiKeyVisibility(apiKey.id)}
                          className="p-1 hover:bg-muted rounded"
                        >
                          {showApiKeys[apiKey.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => copyToClipboard(apiKey.key)}
                          className="p-1 hover:bg-muted rounded"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
